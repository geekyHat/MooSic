import type { Piece } from '@/domain/score/types'
import { ChordLyricsLine } from '@/shared/ui/ChordLyricsLine'

/** Static reading view: visual chord anchors are independent from any playhead. */
export function ChordSheet({ piece }: { piece: Piece }) {
  const lyrics = piece.lyrics
  if (!lyrics?.length) return null
  return <div className="mm-chord-sheet min-w-0 px-4 py-3">
    {piece.lyricLayout ? piece.lyricLayout.map(row => {
      if (row.kind === 'section') return <h3 key={row.id} className="mm-lyric-section mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-accent">{row.title}</h3>
      if (row.kind === 'spacer') return <div key={row.id} className="h-5" aria-hidden="true"/>
      const line = lyrics[row.index]
      return <div key={row.id} className="mm-sheet-line rounded-lg"><ChordLyricsLine text={line.text} anchors={line.anchors ?? []}/></div>
    }) : lyrics.map((line, index) => {
      const chords = (piece.chords ?? []).filter(chord => chord.time >= line.time && chord.time < line.endTime)
      return <div key={index} className="mm-sheet-line relative rounded-lg px-2 pb-1 pt-4 text-center">
        <div className="line-wrap relative inline-block max-w-full">
          {chords.map((chord, chordIndex) => <span key={chordIndex} className="chord-mark absolute -top-3 -translate-x-1/2 whitespace-nowrap px-1 text-[13px] font-bold text-accent" style={{ left: `${Math.max(2, Math.min(98, (chord.time - line.time) / (line.endTime - line.time) * 100))}%` }}>{chord.name}</span>)}
          <span className="line-lyrics whitespace-pre-wrap text-[16px] leading-7 text-ink">{line.text}</span>
        </div>
      </div>
    })}
  </div>
}
