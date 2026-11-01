import type { ReactNode } from 'react'
import type { InlineChord } from '@/domain/music/chordSymbol'
import { transposeChord } from '@/domain/music/transpose'

/** Replace only recognized markers in the reading view; offsets always refer to the original. */
export function InlineChordDocument({ source, chords, semitones = 0 }: { source: string; chords: readonly InlineChord[]; semitones?: number }) {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const chord of chords) {
    const name = transposeChord(chord.symbol.name, semitones)
    parts.push(source.slice(cursor, chord.start))
    parts.push(<span key={chord.start} className="chord-mark font-bold text-accent" data-chord={name}>{semitones === 0 ? source.slice(chord.start, chord.end) : `[${name}]`}</span>)
    cursor = chord.end
  }
  parts.push(source.slice(cursor))
  return <>{parts}</>
}
