import type { ArrangementKind,ContentArtist,ContentSong } from '@/core/plugin/types'

export const LIBRARY_VIEWS = [
  {id:'artists',label:'library.browse.artists'},
  {id:'songs',label:'library.browse.songs'},
  {id:'tabs',label:'library.browse.tabs',kind:'tabs'},
  {id:'chords',label:'library.browse.chords',kind:'lyrics'},
  {id:'sheet',label:'library.browse.sheet',kind:'sheet'},
] as const satisfies readonly {id:string;label:string;kind?:ArrangementKind}[]
export type LibraryViewId = typeof LIBRARY_VIEWS[number]['id']
export interface LibrarySongRow {artist:ContentArtist; song:ContentSong}
/** Auto-open only when the current library scope offers exactly one choice. */
export function singleArrangement(song: ContentSong): {versionId:string;kind:ArrangementKind}|null {
  if(song.versions.length!==1 || song.versions[0].arrangements.length!==1)return null
  return {versionId:song.versions[0].id,kind:song.versions[0].arrangements[0].kind}
}
export const ALPHABET = ['0–9',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'] as const
export type LibraryLetter = typeof ALPHABET[number] | 'all'

/** Titles are indexed by their first visible letter, ignoring accents and opening punctuation. */
export function initialLetter(value:string):string {
  const initial=value.normalize('NFKD').replace(/\p{M}/gu,'').replace(/^[^\p{L}\p{N}]+/u,'').toUpperCase()[0]??''
  return /[0-9]/.test(initial)?'0–9':/^[A-Z]$/.test(initial)?initial:'#'
}
export function alphabeticSort<T>(items:readonly T[],label:(item:T)=>string,locale:string,tie:(item:T)=>string):T[]{
  const collator=new Intl.Collator(locale,{numeric:true,sensitivity:'base',ignorePunctuation:true})
  const ranks=new Map<string,number>(ALPHABET.map((letter,index)=>[letter,index]))
  return items.map(item=>({item,name:label(item),rank:ranks.get(initialLetter(label(item)))!,tie:tie(item)}))
    .sort((a,b)=>a.rank-b.rank || collator.compare(a.name,b.name) || collator.compare(a.tie,b.tie) || (a.tie<b.tie?-1:a.tie>b.tie?1:0))
    .map(row=>row.item)
}
export function songsForView(artists:ContentArtist[],view:LibraryViewId):LibrarySongRow[]{
  const definition=LIBRARY_VIEWS.find(item=>item.id===view)!
  const kind='kind' in definition?definition.kind:undefined
  return artists.flatMap(artist=>artist.songs.flatMap(song=>{
    if(!kind)return [{artist,song}]
    const versions=song.versions.map(version=>({...version,arrangements:version.arrangements.filter(arr=>arr.kind===kind)})).filter(version=>version.arrangements.length>0)
    return versions.length?[{artist,song:{...song,versions}}]:[]
  }))
}
export function letterCounts<T>(items:readonly T[],label:(item:T)=>string):Map<string,number>{
  const counts=new Map<string,number>()
  for(const item of items){const key=initialLetter(label(item));counts.set(key,(counts.get(key)??0)+1)}
  return counts
}
/** Filtering precedes pagination, so Z is reachable even in a catalog with thousands of earlier entries. */
export function alphabeticPage<T>(sorted:readonly T[],label:(item:T)=>string,letter:LibraryLetter,limit:number){
  const matching=letter==='all'?sorted:sorted.filter(item=>initialLetter(label(item))===letter)
  return {items:matching.slice(0,limit),total:matching.length}
}
