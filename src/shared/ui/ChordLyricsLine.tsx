import type {ReactNode} from 'react'

type Anchor = {name: string; offset: number}
interface Props {text: string; anchors: readonly Anchor[]}

/** Keep a chord and its text fragment in the same wrapping box; no time-based X position. */
export function ChordLyricsLine({text, anchors}: Props) {
  let cursor = 0
  const ranges = [...text.matchAll(/\S+/gu)].map(match=>({start:match.index,end:match.index+match[0].length}))

  function fragments(start: number, end: number, includeEnd = false): ReactNode {
    const marks = anchors.filter(anchor => anchor.offset >= start && (anchor.offset < end || includeEnd && anchor.offset === end))
    const positions = [...new Set([start, ...marks.map(anchor => anchor.offset), end])].sort((a,b) => a-b)
    // An empty lyric line can still carry a sequence of chords at offset zero.
    if (positions.length === 1) positions.push(end)
    return positions.slice(0, -1).map((position, i) => {
      const local = marks.filter(mark => mark.offset === position)
      return <span key={`${position}-${i}`} className="mm-lyric-fragment">
        <span className="mm-chord-above">{local.map((mark, index) => <span key={index} className="chord-mark" data-offset={mark.offset}>{index > 0 && ' '}{mark.name}</span>)}</span>
        <span data-lyric-fragment="">{text.slice(position, positions[i+1])}</span>
      </span>
    })
  }
  const content: ReactNode[] = []
  cursor = 0
  ranges.forEach((range, index) => {
    if (range.start > cursor) content.push(<span key={`gap-${index}`}>{fragments(cursor, range.start)}</span>)
    content.push(<span key={`word-${index}`} className="mm-lyric-word" data-word={text.slice(range.start, range.end)}>{fragments(range.start, range.end)}</span>)
    cursor = range.end
  })
  // Include the line-end anchor once, in a separate zero-character fragment.
  if (cursor < text.length) content.push(<span key="tail">{fragments(cursor, text.length)}</span>)
  if (anchors.some(anchor => anchor.offset === text.length)) content.push(<span key="end">{fragments(text.length, text.length, true)}</span>)
  return <span className="line-lyrics mm-anchored-lyrics">{content}</span>
}
