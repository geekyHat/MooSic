import type { Transport,TransportPlugin } from '@/core/plugin/types'
import { chordPitches,nearestSample } from './pitches'
import manifest from './plugin.json'

/**
 * Guitar transport (real note playback).
 *
 * Replaces the metronome beep: it plays real recorded guitar samples.
 *  - "Tabs" pieces (melody, no chords): one note at a time, pitch from
 *    `NoteEvent.pitchMidi` (string + fret resolved by the instrument), so the
 *    sound always matches the position shown on the tab.
 *  - Chord-bearing scores can strum each chord when the controller requests
 *    audio. Lyrics arrangements and the chords display use clock-only playback;
 *    the controller never starts this transport in that mode.
 *
 * Robustness (the three reported playback bugs):
 *  - Every started BufferSource is tracked in a Set. `stop()` and every
 *    resync (play / seek / live tempo change) call `stopAll()`, so restart
 *    and pause actually silence ringing notes instead of letting them decay
 *    for up to 3s.
 *  - A live tempo change is detected *inside* the schedule window: the
 *    scheduler does not emit any event from `setTempoFactor()`, so already
 *    scheduled notes would otherwise keep the old timing (notes stop or
 *    crash). On a detected change we stopAll() + clear the scheduled set so
 *    the next window re-schedules from the current position at the new tempo.
 *
 * Samples: public-domain single-note guitar recordings (cluesurf/wavebase),
 * one 16-bit mono 44.1kHz WAV per MIDI note under /sounds/guitar/. Loaded on
 * demand, decoded once, cached in memory.
 */

const SOUND_BASE = `${import.meta.env?.BASE_URL??'/'}sounds/guitar`
const NOTE_GAIN = 1.0
const MASTER_GAIN = 0.9
/** Normalized target peak per sample (consistent loudness across notes). */
const TARGET_PEAK = 0.5
/** How long a single melody note rings (seconds). */
const NOTE_RING = 2.8
/** How long a strummed chord note rings (seconds). */
const CHORD_RING = 2.0
/** Per-string delay in a strum cascade (seconds). */
const STRUM_CASCADE = 0.008


let unsubWindow: (() => void) | null = null
let unsubSync: (() => void) | null = null
/** Keys already scheduled this play session ("pieceId:noteId" / "pieceId:c<i>"). */
let scheduled = new Set<string>()
/** Decoded buffers, per MIDI note. Survives across play sessions. */
let buffers = new Map<number, AudioBuffer>()
/** In-flight loads, per MIDI note (dedupe). */
let pending = new Map<number, Promise<AudioBuffer>>()
/** Shared master gain for all notes (avoids clipping on chords). */
let master: GainNode | null = null
/** Every live BufferSource, so we can silence them on stop / resync. */
let sources = new Set<AudioBufferSourceNode>()
/** Bumped on every stopAll() to cancel in-flight scheduleNote() awaits. */
let gen = 0
/** Last tempo factor seen by the window handler (live-tempo-change detection). */
let lastRate = 1

function ensureMaster(actx: AudioContext): GainNode {
  if (!master || master.context !== actx) {
    master = actx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(actx.destination)
  }
  return master
}

/** Scale a decoded buffer in place to a target peak (consistent loudness). */
function normalizeBuffer(buf: AudioBuffer, target: number): AudioBuffer {
  let peak = 0
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i])
      if (v > peak) peak = v
    }
  }
  if (peak < 1e-6) return buf
  const scale = target / peak
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < data.length; i++) data[i] *= scale
  }
  return buf
}

/** Fetch + decode (once) the sample for a MIDI note. */
function ensureBuffer(actx: AudioContext, midi: number): Promise<AudioBuffer> {
  midi = nearestSample(midi)
  const cached = buffers.get(midi)
  if (cached) return Promise.resolve(cached)
  const inFlight = pending.get(midi)
  if (inFlight) return inFlight
  const p = (async () => {
    const res = await fetch(`${SOUND_BASE}/midi-${midi}.wav`)
    if (!res.ok) throw new Error(`guitar sample midi-${midi}: HTTP ${res.status}`)
    const arr = await res.arrayBuffer()
    const buf = await actx.decodeAudioData(arr)
    normalizeBuffer(buf, TARGET_PEAK)
    buffers.set(midi, buf)
    return buf
  })()
  pending.set(midi, p)
  void p.catch(() => pending.delete(midi))
  return p
}

/**
 * Schedule one sample at an absolute AudioContext time with a soft release.
 * The buffer is fetched/decoded asynchronously; the `gen` guard discards the
 * start if a stopAll() happened while the load was in flight.
 */
function scheduleNote(
  actx: AudioContext,
  midi: number,
  at: number,
  ring: number,
  onSampleError: (midi: number) => void,
): void {
  const g0 = gen
  ensureBuffer(actx, midi).then(
    (buf) => {
      if (g0 !== gen) return // a stopAll() happened while the load was in flight
      const now=actx.currentTime
      if (at < now - 0.03) return // never play a stale note far behind the playhead
      const scheduledAt=Math.max(at,now+0.005)
      const src = actx.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = 2 ** ((midi - nearestSample(midi)) / 12)
      const g = actx.createGain()
      g.gain.setValueAtTime(NOTE_GAIN, scheduledAt)
      g.gain.setValueAtTime(NOTE_GAIN, Math.max(scheduledAt, scheduledAt + ring - 0.25))
      g.gain.linearRampToValueAtTime(0.0001, scheduledAt + ring)
      src.connect(g)
      g.connect(ensureMaster(actx))
      sources.add(src)
      src.onended = () => {
        sources.delete(src)
      }
      src.start(scheduledAt)
    },
    () => {
      // A stop/restart invalidates pending loads; stale failures must not alert.
      if (g0 === gen) onSampleError(midi)
    },
  )
}

/** Stop every live source and drop the set (silences ringing notes). */
function stopAll(): void {
  gen++
  for (const s of sources) {
    try {
      s.stop()
    } catch {
      /* already stopped */
    }
  }
  sources.clear()
}

const guitar: Transport = {
  id: 'guitar',
  label: { en: 'Guitar (real notes)', it: 'Chitarra (note reali)' },
  async start(ctx) {
    if (unsubWindow) return
    let sampleErrorReported = false
    const reportSampleError = (midi: number) => {
      if (sampleErrorReported) return
      sampleErrorReported = true
      ctx.ui.notify('error', ctx.i18n.t('audio.sampleMissing', { midi }))
    }
    lastRate = ctx.scheduler.tempoFactor
    // Subscribe before warming, but do not start the scheduler until the first
    // lookahead window's samples have decoded.
    const piece = ctx.score.get()
    const actx = ctx.scheduler.audioContext
    // Play / seek resync: silence anything ringing, allow re-scheduling from
    // the new position.
    unsubSync = ctx.scheduler.on('sync', () => {
      stopAll()
      scheduled = new Set()
      lastRate = ctx.scheduler.tempoFactor
    })
    unsubWindow = ctx.scheduler.on('schedule-window', (w) => {
      const p = ctx.score.get()
      const a = ctx.scheduler.audioContext
      if (!p || !a) return
      // Live tempo change (no scheduler event): silence + reschedule from here.
      const rate = ctx.scheduler.tempoFactor
      if (rate !== lastRate) {
        lastRate = rate
        stopAll()
        scheduled = new Set()
      }
      const now = a.currentTime
      if (p.chords && p.chords.length > 0) {
        // Chords + lyrics: strum each chord change.
        p.chords.forEach((c, i) => {
          if (c.time < w.from - 1e-6 || c.time > w.to + 1e-6) return
          const key = `${p.id}:c${i}`
          if (scheduled.has(key)) return
          scheduled.add(key)
          const pitches = chordPitches(c.name)
          if (!pitches) return
          const at = Math.max(w.toAudioTime(c.time), now + 0.02)
          pitches.forEach((m, k) =>
            scheduleNote(a, m, at + k * STRUM_CASCADE, CHORD_RING, reportSampleError),
          )
        })
      } else {
        // Tabs / melody: one note at a time.
        for (const n of p.notes) {
          if (n.time < w.from - 1e-6 || n.time > w.to + 1e-6) continue
          const key = `${p.id}:${n.id}`
          if (scheduled.has(key)) continue
          scheduled.add(key)
          const at = Math.max(w.toAudioTime(n.time), now + 0.02)
          scheduleNote(a, n.pitchMidi, at, NOTE_RING, reportSampleError)
        }
      }
    })
    if(piece&&actx){
      const from=ctx.scheduler.currentTime,to=from+0.15*ctx.scheduler.tempoFactor
      const midis=new Set<number>(piece.notes.filter(n=>n.time>=from-1e-6&&n.time<=to).map(n=>n.pitchMidi))
      for(const chord of piece.chords??[])if(chord.time>=from-1e-6&&chord.time<=to){const pitches=chordPitches(chord.name);if(pitches)for(const midi of pitches)midis.add(midi)}
      await Promise.all([...midis].map(midi=>ensureBuffer(actx,midi)))
    }
  },
  stop() {
    unsubSync?.()
    unsubSync = null
    unsubWindow?.()
    unsubWindow = null
    stopAll()
    scheduled = new Set()
  },
}

const plugin: TransportPlugin = {
  manifest: manifest as TransportPlugin['manifest'],
  transport: guitar,
}

export default plugin
