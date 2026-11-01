import type { ParseError,Parser,ParserPlugin } from '@/core/plugin/types'
import type { ChordEvent,LyricLine,NoteEvent,Piece } from '@/core/score-model/types'
import manifest from './plugin.json'

/**
 * ABC parser (manual §6.2).
 *
 * Strategy: `abcjs.parseOnly()` — pure parse, no DOM, works in Node and
 * browser. We walk the parsed voices (lines → staff → voice 0) and convert
 * to the Score Model.
 *
 * Pitches: abcjs gives a *diatonic index* (C4 = 0, one step per letter).
 * MIDI = 60 + scaleOffset(letter) + octaves*12 + accidental, where the
 * accidental comes from the note itself (^/_/=) or, failing that, from the
 * key signature (K: field, read from the parsed staff.key).
 *
 * Units: parsed `duration` is in *notation units* (whole note = 1).
 * Seconds = units * 240 / qpm.
 *
 * Limitation (documented): tempo is taken from the first Q: field and held
 * constant for the whole piece (mid-piece tempo changes are Phase 2).
 */

// ---------- ABC header helpers ----------

function field(text: string, tag: string): string | undefined {
  const re = new RegExp(`(?:^|\\n)\\s*${tag}:([^\\n]*)`)
  const m = text.match(re)
  return m ? m[1].trim() : undefined
}

function parseTempoQpm(text: string): number {
  const m = text.match(/(?:^|\n)\s*Q:\s*([^\n]*)/)
  if (!m) return 100
  const q = m[1].trim()
  const full = q.match(/^([0-9]+)\/([0-9]+)\s*=\s*([0-9]+(?:\.[0-9]+)?)/)
  if (full) {
    // Convert the metronome note value to quarter notes/minute.
    // Q:1/8=160 → 80 qpm; Q:3/8=60 → 90 qpm.
    const beatsPerMinute = Number(full[3]) * (4 * Number(full[1]) / Number(full[2]))
    return beatsPerMinute
  }
  const plain = q.match(/^([0-9]+(?:\.[0-9]+)?)$/)
  if (plain) return Number(plain[1])
  return 100
}

function parseTimeSignature(text: string): { numerator: number; denominator: number } {
  const m = text.match(/(?:^|\n)\s*M:\s*([^\n]*)/)
  if (m) {
    const raw = m[1].trim()
    const parts = raw.split(/[\/ ]+/).map(Number)
    if (parts.length >= 2 && parts[0] > 0 && parts[1] > 0) {
      return { numerator: parts[0], denominator: parts[1] }
    }
    if (raw === 'C') return { numerator: 4, denominator: 4 }
    if (raw === 'C/' || raw === 'C|') return { numerator: 2, denominator: 2 }
  }
  return { numerator: 4, denominator: 4 }
}

// ---------- Pitch conversion ----------

// Semitones of C D E F G A B above C.
const BASE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

/** Diatonic index (C4 = 0, one per letter step) → MIDI of the natural note. */
function diatonicToMidi(d: number): number {
  const mod = ((d % 7) + 7) % 7
  return 60 + BASE_SEMITONES[mod] + Math.floor(d / 7) * 12
}

const ACC_OFFSET: Record<string, number> = {
  sharp: 1,
  dblsharp: 2,
  flat: -1,
  dblflat: -2,
  natural: 0,
  quartersharp: 0.25,
  quarterflat: -0.25,
}

// ---------- Parsed structure (the parts we use) ----------

interface ParsedPitch {
  pitch: number
  name: string
  accidental?: string
}
interface ParsedElement {
  el_type?: string
  type?: string
  duration?: number
  pitches?: ParsedPitch[]
  rest?: { type?: string }
  /** Inline chord symbols (e.g. "Am" before a note in the music line). */
  chord?: { name: string; position?: string; rel_position?: number }[]
  /** Lyrics (w: field): one syllable entry per pitch of the note. */
  lyric?: { syllable: string; divider: string }[]
}
interface ParsedKey {
  accidentals?: { acc: string; note: string }[]
}
interface ParsedStaff {
  key?: ParsedKey
  voices?: ParsedElement[][]
}
interface ParsedLine {
  staff?: ParsedStaff[]
}
interface ParsedTune {
  lines?: ParsedLine[]
}

function isBarline(el: ParsedElement): boolean {
  if (el.el_type === 'bar') return true
  const t = el.type ?? ''
  return t.startsWith('bar') || t.startsWith('repeat')
}

function makeParseError(message: string, text: string): ParseError {
  const err = new Error(message) as ParseError
  err.line = 0
  const m = message.match(/\((\d+)\)/)
  if (m) err.line = Number(m[1])
  void text
  return err
}

const parser: Parser = {
  id: 'abc',
  formats: ['abc'],
  detect(content: string): boolean {
    return /(?:^|\n)\s*K:/.test(content) && /(?:^|\n)\s*L:/.test(content)
  },
  async parse(content: string): Promise<Piece> {
    let parsed: unknown
    try {
      const {default:tunebook}=await import('abcjs/src/api/abc_tunebook.js')
      parsed = tunebook.parseOnly(content)
    } catch (e) {
      throw makeParseError(`ABC parse failed: ${String(e)}`, content)
    }
    const tune = (Array.isArray(parsed) ? parsed[0] : parsed) as ParsedTune
    if (!tune?.lines || tune.lines.length === 0) {
      throw makeParseError('ABC: no music parsed', content)
    }

    // Key signature (first staff that carries one).
    const keySig: Record<string, number> = {}
    outer: for (const line of tune.lines) {
      for (const staff of line.staff ?? []) {
        const accs = staff.key?.accidentals
        if (accs) {
          for (const a of accs) {
            keySig[a.note[0].toUpperCase()] = a.acc === 'sharp' ? 1 : -1
          }
          break outer
        }
      }
    }

    const meter = parseTimeSignature(content)
    const qpm = parseTempoQpm(content)
    const wholeNoteSeconds = 240 / qpm // notation units (whole = 1) → seconds
    const barLengthUnits = meter.numerator / meter.denominator
    const barLength = barLengthUnits * wholeNoteSeconds
    const secondsPerBeat = wholeNoteSeconds / meter.denominator

    const notes: NoteEvent[] = []
    const chords: ChordEvent[] = []
    const barLyrics = new Map<number, { text: string; endDivider: string; tokens:NonNullable<LyricLine['tokens']> }>()
    let lastChord: string | null = null
    const barWarnings: string[] = []
    let seq = 0
    let time = 0
    let bar = 1
    let barStart = 0
    let sawAnyElement = false
    const barAccidentals = new Map<number, number>()

    for (const line of tune.lines) {
      for (const staff of line.staff ?? []) {
        const voice = (staff.voices ?? [])[0]
        if (!voice) continue
        for (const el of voice) {
          if (isBarline(el)) {
            // Validate previous bar filled its length (pickup bars warn only).
            const got = (time - barStart) / wholeNoteSeconds
            if (sawAnyElement && Math.abs(got - barLengthUnits) > 0.01 && got > 0.001) {
              barWarnings.push(
                `bar ${bar}: ${got.toFixed(3)} of ${barLengthUnits.toFixed(3)} beat-units`,
              )
            }
            barStart = time
            barAccidentals.clear()
            if (sawAnyElement) bar++
            sawAnyElement = true
            continue
          }
          sawAnyElement = true
          const dur = typeof el.duration === 'number' ? el.duration : 0
          if (el.pitches && el.pitches.length > 0) {
            // Inline chord symbol — emit only when the name changes.
            const chordNames = (el.chord ?? [])
              .map((c) => c.name ?? '')
              .filter((n) => n.trim() !== '')
            if (chordNames.length > 0) {
              const name = chordNames.join(' / ')
              if (name !== lastChord) {
                chords.push({ time, name })
                lastChord = name
              }
            }
            // Lyrics — accumulate per bar; a hyphen divider joins a syllable
            // to the next one without a space (cia- o → ciao).
            const lyricEntries = (el.lyric ?? [])
              .map((l) => ({
                syllable: (l.syllable ?? '').replace(/\xA0/g, ' ').trim(),
                divider: l.divider ?? ' ',
              }))
              .filter((l) => l.syllable !== '')
            if (lyricEntries.length > 0) {
              let text = ''
              for (let i = 0; i < lyricEntries.length; i++) {
                const e = lyricEntries[i]
                text =
                  i === 0
                    ? e.syllable
                    : text +
                      (lyricEntries[i - 1].divider === '-' ? '' : ' ') +
                      e.syllable
              }
              const tokens=lyricEntries.map(entry=>({text:entry.syllable,startBeat:time/secondsPerBeat,endBeat:(time+dur*wholeNoteSeconds)/secondsPerBeat,joinNext:entry.divider==='-'}))
              const endDivider = lyricEntries[lyricEntries.length - 1].divider
              const prev = barLyrics.get(bar)
              if (prev) {
                barLyrics.set(bar, {
                  text: prev.text + (prev.endDivider === '-' ? '' : ' ') + text,
                  endDivider,
                  tokens:[...prev.tokens,...tokens],
                })
              } else {
                barLyrics.set(bar, { text, endDivider, tokens })
              }
            }
            for (const p of el.pitches) {
              const letter = (p.name || 'C')[0].toUpperCase()
              const offset = p.accidental !== undefined
                ? (ACC_OFFSET[p.accidental] ?? 0)
                : (barAccidentals.get(p.pitch) ?? keySig[letter] ?? 0)
              if (p.accidental !== undefined) barAccidentals.set(p.pitch, offset)
              notes.push({
                id: `${seq++}`,
                time,
                duration: dur * wholeNoteSeconds,
                pitchMidi: Math.round(diatonicToMidi(p.pitch) + offset),
                isChord: el.pitches.length > 1 || undefined,
                bar,
              })
            }
            time += dur * wholeNoteSeconds
          } else if (el.rest) {
            time += dur * wholeNoteSeconds
          }
        }
      }
    }

    if (notes.length === 0) throw makeParseError('ABC: no usable notes', content)
    if (barWarnings.length > 0) {
      console.warn('[abc] bar length warnings:', barWarnings.join('; '))
    }

    // Lyrics: group consecutive bars into *phrase* lines (~8-10 words each,
    // up to 4 bars) so lines read like full phrases, not bar fragments.
    const barEntries = [...barLyrics.entries()].sort((a, b) => a[0] - b[0])
    const lyrics: LyricLine[] = []
    const MAX_BARS_PER_LINE = 4
    const MAX_WORDS_PER_LINE = 20
    let phrase: { firstBar: number; lastBar: number; text: string; words: number; count: number; tokens:NonNullable<LyricLine['tokens']> } | null = null
    const flushPhrase = () => {
      if (!phrase) return
      const start = (phrase.firstBar - 1) * barLength
      const end = phrase.lastBar * barLength
      lyrics.push({ time: start, endTime: end, text: phrase.text, bar: phrase.firstBar, tokens:phrase.tokens })
      phrase = null
    }
    for (const [b, v] of barEntries) {
      const words = v.text.trim().split(/\s+/).length
      if (phrase && (phrase.words + words > MAX_WORDS_PER_LINE || phrase.count >= MAX_BARS_PER_LINE)) {
        flushPhrase()
      }
      if (phrase) {
        phrase.tokens.push(...v.tokens)
        phrase.text = phrase.text + ' ' + v.text
        phrase.words += words
        phrase.count++
        phrase.lastBar = b
      } else {
        phrase = { firstBar: b, lastBar: b, text: v.text, words, count: 1, tokens:[...v.tokens] }
      }
    }
    flushPhrase()

    const last = notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
    const x = field(content, 'X')
    const title = field(content, 'T') ?? 'Untitled'

    return {
      id: (x && `abc-${x}`) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      composer: field(content, 'C'),
      instrumentId: 'guitar',
      tempo: Math.round(qpm),
      timeSignature: meter,
      secondsPerBeat,
      barLength,
      bars: Math.max(1, bar - 1, Math.ceil(Math.max(last,time)/barLength)),
      duration: Math.max(last,time),
      notes,
      chords: chords.length > 0 ? chords : undefined,
      lyrics: lyrics.length > 0 ? lyrics : undefined,
      source: { format: 'abc', text: content },
    }
  },
}

const plugin: ParserPlugin = {
  manifest: manifest as ParserPlugin['manifest'],
  parser,
}

export default plugin
