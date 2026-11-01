import { makeId } from './ids'
import { parseLyricSheet } from './lyricSheet'
import type { UserArrangement, UserSong, UserTabNote } from './types'
import { validateArrangement } from './validation'
import { identifySongMetadata, type ImportMetadata } from './importMetadata'
import { artistKey } from './artists'

export type ImportWarning = {code: 'timing' | 'tabTiming' | 'directive'; detail?: string}
export interface ImportedSong {
  filename: string
  song: UserSong
  warnings: ImportWarning[]
  metadata: ImportMetadata
}
export class SongImportError extends Error {
  readonly code: 'format' | 'size' | 'content' | 'tab' | 'tuning' | 'length' | 'meter' | 'tempo' | 'multiple' | 'directive'
  readonly detail: string
  constructor(code: SongImportError['code'], detail = '') {super(code + (detail ? ': ' + detail : ''));this.code=code;this.detail=detail}
}
export const IMPORT_EXTENSIONS = '.tab,.cho,.chordpro,.chopro,.chord,.crd,.pro'
export const MAX_IMPORT_BYTES = 100000

/** ASCII TAB has no reliable rhythm. Keep its source and use one beat per onset. */
function parseTab(source: string, tempo: number): UserArrangement {
  const lines = source.split('\n')
  const tabLine = (line: string) => line.replace(/(\|+)\s*x\s*\d+\s*$/i, '$1').match(/^\s*([eEBGDA]?)\s*\|([\d\s|\-hHpPbBrR/\\~xX().=:+<>^v*]+)$/)
  const notes: UserTabNote[] = []
  let beat = 0
  for (let index = 0; index < lines.length; index++) {
    const match = tabLine(lines[index])
    if (!match) continue
    const rawBlock = lines.slice(index,index+6)
    const block = rawBlock.map(tabLine)
    const repeats=Math.max(1,...rawBlock.map(line=>Number(line.match(/\|\s*x\s*(\d+)\s*$/i)?.[1]??1)))
    if(repeats>32)throw new SongImportError('length','TAB: repeats')
    if (block.length !== 6 || block.some(line => !line)) throw new SongImportError('tab')
    const labels = block.map(line => line![1].toUpperCase()).join('')
    if (labels && labels !== 'EBGDAE') throw new SongImportError('tuning')
    const events = new Map<number, {row: number; fret: number}[]>()
    block.forEach((line, row) => {
      for (const fret of line![2].matchAll(/\d+/g)) {
        const value = Number(fret[0])
        if (value > 24) throw new SongImportError('tab', 'fret > 24')
        const list = events.get(fret.index) ?? []
        list.push({row, fret: value})
        events.set(fret.index, list)
      }
    })
    for(let repeat=0;repeat<repeats;repeat++) {
      for (const [, event] of [...events].sort((a, b) => a[0] - b[0])) {
        notes.push(...event.map(note => ({...note, beat})))
        beat++
        if(beat>128)throw new SongImportError('length','TAB: 32')
      }
      beat = Math.ceil(beat / 4) * 4
    }
    index += 5
  }
  if (!notes.length) throw new SongImportError('tab')
  if (beat > 128) throw new SongImportError('length', 'TAB: 32')
  return {id: makeId('arr'), kind: 'tabs', name: 'TAB', tempo, bars: Math.max(1, Math.ceil(beat / 4)), beatsPerBar: 4, tabNotes: notes, source: {format: 'tab', text: source}}
}

/** Import a text file, never HTML, scripts, binary tablature or remote resources. */
export function parseSongFile(filename: string, text: string, knownArtists: string[] = []): ImportedSong {
  if (text.length > MAX_IMPORT_BYTES || text.split('\n').length > 2048) throw new SongImportError('size')
  if (!/\.(tab|cho|chordpro|chopro|chord|crd|pro)$/i.test(filename) || /[\x00-\x08\x0e-\x1f]/.test(text) || /<!doctype|<html[\s>]/i.test(text)) throw new SongImportError('format')
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const song: UserSong = {id: makeId('song'), name: filename.replace(/\.[^.]+$/, ''), artist: '', genre: '', createdAt: Date.now(), arrangements: []}
  const warnings: ImportWarning[] = []
  let metadataTitle='', performer='', performerRank=0, fallbackArtist='', fallbackRank=0, subtitle=''
  const performerNames=new Set<string>()
  let tempo = 100, titles = 0, expandedLength = source.length
  const body: string[] = [], tabs: string[] = []
  let tab: string[] | null = null, chorus: string[] | null = null
  let lastChorus: string[] = []
  const isTab = /\.tab$/i.test(filename)
  for (const line of source.split('\n')) {
    if (tab) {
      if (/^\s*\{(?:end_of_tab|eot)\}\s*$/i.test(line)) {tabs.push(tab.join('\n')); tab = null}
      else tab.push(line)
      continue
    }
    const header = line.match(/^\s*(?:[#;]\s*)?(title|song|artist|artista|performer|singer|cantante|interprete|band|author|autore|composer|compositore|subtitle|genre|tempo|tuning)\s*:\s*(.*)$/i)
    if (/^\s*#/.test(line) && !header) continue
    const directive = line.match(/^\s*\{([\w_-]+)(?:\s*:\s*|\s+)?(.*?)\}\s*$/)
    if (!header && !directive) {body.push(line); if (chorus) chorus.push(line); continue}
    let key = (header ?? directive)![1].toLowerCase(), value = (header ?? directive)![2].trim()
    if (key === 'meta') {const fields = value.match(/^(\w+)\s+(.+)$/); if (fields) {key = fields[1].toLowerCase(); value = fields[2]}}
    if (key === 'title' || key === 't' || key === 'song') {
      if (++titles > 1) throw new SongImportError('multiple')
      metadataTitle = value
    } else if (['artist','artista','performer','singer','cantante','interprete','band'].includes(key)) {
      if(value) {
        performerNames.add(artistKey(value))
        const rank=key==='artist'||key==='artista'?100:key==='band'?80:90
        if(rank>performerRank){performer=value;performerRank=rank}
      }
    } else if (['author','autore','composer','compositore'].includes(key)) {
      const rank=key==='author'||key==='autore'?2:1
      if(value&&rank>fallbackRank){fallbackArtist=value;fallbackRank=rank}
    }
    else if (key === 'genre') song.genre = value
    else if (key === 'tempo') {
      tempo = Number(value)
      if (!Number.isInteger(tempo) || tempo < 40 || tempo > 240) throw new SongImportError('tempo')
    } else if (key === 'time' && value !== '4/4') throw new SongImportError('meter', value)
    else if (key === 'tuning' && !/^e\s*a\s*d\s*g\s*b\s*e$/i.test(value.replace(/[,-]/g, ''))) throw new SongImportError('tuning')
    else if (key === 'start_of_tab' || key === 'sot') tab = []
    else if (/^(start_of_(verse|chorus|bridge)|so[vcb])$/.test(key)) {
      const label = value.replace(/^label=["'](.*)["']$/, '$1') || ({soc:'Chorus',sov:'Verse',sob:'Bridge'}[key] ?? key.replace('start_of_', ''))
      body.push(`{c:${label}}`)
      if (key === 'soc' || key === 'start_of_chorus') chorus = []
    } else if (/^(end_of_(verse|chorus|bridge)|eo[vcb])$/.test(key)) {
      if (key === 'eoc' || key === 'end_of_chorus') {lastChorus = chorus ?? []; chorus = null}
    } else if (key === 'chorus') {
      if (!lastChorus.length) throw new SongImportError('content', 'chorus')
      expandedLength+=lastChorus.join('\n').length
      if(expandedLength>MAX_IMPORT_BYTES)throw new SongImportError('size')
      body.push('{c:Chorus}', ...lastChorus)
    } else if (['c','comment','comment_italic','comment_box','ci','cb','subtitle','st'].includes(key)) {
      if(key==='subtitle'||key==='st')subtitle=value
      if (value) body.push(`{c:${value}}`)
    } else if (/^(new_song|ns|transpose|start_of_|end_of_)/.test(key)) throw new SongImportError(key === 'ns' || key === 'new_song' ? 'multiple' : 'directive', key)
    else if (!['time', 'tuning'].includes(key)) warnings.push({code: 'directive', detail: `${key}${value ? ': ' + value : ''}`})
  }
  if (tab) throw new SongImportError('tab', 'end_of_tab')
  const identified=identifySongMetadata(filename,{title:metadataTitle,artist:performer,fallbackArtist,subtitle,conflictingArtists:performerNames.size>1},knownArtists)
  song.name=identified.name;song.artist=identified.artist
  if (song.name.length>200 || song.artist.length>200)throw new SongImportError('content', 'metadata > 200')
  if (isTab) tabs.push(body.join('\n'))
  else {
    let sheet
    try {sheet = parseLyricSheet(body.join('\n').trim())} catch (error) {throw new SongImportError('content', String(error))}
    const end = Math.max(0, ...sheet.rows.map(row => row.kind === 'line' ? row.endBeat : 0))
    if (end > 1024) throw new SongImportError('length', 'ChordPro: 256')
    if (sheet.rows.some(row => row.kind === 'line' && (row.text.trim() || row.chords.length))) {
      sheet.rows = sheet.rows.map(row => row.kind === 'line' ? {...row, timingApproximate: true} : row)
      song.arrangements.push({id: makeId('arr'), kind: 'lyrics', name: 'ChordPro', tempo, bars: Math.max(1, Math.ceil(end / 4)), beatsPerBar: 4, chordBars: [], lyricSheet: sheet, source: {format: 'chordpro', text: source}})
      warnings.push({code: 'timing'})
    }
  }
  if (tabs.length) {
    const arrangement=parseTab(tabs.join('\n\n'), tempo)
    if(isTab)arrangement.source={format:'tab',text:source}
    song.arrangements.push(arrangement);warnings.push({code: 'tabTiming'})
  }
  if (!song.arrangements.length) throw new SongImportError('content')
  for (const arrangement of song.arrangements) if (validateArrangement(arrangement).length) throw new SongImportError('content')
  return {filename, song, warnings, metadata:identified.metadata}
}
