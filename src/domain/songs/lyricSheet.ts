import { makeId } from './ids'
import type { LyricChordAnchor, UserChordBar, UserLyricRow, UserLyricSheet } from './types'

/** Match unchanged/nearest same-name anchors one-to-one, never by shifted array index. */
function preserveChordBeats(current: LyricChordAnchor[], previous: LyricChordAnchor[]): LyricChordAnchor[] {
  if (current.length > 128 || previous.length > 128) throw new Error('Chord anchor count exceeds the safe limit')
  const pairs = current.flatMap((chord, next) => previous.flatMap((old, prior) =>
    old.name === chord.name ? [{next, prior, distance: Math.abs(old.offset - chord.offset)}] : []))
    .sort((a, b) => a.distance - b.distance || a.prior - b.prior || a.next - b.next)
  const matches = new Map<number, number>(), used = new Set<number>()
  for (const pair of pairs) {
    if (matches.has(pair.next) || used.has(pair.prior)) continue
    matches.set(pair.next, pair.prior)
    used.add(pair.prior)
  }
  return current.map((chord, index) => {
    const prior = matches.get(index)
    const beat = prior === undefined ? undefined : previous[prior].beat
    return beat === undefined ? chord : {...chord, beat}
  })
}

/** A small, lossless ChordPro subset: [chord], {c:section}, escaped brackets. */
export function parseLyricSheet(source: string, previous?: UserLyricSheet): UserLyricSheet {
  if (source.length > 100000 || source.split('\n').length > 2048) throw new Error('Song sheet source exceeds the safe size limit')
  let beat = 0
  const rows: UserLyricRow[] = source === '' ? [] : source.replace(/\r\n?/g, '\n').split('\n').map(raw => {
    const id = makeId('line')
    const section = raw.match(/^\s*\{(?:c|comment|start_of_verse|start_of_chorus):\s*(.*?)\}\s*$/i)
      ?? raw.match(/^\s*\[((?:verse|chorus|bridge|intro|outro|strofa|ritornello|pre-chorus|interlude)\s*\d*)\]\s*$/i)
    if (section) return {kind: 'section', id, title: section[1]}
    if (!raw.trim()) return {kind: 'spacer', id}
    const chords: LyricChordAnchor[] = []
    let text = ''
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\\' && /[\[\]{}\\]/.test(raw[i + 1] ?? '')) { text += raw[++i]; continue }
      if (raw[i] === '[') {
        const end = raw.indexOf(']', i + 1)
        const name = raw.slice(i + 1, end).trim()
        if (end < 0 || !name || name.length > 32 || /[\[\]{}\r\n]/.test(name)) throw new Error('Invalid chord brackets')
        if (chords.length >= 128) throw new Error('Chord anchor count exceeds the safe limit')
        chords.push({name, offset: text.length})
        i = end
      } else {
        if (/[\]{}]/.test(raw[i])) throw new Error('Escape literal brackets or use {c:Section}')
        text += raw[i]
      }
    }
    const startBeat = beat
    beat += 4
    return {kind: 'line', id, text, chords, startBeat, endBeat: beat}
  })
  if (!previous) return {version: 1, rows}
  // Reserve unchanged rows first so inserting a line cannot steal a later ID.
  const used = new Set<string>()
  const matches = rows.map(row => {
    const old = previous.rows.find(candidate => !used.has(candidate.id) && candidate.kind === row.kind && (
      row.kind === 'line' ? candidate.kind === 'line' && candidate.text === row.text
        : row.kind === 'section' ? candidate.kind === 'section' && candidate.title === row.title : true
    ))
    if (old) used.add(old.id)
    return old
  })
  let end = 0
  return {version: 1, rows: rows.map((row, i) => {
    const fallback = previous.rows[i]
    const old = matches[i] ?? (fallback?.kind === row.kind && !used.has(fallback.id) ? fallback : undefined)
    if (old) used.add(old.id)
    if (row.kind !== 'line') return {...row, id: old?.id ?? row.id}
    const prior = old?.kind === 'line' ? old : undefined
    const startBeat = Math.max(end, prior?.startBeat ?? end)
    const endBeat = startBeat + (prior ? prior.endBeat - prior.startBeat : 4)
    end = endBeat
    return {...row, id: old?.id ?? row.id, startBeat, endBeat,
      tokens: prior?.text === row.text ? prior.tokens : undefined,
      timingApproximate: prior?.text === row.text ? prior.timingApproximate : undefined,
      chords: preserveChordBeats(row.chords, prior?.chords ?? []),
    }
  })}
}

const escapeText = (text: string) => text.replace(/[\\\[\]{}]/g, '\\$&')

/** Explicit conversion only: legacy data is never migrated by merely opening it. */
export function legacyToLyricSheet(bars: UserChordBar[], count: number): UserLyricSheet {
  if (!bars.some(bar => bar && (bar.chord.trim() || bar.lyric.trim()))) return {version:1, rows:[]}
  return {version:1, rows:Array.from({length:count}, (_,index) => {
    const bar=bars[index], id=makeId('line')
    if (!bar || !bar.chord.trim() && !bar.lyric.trim()) return {kind:'spacer', id}
    return {kind:'line', id, text:bar.lyric, chords:bar.chord.trim()?[{name:bar.chord.trim(), offset:0}]:[],
      startBeat:index*4, endBeat:(index+1)*4, tokens:bar.tokens?.map(token=>({...token})), timingApproximate:bar.timingApproximate}
  })}
}

export function serializeLyricSheet(sheet: UserLyricSheet): string {
  return sheet.rows.map(row => {
    if (row.kind === 'section') return `{c:${row.title}}`
    if (row.kind === 'spacer') return ''
    let cursor = 0
    let source = ''
    for (const chord of row.chords) {
      source += escapeText(row.text.slice(cursor, chord.offset)) + `[${chord.name}]`
      cursor = chord.offset
    }
    return source + escapeText(row.text.slice(cursor))
  }).join('\n')
}
