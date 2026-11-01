const VOICINGS: Record<string, number[]> = {
  Am: [45, 52, 57, 60, 64], G: [43, 47, 50, 55, 59, 67],
  C: [48, 52, 55, 60, 64], E: [40, 47, 52, 56, 59, 64],
}
const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim: [0, 3, 6], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7],
}

/** Normalize note name to C..B range (handles B#→C, E#→F, etc.) */
function normalizeRoot(letter: string, accidental: string): { letter: string; accidental: string } {
  const combined = letter.toUpperCase() + accidental
  const enharmonic: Record<string, string> = { 'B#': 'C', 'E#': 'F', 'Cb': 'B', 'Fb': 'E' }
  const normalized = enharmonic[combined]
  return normalized ? { letter: normalized, accidental: '' } : { letter, accidental }
}

/** Common chord symbols offered by the editor; every entry must be parseable here. */
export const CHORD_SUGGESTIONS = [
  'C', 'D', 'E', 'F', 'G', 'A', 'B',
  'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
  'C7', 'D7', 'E7', 'F7', 'G7', 'A7',
  'Cmaj7', 'Dmaj7', 'F#m7b5',
] as const

/** Pitches, not a guitar fingering catalogue. Preserve the original four
 * voicings and support all qualities suggested by the chord editor. */
export function chordPitches(symbol: string): number[] | null {
  // Normalize the symbol: remove spaces, standardize naming
  const rawName = symbol.trim().replace(/\s+/g, '').replace(/major/gi, 'maj').replace(/-?min(?:or)?/gi, 'm').replace(/-$/, 'm').replace(/^[a-g]/, letter => letter.toUpperCase())
  // First try direct lookup in VOICINGS (e.g., 'Am', 'C', 'G')
  if (Object.hasOwn(VOICINGS, rawName)) return VOICINGS[rawName]
  // If not found, try with normalized root (e.g., B#m → Cm)
  // For this, we need to extract letter and accidental from rawName
  // Since rawName is already cleaned (e.g., 'Am', 'B#m', 'Aminor'), we can match first chars
  const matchRoot = /^([A-G])([#b]?)/.exec(rawName)
  if (matchRoot) {
    const { letter } = normalizeRoot(matchRoot[1], matchRoot[2])
    const normalizedKey = letter + rawName.slice(matchRoot[0].length)
    if (Object.hasOwn(VOICINGS, normalizedKey)) return VOICINGS[normalizedKey]
  }
  // Now parse the full match for intervals
  const match = /^([A-G])([#b]?)(maj7|m7b5|m7|sus2|sus4|dim|aug|maj|m|7)?(?:\/([A-G])([#b]?))?$/.exec(rawName)
  if (!match) return null
  const { letter, accidental } = normalizeRoot(match[1], match[2])
  const root = (l: string, acc: string) => (ROOTS[l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12
  const base = 48 + root(letter, accidental)
  const quality = match[3] === 'maj' ? '' : match[3] ?? ''
  const pitches = INTERVALS[quality].map(interval => base + interval)
  if (match[4]) {
    const { letter: bLetter, accidental: bAccidental } = normalizeRoot(match[4], match[5])
    pitches.unshift(36 + root(bLetter, bAccidental))
  }
  return pitches
}
