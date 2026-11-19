import { parseChordSymbol } from '../music/chordSymbol'

export type DocumentBlock =
  | { kind: 'text'; text: string; offset: number }
  | { kind: 'lyrics'; text: string; anchors: { name: string; offset: number }[] }
  | { kind: 'tab'; rows: { label: string; body: string }[] }

/** Expand tab stops only in the derived display. Persisted source stays untouched. */
export function expandTabStops(text: string): string {
  let column = 0
  return Array.from(text, character => {
    if (character !== '\t') { column++; return character }
    const count = 8 - column % 8
    column += count
    return ' '.repeat(count)
  }).join('')
}

function tabRow(text: string) {
  const match = /^\s*([eEaAbBgGcCdD]?)\s*\|([\d\s|\-hHpPbBrR/\\~xX().=:+<>^v*]+(?:\s*.*)?)$/.exec(text)
  // Require a recognizable fret/line pattern, so ordinary prose with a pipe is not TAB.
  return match && /[-\d]/.test(match[2]) ? { label: match[1], body: match[2] } : null
}
function chordRow(text: string) {
  const words = [...text.matchAll(/\S+/g)]
  return words.length && words.every(word => parseChordSymbol(word[0])) ? words.map(word => ({ name: word[0], offset: word.index })) : null
}

/** Conservatively recognize only complete, adjacent TAB rows and unambiguous
 * chord-over-lyric pairs. Everything else remains visible as wrapping text. */
export function documentBlocks(source: string): DocumentBlock[] {
  const lines = source.split('\n'), blocks: DocumentBlock[] = []
  let offset = 0
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index], text = expandTabStops(raw)
    const row = tabRow(text)
    if (row) {
      const rows = [row]
      let next = index + 1
      while (next < lines.length && rows.length < 8) {
        const following = tabRow(expandTabStops(lines[next]))
        if (!following) break
        rows.push(following); next++
      }
      const labels = rows.map(row => row.label.toUpperCase()).join('')
      const count = labels.startsWith('EBGDAE') ? 6 : /^(GDAE|AECG|GCEA)/.test(labels) ? 4 : rows.length
      if (count >= 4 && count <= 8) {
        next = index + count
        blocks.push({ kind: 'tab', rows: rows.slice(0, count) })
        for (; index < next; index++) offset += lines[index].length + 1
        index--
        continue
      }
    }
    const anchors = chordRow(text), next = lines[index + 1]
    if (anchors && next?.trim() && !tabRow(next) && !chordRow(next) && !/^\s*[\[{#]/.test(next)) {
      const lyrics = expandTabStops(next)
      blocks.push({ kind: 'lyrics', text: lyrics, anchors: anchors.map(anchor => ({ ...anchor, offset: Math.min(anchor.offset, lyrics.length) })) })
      offset += raw.length + 1 + next.length + 1
      index++
    } else {
      // Keep raw offsets for InlineChordDocument; tabs can wrap in prose without changing them.
      blocks.push({ kind: 'text', text: raw, offset })
      offset += raw.length + 1
    }
  }
  return blocks
}

/** Shared source-column boundaries preserve alignment across every string.
 * Prefer common barlines, then whitespace/dashes; never split a multi-digit fret.
 * Long connected runs may continue after a fret, with the operator on the next
 * segment and a continuation marker. No source columns are dropped. */
export function tabSegments(rows: readonly { label: string; body: string }[], columns: number) {
  const capacity = Math.max(4, Math.floor(columns))
  const length = Math.max(0, ...rows.map(row => row.body.length))
  const segments: { start: number; end: number }[] = []
  const safe = (at: number) => rows.every(row => !(/\d/.test(row.body[at - 1] ?? '') && /\d/.test(row.body[at] ?? '')))
  for (let start = 0; start < length;) {
    let end = Math.min(length, start + capacity)
    if (end < length) {
      const lower = start + Math.max(1, Math.floor(capacity / 2))
      let boundary = 0
      for (let at = end; at >= lower; at--) {
        if (safe(at) && rows.every(row => !row.body[at - 1] || row.body[at - 1] === '|')) { boundary = at; break }
      }
      if (!boundary) for (let at = end; at > start; at--) {
        if (safe(at) && rows.every(row => !row.body[at - 1] || /[-\s|]/.test(row.body[at - 1]))) { boundary = at; break }
      }
      if (!boundary) while (end > start + 1 && !safe(end)) end--
      else end = boundary
    }
    segments.push({ start, end }); start = end
  }
  return segments
}
