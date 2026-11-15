import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AutomaticStringTracker, centsBetween, closestGuitarString, createPitchDetector, GUITAR_STRINGS, PitchSmoother, tuningDirection } from '../../src/domain/music/tuner.ts'
import { formatLocation, parseLocation } from '../../src/domain/navigation/location.ts'

function tone(frequency: number, rate: number, harmonics = false, size = 4096) {
  return Float32Array.from({ length: size }, (_, i) => {
    const phase = 2 * Math.PI * frequency * i / rate + .37
    return harmonics ? (.25 * Math.sin(phase) + .4 * Math.sin(2 * phase) + .12 * Math.sin(3 * phase)) * Math.exp(-i / (rate * .3)) : .3 * Math.sin(phase)
  })
}
test('guitar detector resolves every string, detuning and strong overtones at common microphone sample rates', () => {
  for (const rate of [44100, 48000, 96000]) {
    const detect = createPitchDetector(rate)
    for (const string of GUITAR_STRINGS) for (const cents of [-38, 0, 32]) for (const harmonics of [false, true]) {
      const frequency = string.frequency * 2 ** (cents / 1200)
      const detected = detect(tone(frequency, rate, harmonics)).frequency
      assert.ok(detected, `${string.note}${string.octave} at ${rate}`)
      assert.ok(Math.abs(centsBetween(detected, frequency)) < 2, `Expected ${frequency}, detected ${detected}`)
      assert.equal(closestGuitarString(detected).number, string.number)
    }
  }
})
test('silence, DC offset, very quiet notes and deterministic broadband noise do not become notes', () => {
  const detect = createPitchDetector(48000)
  assert.equal(detect(new Float32Array(4096)).frequency, null)
  assert.equal(detect(new Float32Array(4096).fill(.2)).frequency, null)
  assert.equal(detect(tone(110, 48000).map(value => value * .001)).frequency, null)
  let seed = 123456
  const noise = Float32Array.from({ length: 4096 }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - .5) * .5 })
  assert.equal(detect(noise).frequency, null)
  assert.equal(detect(new Float32Array(20)).frequency, null)
})
test('quiet unprocessed phone input is recognized without treating quiet broadband noise as a string', () => {
  for (const rate of [44100, 48000, 96000]) {
    const size = 2 ** Math.ceil(Math.log2(rate * .085)), detect = createPitchDetector(rate, size)
    for (const string of GUITAR_STRINGS) {
      const input = tone(string.frequency, rate, true, size).map(value => value * .003)
      const result = detect(input)
      assert.ok(result.level < .004 && result.level > .0005)
      assert.ok(result.frequency && Math.abs(centsBetween(result.frequency, string.frequency)) < 3)
    }
    let seed = 123456
    const noise = Float32Array.from({ length: size }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - .5) * .006 })
    assert.equal(detect(noise).frequency, null)
  }
})
test('pitch feedback has correct direction and distinguishes the two E strings', () => {
  assert.equal(tuningDirection(centsBetween(108, 110)), 'low')
  assert.equal(tuningDirection(centsBetween(112, 110)), 'high')
  for (const cents of [-5, 0, 5]) assert.equal(tuningDirection(cents), 'tuned')
  assert.equal(closestGuitarString(82.4).number, 6)
  assert.equal(closestGuitarString(329.6).number, 1)
  assert.equal(tuningDirection(centsBetween(110, GUITAR_STRINGS[0].frequency)), 'high')
})
test('stabilization rejects attacks, follows another string, and clears stale notes', () => {
  const smoother = new PitchSmoother()
  assert.equal(smoother.update(110, 0), null)
  assert.equal(smoother.update(110.1, 70), null)
  assert.ok(Math.abs(smoother.update(109.9, 140)! - 110) < .01)
  assert.ok(Math.abs(smoother.update(null, 300)! - 110) < .01)
  assert.equal(smoother.update(null, 600), null)
  assert.equal(smoother.update(330, 670), null)
  assert.equal(smoother.update(330, 740), null)
  assert.ok(Math.abs(smoother.update(330, 810)! - 330) < .01)
  // A single octave/attack glitch must hold the reading, never blank it.
  assert.ok(Math.abs(smoother.update(82, 880)! - 330) < .01)
  assert.ok(Math.abs(smoother.update(330, 950)! - 330) < .01)
})

const detuned = (hz: number, cents: number) => hz * 2 ** (cents / 1200)
test('the detector covers heavily detuned strings and high harmonics with sample-rate-sized windows', () => {
  for (const rate of [44100, 48000, 96000]) {
    const size = 2 ** Math.ceil(Math.log2(rate * .085)), detect = createPitchDetector(rate, size)
    for (const frequency of [52, 60, 70, 440, 660, 880]) {
      const result = detect(tone(frequency, rate, true, size))
      assert.ok(result.frequency, `${frequency} Hz at ${rate}`)
      assert.ok(Math.abs(centsBetween(result.frequency, frequency)) < 3)
    }
  }
})
test('damped guitar-like tones stay accurate with overtones, noise and DC offset', () => {
  const rate = 48000, detect = createPitchDetector(rate)
  let seed = 73
  for (const string of GUITAR_STRINGS) for (const offset of [-180, 0, 180]) {
    const frequency = detuned(string.frequency, offset)
    const input = tone(frequency, rate, true).map(value => {
      seed = (1664525 * seed + 1013904223) >>> 0
      return value * .15 + .08 + (seed / 2 ** 32 - .5) * .004
    })
    const result = detect(input).frequency
    assert.ok(result && Math.abs(centsBetween(result, frequency)) < 3, `${string.note}${string.octave}, ${offset} cents: ${result}`)
  }
})
test('jitter and isolated octave errors cannot throw the needle to another string', () => {
  const smoother = new PitchSmoother(), strings = new AutomaticStringTracker()
  for (let frame = 0; frame < 6; frame++) smoother.update(110, frame * 70)
  const readings: number[] = []
  for (let frame = 6; frame < 66; frame++) {
    const raw = frame % 13 === 0 ? 220 : detuned(110, frame % 2 ? 18 : -18)
    const result = smoother.update(raw, frame * 70)
    assert.notEqual(result, null)
    readings.push(centsBetween(result!, 110))
    assert.equal(strings.update(result)?.number, 5)
  }
  const largestStep = Math.max(...readings.slice(1).map((value, index) => Math.abs(value - readings[index])))
  assert.ok(largestStep < 9, `needle moved ${largestStep} cents in one frame`)
  assert.ok(readings.every(value => Math.abs(value) <= 18))
})
test('slow peg movements remain continuous and catch up without re-acquiring the note', () => {
  const smoother = new PitchSmoother()
  for (let frame = 0; frame < 6; frame++) smoother.update(detuned(110, -180), frame * 70)
  let previous = -180, last = 0
  for (let frame = 0; frame <= 72; frame++) {
    const result = smoother.update(detuned(110, -180 + frame * 5), (frame + 6) * 70)
    assert.notEqual(result, null)
    last = centsBetween(result!, 110)
    assert.ok(last >= previous - .01 && last - previous < 8)
    previous = last
  }
  for (let frame = 79; frame < 90; frame++) last = centsBetween(smoother.update(detuned(110, 180), frame * 70)!, 110)
  assert.ok(Math.abs(last - 180) < 2)
})
test('real string changes are accepted after confirmation; invalid input cannot keep stale readings alive', () => {
  const smoother = new PitchSmoother()
  for (const time of [0, 70, 140]) smoother.update(110, time)
  assert.ok(Math.abs(smoother.update(146.83, 210)! - 110) < .01)
  assert.ok(Math.abs(smoother.update(146.83, 280)! - 110) < .01)
  assert.ok(Math.abs(smoother.update(146.83, 350)! - 146.83) < .01)
  for (const time of [420, 490, 560, 630, 700, 770]) smoother.update(time % 140 ? 440 : 660, time)
  assert.equal(smoother.update(Number.NaN, 840), null)
})
test('automatic string choice has hysteresis near boundaries and resets after silence', () => {
  const tracker = new AutomaticStringTracker(), g = GUITAR_STRINGS[3], b = GUITAR_STRINGS[4]
  assert.equal(tracker.update(g.frequency)?.number, 3)
  for (const offset of [190, 205, 195, 220, 199, 225]) assert.equal(tracker.update(detuned(g.frequency, offset))?.number, 3)
  assert.equal(tracker.update(b.frequency)?.number, 2)
  for (const offset of [190, 210, 180, 195]) assert.equal(tracker.update(detuned(g.frequency, offset))?.number, 2)
  assert.equal(tracker.update(null), null)
  assert.equal(tracker.update(g.frequency)?.number, 3)
})
test('green tolerance is usable without flickering at its boundary', () => {
  assert.equal(tuningDirection(9), 'tuned')
  assert.equal(tuningDirection(12, 'tuned'), 'tuned')
  assert.equal(tuningDirection(-12, 'tuned'), 'tuned')
  assert.equal(tuningDirection(15, 'tuned'), 'high')
  assert.equal(tuningDirection(12, 'high'), 'high')
  assert.equal(tuningDirection(9, 'high'), 'tuned')
  assert.equal(tuningDirection(-15, 'tuned'), 'low')
})
test('tuner has a direct, reloadable hash route', () => {
  const location = parseLocation('#/tuner')
  assert.equal(location.view, 'tuner')
  assert.equal(formatLocation(location), '#/tuner')
})
