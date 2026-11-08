export type AppView = 'library' | 'practice' | 'editor' | 'settings' | 'tuner'
export type LibraryMode = 'artists' | 'songs' | 'tabs' | 'chords' | 'sheet'
export type LibraryPanel = 'import' | 'olga' | 'scan' | 'merge' | null
export interface LibraryLocation {
  mode: LibraryMode
  artistId: string | null
  songId: string | null
  rootLetter: string
  artistLetter: string
  filters: {search: string; composer: string; genre: string}
  limit: number
  panel: LibraryPanel
}
export interface AppLocation {
  view: AppView
  library: LibraryLocation
  practice: {songId: string | null; versionId: string | null; kind: 'tabs' | 'lyrics' | 'sheet' | null; display: 'tabs' | 'notation' | 'chords' | null}
  editorSongId: string | null
}
export const libraryLocation = (): LibraryLocation => ({mode:'artists',artistId:null,songId:null,rootLetter:'all',artistLetter:'all',filters:{search:'',composer:'all',genre:'all'},limit:48,panel:null})
export const appLocation = (): AppLocation => ({view:'library',library:libraryLocation(),practice:{songId:null,versionId:null,kind:null,display:null},editorSongId:null})
const oneOf = <const T extends string>(value: string | null, values: readonly T[], fallback: T): T => values.includes(value as T) ? value as T : fallback
const letter = (value: string | null) => value && /^(?:all|0–9|[A-Z]|#)$/.test(value) ? value : 'all'

/** Hash routes work on a static host and never contain song text, files or editor drafts. */
export function parseLocation(hash: string): AppLocation {
  const route = appLocation()
  if (hash.length>8192 || !hash.startsWith('#/')) return route
  const [path,query] = hash.slice(2).split('?')
  route.view = oneOf(path,['library','practice','editor','settings','tuner'],'library')
  const params = new URLSearchParams(query)
  const text = (key: string, fallback = '') => (params.get(key) ?? fallback).slice(0,300)
  const id = (key: string) => text(key) || null
  route.library = {
    mode:oneOf(params.get('mode'),['artists','songs','tabs','chords','sheet'],'artists'),
    artistId:id('artist'),songId:id('selectedSong'),rootLetter:letter(params.get('letter')),artistLetter:letter(params.get('artistLetter')),
    filters:{search:text('q'),composer:text('composer','all'),genre:text('genre','all')},
    limit:Math.trunc(Math.max(48,Math.min(60000,Number(params.get('limit')) || 48))),
    panel:oneOf(params.get('panel'),['import','olga','scan','merge',''],'') || null,
  }
  route.practice = {songId:id('song'),versionId:id('version'),kind:oneOf(params.get('kind'),['tabs','lyrics','sheet',''],'') || null,display:oneOf(params.get('display'),['tabs','notation','chords',''],'') || null}
  route.editorSongId = id('editorSong')
  return route
}
export function formatLocation(route: AppLocation): string {
  const params = new URLSearchParams(), library = route.library
  const add = (key: string, value: string | null, fallback = '') => {if(value && value!==fallback)params.set(key,value)}
  add('mode',library.mode,'artists');add('artist',library.artistId);add('selectedSong',library.songId)
  add('letter',library.rootLetter,'all');add('artistLetter',library.artistLetter,'all')
  add('q',library.filters.search);add('composer',library.filters.composer,'all');add('genre',library.filters.genre,'all')
  if(library.limit!==48)params.set('limit',String(library.limit))
  add('panel',library.panel);add('song',route.practice.songId);add('version',route.practice.versionId);add('kind',route.practice.kind);add('display',route.practice.display);add('editorSong',route.editorSongId)
  return `#/${route.view}${params.size?'?'+params.toString():''}`
}
