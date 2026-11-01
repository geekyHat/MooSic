import type { ChordFingering } from '@/domain/music/chordDiagrams'
import { guitarFingerings } from './fingerings'

/** Movable E/A shapes, ordered high E to low E like the existing open shapes. */
const templates: Record<string, { root: number; frets: (number | null)[] }[]> = {
  '': [{ root: 4, frets: [0, 0, 1, 2, 2, 0] }, { root: 9, frets: [0, 2, 2, 2, 0, null] }],
  m: [{ root: 4, frets: [0, 0, 0, 2, 2, 0] }, { root: 9, frets: [0, 1, 2, 2, 0, null] }],
  '7': [{ root: 4, frets: [0, 0, 1, 0, 2, 0] }, { root: 9, frets: [0, 2, 0, 2, 0, null] }],
  m7: [{ root: 4, frets: [0, 0, 0, 0, 2, 0] }, { root: 9, frets: [0, 1, 0, 2, 0, null] }],
  maj7: [{ root: 4, frets: [0, 0, 1, 1, 2, 0] }, { root: 9, frets: [0, 2, 1, 2, 0, null] }],
  maj9: [{ root: 9, frets: [0, 0, 1, 2, 0, null] }],
  sus4: [{ root: 4, frets: [0, 0, 2, 2, 2, 0] }, { root: 9, frets: [0, 3, 2, 2, 0, null] }],
}
const notes: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const additionalShapes: Record<string, { root: number; frets: (number | null)[] }[]> = {
  '': [
    { root: 0, frets: [0, 1, 0, 2, 3, null] },
    { root: 2, frets: [2, 3, 2, 0, null, null] },
    { root: 7, frets: [3, 0, 0, 0, 2, 3] },
  ],
  maj9: [{ root: 4, frets: [2, 0, 1, 1, 2, 0] }],
}

function buildCatalogues() {
  const library: Record<string, ChordFingering> = {}
  const voicings: Record<string, ChordFingering[]> = {}
  for (const [letter, pitch] of Object.entries(notes)) {
    for (const [accidental, offset] of [['', 0], ['#', 1], ['b', -1]] as const) {
      for (const [suffix, shapes] of Object.entries(templates)) {
        const candidates = shapes.map(shape => {
          const shift = (pitch + offset - shape.root + 12) % 12
          return shape.frets.map(fret => fret === null ? null : fret + shift)
        })
        candidates.sort((a, b) => Math.max(...a.map(fret => fret ?? 0)) - Math.max(...b.map(fret => fret ?? 0)))
        library[letter + accidental + suffix] = { strings: candidates[0].slice().reverse() }
        const positions: ChordFingering[] = []
        for (const shape of [...shapes, ...(additionalShapes[suffix] ?? [])]) {
          const first = (pitch + offset - shape.root + 12) % 12
          // The same movable shape can occur again one octave higher on the neck.
          for (let shift = first; shift <= 24; shift += 12) {
            const strings = shape.frets.map(fret => fret === null ? null : fret + shift).reverse()
            if (strings.every(fret => fret === null || fret <= 24)) positions.push({ strings })
          }
        }
        positions.sort((a, b) => Math.max(...a.strings.map(fret => fret ?? 0)) - Math.max(...b.strings.map(fret => fret ?? 0)))
        voicings[letter + accidental + suffix] = positions
      }
    }
  }
  // Preserve preferred open voicings already used by existing songs.
  for (const [name, frets] of Object.entries(guitarFingerings)) library[name] = { strings: frets.slice().reverse().map(fret => fret === 'x' ? null : fret) }
  return { library, voicings }
}

const catalogues = buildCatalogues()
export const guitarChordLibrary = catalogues.library
export const guitarChordVoicings = catalogues.voicings
