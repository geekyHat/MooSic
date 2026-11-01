import { artistKey, artistLinks, artistNames, canonicalArtist, resolveArtist, suggestArtists } from '@/domain/songs/artists'
import type { ImportedSong } from '@/domain/songs/importSong'
import { makeId } from '@/domain/songs/ids'
import type { UserArrangement, UserSong } from '@/domain/songs/types'
import type { ContentArtist } from '@/core/plugin/types'
import type { SongService } from './SongService'

export interface ImportChoice {entry: ImportedSong; name: string; artist: string; confirmed: boolean; matchedAlias?: string; metadataConfirmed?: boolean}
export interface ImportPlan {song: UserSong; filename: string; status: 'add' | 'rename' | 'duplicate' | 'confirm'; candidates: string[]}

function sourceContent(text:string):string {
  return text.replace(/\r\n?/g,'\n').split('\n').filter(line=>
    !/^\s*\{(?:title|t|artist|author|composer|genre)\s*:/i.test(line)
    && !/^\s*\{meta\s*:\s*(?:title|artist|author|composer|genre)\s+/i.test(line)
    && !/^\s*(?:title|song|artist|author|composer|genre)\s*:/i.test(line)
  ).map(line=>line.trimEnd()).join('\n').trim()
}

/** Ignore generated IDs and source formatting, compare actual musical/editor content. */
export function arrangementContent(arrangements: UserArrangement[]): string {
  return JSON.stringify(arrangements.map(arrangement => ({
    kind: arrangement.kind, tempo: arrangement.tempo, bars: arrangement.bars, beatsPerBar: arrangement.beatsPerBar,
    source: arrangement.source ? {format:arrangement.source.format,text:sourceContent(arrangement.source.text)} : undefined,
    notes: arrangement.kind === 'tabs' ? [...arrangement.tabNotes].sort((a,b)=>a.beat-b.beat||a.row-b.row||a.fret-b.fret)
      : arrangement.kind === 'sheet' ? [...arrangement.sheetNotes].sort((a,b)=>a.beat-b.beat||a.midi-b.midi) : undefined,
    chords: arrangement.kind === 'lyrics' ? arrangement.chordBars : undefined,
    sheet: arrangement.kind === 'lyrics' ? arrangement.lyricSheet?.rows.map(row => row.kind === 'line'
      ? {kind:row.kind, text:row.text, chords:row.chords, startBeat:row.startBeat, endBeat:row.endBeat, tokens:row.tokens}
      : row.kind === 'section' ? {kind:row.kind,title:row.title} : {kind:row.kind}) : undefined,
    intro: arrangement.kind === 'lyrics' ? arrangement.introTabs : undefined,
    outro: arrangement.kind === 'lyrics' ? arrangement.outroTabs : undefined,
  })).sort((a,b)=>a.kind.localeCompare(b.kind)))
}
const titleKey = (name: string) => name.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ')
const baseTitle = (name: string) => name.replace(/\s+\(\d+\)$/, '')

/** Recomputed inside the storage lock, so simultaneous imports cannot overwrite each other. */
export function planImports(choices: ImportChoice[], current: UserSong[], catalog: ContentArtist[]): ImportPlan[] {
  const links = artistLinks(current)
  const names = artistNames([...catalog.map(artist=>artist.meta.name), ...current.map(song=>song.artist)])
  const used = [...catalog.flatMap(artist => artist.songs.map(song => ({artist: artist.meta.name, name: song.meta.title}))), ...current]
  const local = [...current]
  return choices.map(choice => {
    const typed = resolveArtist(choice.artist, links)
    const artist = canonicalArtist(typed, names)
    const candidates = suggestArtists(typed, names)
    const isKnown = names.some(name=>artistKey(name)===artistKey(artist))
    const acceptedAlias=choice.matchedAlias ?? (artistKey(typed)!==artistKey(choice.artist)?choice.artist:undefined)
    const song: UserSong = {...choice.entry.song, id: makeId('song'), name: choice.name.trim(), artist,
      artistAliases: artistNames([...(choice.entry.song.artistAliases ?? []), ...(acceptedAlias?[acceptedAlias]:[])]).filter(name=>artistKey(name)!==artistKey(artist))}
    if (!choice.confirmed && !isKnown && candidates.length) return {song, filename:choice.entry.filename,status:'confirm',candidates}
    if (!song.name || !artist) return {song,filename:choice.entry.filename,status:'add',candidates:[]}
    links.push(...(song.artistAliases??[]).map(alias=>({alias,name:artist})))
    const fingerprint = arrangementContent(song.arrangements)
    const duplicate = local.find(existing => artistKey(resolveArtist(existing.artist,links))===artistKey(artist)
      && titleKey(baseTitle(existing.name))===titleKey(baseTitle(song.name)) && arrangementContent(existing.arrangements)===fingerprint)
    if (duplicate) {
      const updated={...duplicate,artist,artistAliases:artistNames([...(duplicate.artistAliases??[]),...(song.artistAliases??[])])}
      local[local.indexOf(duplicate)]=updated
      return {song:updated,filename:choice.entry.filename,status:'duplicate',candidates:[]}
    }
    const original = song.name
    let count = 1
    while (used.some(existing=>artistKey(resolveArtist(existing.artist,links))===artistKey(artist)&&titleKey(existing.name)===titleKey(song.name))) song.name = `${baseTitle(original)} (${count++})`
    used.push(song); local.push(song)
    if(!names.some(name=>artistKey(name)===artistKey(artist)))names.push(artist)
    return {song, filename:choice.entry.filename,status:original===song.name?'add':'rename',candidates:[]}
  })
}

export async function importSongs(service: SongService, choices: ImportChoice[], catalog: ContentArtist[]): Promise<ImportPlan[]> {
  if(choices.some(choice=>choice.entry.metadata.needsReview&&!choice.metadataConfirmed))throw new Error('Confirm the detected artist and title before importing')
  if(choices.some(choice=>!choice.name.trim()||!choice.artist.trim()||choice.name.length>200||choice.artist.length>200))throw new Error('Title and artist are required (max 200 characters)')
  return service.updateManyAtomic(current => {
    const result = planImports(choices,current,catalog)
    if(result.some(plan=>plan.status==='confirm'))throw new Error('Confirm the artist before importing')
    const updates=new Map<string,UserSong>()
    for(const plan of result)if(plan.status!=='duplicate'||JSON.stringify(plan.song)!==JSON.stringify(current.find(song=>song.id===plan.song.id)))updates.set(plan.song.id,plan.song)
    return {songs:[...updates.values()],result}
  })
}

/** Merge local artists only after the user's explicit choice; keep every song and ID. */
export async function mergeLocalArtist(service: SongService, from: string, to: string, catalog: ContentArtist[] = []): Promise<void> {
  await service.updateManyAtomic(current => {
    const links = artistLinks(current)
    const used=new Set([...current.filter(song=>artistKey(resolveArtist(song.artist,links))===artistKey(to)).map(song=>titleKey(song.name)),...catalog.filter(artist=>artistKey(artist.meta.name)===artistKey(to)).flatMap(artist=>artist.songs.map(song=>titleKey(song.meta.title)))])
    const songs = current.filter(song=>artistKey(resolveArtist(song.artist,links))===artistKey(from)).map(song=>{
      let name=song.name,count=1
      while(used.has(titleKey(name)))name=`${baseTitle(song.name)} (${count++})`
      used.add(titleKey(name))
      return {...song,name,artist:to,artistAliases:artistNames([...(song.artistAliases??[]),song.artist,from]).filter(alias=>artistKey(alias)!==artistKey(to))}
    })
    return {songs,result:undefined}
  })
}
