import { finiteNumber as number, integer, record } from './guards'
import { isLyricSheet, isLyricTiming } from './lyricValidation'
import type { UserArrangement, UserSong } from './types'
export { record } from './guards'
function denseArray(value:unknown):unknown[]|null{
  if(!Array.isArray(value))return null
  for(let i=0;i<value.length;i++)if(!(i in value))return null
  return value
}

export function validateArrangement(value: unknown): string[] {
  if (!record(value)) return ['Invalid arrangement']
  if (value.kind==='lyrics' && Array.isArray(value.chordBars) && value.chordBars.some(bar=>record(bar)&&bar.timingApproximate!==undefined&&typeof bar.timingApproximate!=='boolean')) return ['Invalid timing approximation flag']
  const errors: string[] = []
  if (typeof value.id !== 'string' || typeof value.name !== 'string') errors.push('Missing identity')
  if(value.source!==undefined&&(!record(value.source)||!['tab','chordpro'].includes(String(value.source.format))||typeof value.source.text!=='string'||value.source.text.length>100000))errors.push('Invalid imported source')
  if (!integer(value.tempo, 40, 240)) errors.push('BPM must be an integer from 40 to 240')
  const maxBars = value.kind === 'lyrics' && value.lyricSheet !== undefined ? 256 : 32
  if (!integer(value.bars, 1, maxBars) || value.beatsPerBar !== 4) errors.push(`Bars must be integers from 1 to ${maxBars}, in 4/4`)
  const end = Number(value.bars) * 4
  const beat = (v: unknown): v is number => number(v) && v >= 0 && v < end
  const tabNotes=denseArray(value.tabNotes),sheetNotes=denseArray(value.sheetNotes),chordBars=denseArray(value.chordBars)
  if (value.kind !== 'lyrics' && value.lyricSheet !== undefined) errors.push('Lyric sheet belongs only to lyrics')
  if (value.kind === 'tabs') {
    if (value.chordBars !== undefined || value.sheetNotes !== undefined || !Array.isArray(value.tabNotes) || !value.tabNotes.length
      || !tabNotes || !tabNotes.length
      || !tabNotes.every(n => record(n) && integer(n.row, 0, 5) && integer(n.fret, 0, 24) && beat(n.beat) && n.beat + 1 <= end)) errors.push('Invalid or empty tablature')
  } else if (value.kind === 'sheet') {
    if (value.chordBars !== undefined || value.tabNotes !== undefined || !Array.isArray(value.sheetNotes) || !value.sheetNotes.length
      || !sheetNotes || !sheetNotes.length
      || !sheetNotes.every(n => record(n) && integer(n.midi, 0, 127) && beat(n.beat) && number(n.durBeats) && n.durBeats > 0 && n.beat + n.durBeats <= end)) errors.push('Invalid or empty notation')
  } else if (value.kind === 'lyrics') {
    if (value.tabNotes !== undefined || value.sheetNotes !== undefined || !chordBars) {
      errors.push('Invalid lyric arrangement fields')
    } else if (value.lyricSheet !== undefined) {
      if (chordBars.length || !isLyricSheet(value.lyricSheet, end)) errors.push('Invalid lyric sheet: check content, anchors and ordered beat intervals')
    } else if (chordBars.length > Number(value.bars)
      || !chordBars.some(b => record(b) && (String(b.chord).trim() || String(b.lyric).trim()))
      || !chordBars.every(b => record(b) && typeof b.chord === 'string' && typeof b.lyric === 'string'
        && (b.tokens === undefined || isLyricTiming(b.tokens, b.lyric, 4)))) {
      errors.push('Invalid lyrics or word timing (ordered local beats 0–4)')
    }
  } else errors.push('Unknown arrangement kind')
  return errors
}
export function isArrangement(value: unknown): value is UserArrangement { return validateArrangement(value).length === 0 }
export function isSong(value: unknown): value is UserSong {
  if(!record(value))return false
  const arrangements=denseArray(value.arrangements)
  return ['id', 'name', 'artist', 'genre'].every(key => typeof value[key] === 'string')
    && (value.artistAliases===undefined || Array.isArray(value.artistAliases)&&value.artistAliases.length<=256&&value.artistAliases.every(alias=>typeof alias==='string'&&alias.length<=200))
    && number(value.createdAt) && !!arrangements
    && arrangements.every(isArrangement)
    && new Set(arrangements.map(arr => (arr as UserArrangement).kind)).size === arrangements.length
}
