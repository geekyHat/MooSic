import { arrangementContent } from '@/application/songs/importSongs'
import { artistKey, artistNames, canonicalArtist } from '@/domain/songs/artists'
import { makeId } from '@/domain/songs/ids'
import type { UserSong } from '@/domain/songs/types'
export function mergeBackupSongs(incoming:UserSong[],current:UserSong[],titles:{artist:string;title:string}[]){
  const result=[...current],used=new Set(current.map(song=>song.id)),names=artistNames(current.map(song=>song.artist))
  const occupied=new Set([...titles.map(song=>JSON.stringify([artistKey(song.artist),artistKey(song.title)])),...current.map(song=>JSON.stringify([artistKey(song.artist),artistKey(song.name)]))])
  const base=(name:string)=>name.replace(/\s+\(\d+\)$/,'')
  // Backup deduplication also preserves source notices, whitespace and arrangement names.
  // The file importer deliberately normalizes these; a full backup must retain them.
  const content=(song:UserSong)=>JSON.stringify([arrangementContent(song.arrangements),song.arrangements.map(a=>[a.name,a.source]),song.genre,artistNames(song.artistAliases??[]).map(artistKey)])
  const identical=new Set(current.map(song=>JSON.stringify([artistKey(song.artist),artistKey(base(song.name)),content(song)])))
  let added=0,skipped=0
  for(const source of incoming){
    const artist=canonicalArtist(source.artist,names),identity=JSON.stringify([artistKey(artist),artistKey(base(source.name)),content(source)])
    if(identical.has(identity)){skipped++;continue}
    let name=source.name,count=1
    while(occupied.has(JSON.stringify([artistKey(artist),artistKey(name)])))name=`${base(source.name)} (${count++})`
    let id=source.id
    while(used.has(id))id=makeId('song')
    result.push({...source,id,name,artist});used.add(id);occupied.add(JSON.stringify([artistKey(artist),artistKey(name)]));identical.add(identity);names.push(artist);added++
  }
  return {songs:result,added,skipped}
}
