import { transposeChord } from '../music/transpose'
import type { Piece } from './types'

/** A reading projection only: notes, timing, source and persisted arrangements stay original. */
export function transposePieceChords(piece: Piece, semitones: number): Piece {
  if (semitones === 0) return piece
  return {
    ...piece,
    chords: piece.chords?.map(chord => ({ ...chord, name: transposeChord(chord.name, semitones) })),
    lyrics: piece.lyrics?.map(line => ({
      ...line,
      anchors: line.anchors?.map(anchor => ({ ...anchor, name: transposeChord(anchor.name, semitones) })),
    })),
  }
}
