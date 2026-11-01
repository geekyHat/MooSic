import type { NoteEvent,Piece } from './types'

export { validatePiece } from './validation'

/** All notes sounding at piece-time `t` (start <= t < start+duration). */
export function activeNotesAt(p: Piece, t: number): NoteEvent[] {
  const out: NoteEvent[] = []
  for (const n of p.notes) {
    if (n.time <= t && t < n.time + n.duration) out.push(n)
  }
  return out
}

/** Start time (seconds) of a 1-based bar. Assumes constant tempo. */
export function barStart(p: Piece, bar: number): number {
  return Math.max(0, (bar - 1) * p.barLength)
}

/** 1-based bar number for a piece-time. */
export function barOfTime(p: Piece, t: number): number {
  if (t < 0) return 1
  return Math.min(p.bars, Math.floor(t / p.barLength) + 1)
}

/** Index of the first note with start time >= t (for cursor logic). */
export function noteIndexAt(p: Piece, t: number): number {
  let lo = 0
  let hi = p.notes.length - 1
  let ans = p.notes.length
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (p.notes[mid].time >= t) {
      ans = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  return ans
}
