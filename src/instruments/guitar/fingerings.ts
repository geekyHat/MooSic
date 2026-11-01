type Fret = number | 'x'

/**
 * Common guitar chord fingerings.
 * Order: [grid row 0 (high E) … row 5 (low E)]
 * 0 = open, 'x' = muted, 1+ = fret number.
 */
export const guitarFingerings: Record<string, Fret[]> = {
  Am: [0, 1, 2, 2, 0, 'x'],
  G: [3, 0, 0, 0, 2, 3],
  C: [0, 1, 0, 2, 3, 'x'],
  E: [0, 0, 1, 2, 2, 0],
  Em: [0, 0, 0, 2, 2, 0],
  D: [2, 3, 2, 0, 'x', 'x'],
  Dm: [1, 3, 2, 0, 'x', 'x'],
  F: [1, 1, 2, 3, 3, 1],
  Bm: [2, 3, 4, 4, 2, 'x'],
  A: [0, 2, 2, 2, 0, 'x'],
  A7: [0, 2, 0, 2, 0, 'x'],
  E7: [0, 0, 1, 0, 2, 0],
}

