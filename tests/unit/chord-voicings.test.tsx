import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { chordDefinitions, chordFingerings, transposeDefinitions } from '../../src/domain/music/chordDiagrams.ts'
import { parseChordSymbol } from '../../src/domain/music/chordSymbol.ts'
import { guitarChordLibrary, guitarChordVoicings } from '../../src/instruments/guitar/chordLibrary.ts'
import { ChordVoicingSelector } from '../../src/features/practice/components/ChordVoicingSelector.tsx'

const guitar = { library: guitarChordLibrary, voicings: guitarChordVoicings, stringCount: 6, maxFret: 20 }

test('voicings combine source and instrument positions without duplicates or a change to the preferred shape', () => {
  const definitions = chordDefinitions('{define A base-fret 5 frets 1 3 3 2 1 1}')
  const positions = chordFingerings('A', { ...guitar, definitions })
  assert.deepEqual(positions[0], { strings: [5, 7, 7, 6, 5, 5], baseFret: 5 })
  assert.ok(positions.some(shape => JSON.stringify(shape.strings) === JSON.stringify([null, 0, 2, 2, 2, 0])))
  assert.equal(positions.length, 8)
  assert.equal(new Set(positions.map(shape => JSON.stringify(shape.strings))).size, positions.length)
  assert.deepEqual(chordFingerings('A', { ...guitar, definitions, preferLibrary: true })[0].strings, [null, 0, 2, 2, 2, 0])
  assert.ok(chordFingerings('A', { ...guitar, maxFret: 5 }).every(shape => shape.strings.every(fret => fret === null || fret <= 5)))
  assert.equal(chordFingerings('A', { ...guitar, stringCount: 4 }).length, 0)
  for (const name of ['constructor', '__proto__', 'Unknown']) assert.deepEqual(chordFingerings(name, guitar), [])
  const malformed = { A: [{ strings: [0, 2, 2, 2, 0, null], baseFret: 5 }, { strings: [0, -1, 0, 0, 0, 0] }] }
  assert.deepEqual(chordFingerings('A', { stringCount: 6, maxFret: 20, voicings: malformed }), [])
})

test('every alternate guitar position uses chord tones, contains its root and defining tones, and stays within the configured neck', () => {
  const roots: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const intervals: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], maj9: [0, 2, 4, 7, 11], sus4: [0, 5, 7] }
  const tuning = [40, 45, 50, 55, 59, 64]
  for (const name of Object.keys(guitarChordVoicings)) {
    const symbol = parseChordSymbol(name)!
    const root = (roots[symbol.root[0]] + (symbol.root[1] === '#' ? 1 : symbol.root[1] === 'b' ? -1 : 0) + 12) % 12
    const allowed = intervals[symbol.suffix].map(interval => (root + interval) % 12)
    const positions = chordFingerings(name, guitar)
    assert.ok(positions.length > 1, name)
    for (const shape of positions) {
      const played = shape.strings.flatMap((fret, string) => fret === null ? [] : [(tuning[string] + fret) % 12])
      assert.ok(played.includes(root), name + ' root')
      assert.ok(played.every(pitch => allowed.includes(pitch)), name + ' chord tones')
      assert.ok(shape.strings.every(fret => fret === null || fret >= 0 && fret <= 20), name + ' neck bounds')
      if (symbol.suffix === '' || symbol.suffix === 'm') assert.ok(played.includes((root + (symbol.suffix === 'm' ? 3 : 4)) % 12), name + ' third')
      if (symbol.suffix.includes('7') || symbol.suffix === 'maj9') assert.ok(played.includes((root + (symbol.suffix.startsWith('maj') ? 11 : 10)) % 12), name + ' seventh')
      if (symbol.suffix === 'maj9') assert.ok(played.includes((root + 2) % 12), name + ' ninth')
      if (symbol.suffix === 'sus4') assert.ok(played.includes((root + 5) % 12), name + ' fourth')
    }
  }
})

test('position lists support four-string plugins, aliases and transposed custom chord definitions', () => {
  const first = { strings: [2, 1, 0, 0] }, second = { strings: [2, 4, 5, 4] }
  assert.deepEqual(chordFingerings('A', { voicings: { A: [first, second] }, stringCount: 4, maxFret: 12 }), [first, second])
  assert.deepEqual(chordFingerings('Dbm7', guitar).map(shape => shape.strings), chordFingerings('C#m7', guitar).map(shape => shape.strings))
  const definitions = chordDefinitions('{define Bm7b5 frets x 2 3 2 3 x}')
  const shifted = transposeDefinitions(['Bm7b5'], definitions, 1, 20)
  assert.deepEqual(chordFingerings('Cm7b5', { ...guitar, definitions: shifted, preferLibrary: true }).map(shape => shape.strings), [[null, 3, 4, 3, 4, null]])
})

test('the selector reserves its maximum diagram height and omits navigation when only one position exists', () => {
  const positions = [{ strings: [null, 0, 2, 2, 2, 0] }, { strings: [null, 0, 2, 2, 2, 5], baseFret: 1 }]
  const multiple = renderToStaticMarkup(<ChordVoicingSelector name="A" positions={positions}/>)
  assert.match(multiple, /height:111px/)
  assert.match(multiple, /data-voicing-count="2"/)
  assert.match(multiple, /Previous position for A/)
  const single = renderToStaticMarkup(<ChordVoicingSelector name="A" positions={positions.slice(0, 1)}/>)
  assert.ok(!single.includes('<button'))
  assert.ok(!single.includes('tabindex="0"'))
  assert.equal(renderToStaticMarkup(<ChordVoicingSelector name="A" positions={[]}/>), '')
})
