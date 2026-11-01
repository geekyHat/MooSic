export const GUITAR_GRID = [
  { string: 6, midi: 64, label: 'e' },
  { string: 5, midi: 59, label: 'B' },
  { string: 4, midi: 55, label: 'G' },
  { string: 3, midi: 50, label: 'D' },
  { string: 2, midi: 45, label: 'A' },
  { string: 1, midi: 40, label: 'E' },
] as const

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Human name for a MIDI pitch, e.g. 40 → "E2", 65 → "F4". */
export function midiToName(m: number): string {
  const n = NOTE_NAMES[((m % 12) + 12) % 12]
  const oct = Math.floor(m / 12) - 1
  return `${n}${oct}`
}

