import {finiteNumber as number, integer, record} from './guards'
import type {LyricToken, UserLyricSheet} from './types'

function denseArray(value:unknown):unknown[]|null{
  if(!Array.isArray(value))return null
  for(let i=0;i<value.length;i++)if(!(i in value))return null
  return value
}

export function isLyricTiming(value: unknown, text: string, duration: number): value is LyricToken[] {
  let previous = 0
  const tokens=denseArray(value)
  return !!tokens && tokens.length > 0 && tokens.every(token => {
    if (!record(token) || typeof token.text !== 'string' || !token.text.trim()
      || (token.joinNext !== undefined && typeof token.joinNext !== 'boolean')
      || !number(token.startBeat) || !number(token.endBeat) || token.startBeat < previous
      || token.endBeat <= token.startBeat || token.endBeat > duration) return false
    previous = token.endBeat
    return true
  }) && tokens.map(token => (token as LyricToken).text).join('').replace(/\s/g, '') === text.replace(/\s/g, '')
}

/** Validate untrusted local/imported data before it reaches the score or UI. */
export function isLyricSheet(value: unknown, endBeat: number): value is UserLyricSheet {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.rows) || value.rows.length > 2048) return false
  const ids = new Set<string>()
  let previousEnd = 0, visible = false, characters = 0
  for (const row of value.rows) {
    if (!record(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id)) return false
    ids.add(row.id)
    if (row.kind === 'spacer') continue
    if (row.kind === 'section') {
      if (typeof row.title !== 'string' || !row.title.trim() || row.title.length > 120 || /[{}\r\n]/.test(row.title)) return false
      continue
    }
    if (row.kind !== 'line' || typeof row.text !== 'string' || /[\r\n]/.test(row.text)
      || !Array.isArray(row.chords) || row.chords.length > 128
      || !number(row.startBeat) || !number(row.endBeat) || row.startBeat < previousEnd
      || row.endBeat <= row.startBeat || row.endBeat > endBeat) return false
    characters += row.text.length
    if (characters > 100000 || row.text.length > 10000) return false
    previousEnd = row.endBeat
    const duration = row.endBeat - row.startBeat
    // UTF-16 offsets agree with textarea.selectionStart, but may not split a grapheme.
    const boundaries = new Set([...new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(row.text)].map(part => part.index))
    boundaries.add(row.text.length)
    let previousOffset = 0
    for (const chord of row.chords) {
      if (!record(chord) || typeof chord.name !== 'string' || !chord.name.trim() || chord.name.length > 32
        || /[\[\]{}\r\n]/.test(chord.name) || !integer(chord.offset, previousOffset, row.text.length)
        || !boundaries.has(chord.offset)
        || (chord.beat !== undefined && (!number(chord.beat) || chord.beat < 0 || chord.beat >= duration))) return false
      previousOffset = chord.offset
    }
    if (row.timingApproximate !== undefined && typeof row.timingApproximate !== 'boolean') return false
    if (row.tokens !== undefined && !isLyricTiming(row.tokens, row.text, duration)) return false
    visible ||= !!row.text.trim() || row.chords.length > 0
  }
  return visible
}
