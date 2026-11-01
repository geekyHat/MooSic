import { parseChordSymbol } from './chordSymbol'
import type { ChordFingering } from './chordDiagrams'

const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

/** Always transpose from the original symbol; unknown text is never rewritten. */
export function transposeChord(name: string, semitones: number): string {
  if (!Number.isInteger(semitones) || semitones % 12 === 0) return name
  const chord = parseChordSymbol(name)
  if (!chord) return name
  // Keep flat spelling for flat source chords; downward shifts also favour flats.
  const spellings = chord.root.includes('b') || chord.bass?.includes('b') || semitones < 0 ? FLATS : SHARPS
  const move = (root: string) => {
    const pitch = ROOTS[root[0]] + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0)
    return spellings[((pitch + semitones) % 12 + 12) % 12]
  }
  return move(chord.root) + chord.suffix + (chord.bass ? '/' + move(chord.bass) : '')
}

/** A fallback for custom voicings: move open and fretted strings together. */
export function transposeFingering(shape: ChordFingering, semitones: number, maxFret: number): ChordFingering | undefined {
  if (!Number.isInteger(semitones)) return undefined
  if (semitones % 12 === 0) return shape
  const played = shape.strings.filter((fret): fret is number => fret !== null)
  if (!played.length) return undefined
  let shift = (semitones % 12 + 12) % 12
  // Choose the lowest playable equivalent position rather than negative frets.
  while (Math.min(...played) + shift - 12 >= 0) shift -= 12
  if (Math.max(...played) + shift > maxFret) return undefined
  return { strings: shape.strings.map(fret => fret === null ? null : fret + shift) }
}
