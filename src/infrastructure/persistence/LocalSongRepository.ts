import { SongStorageError,type SongRepository } from '@/application/songs/SongRepository';
import type { UserSong } from '@/domain/songs/types';
import { isSong } from '@/domain/songs/validation';
import { decodeSongPayload } from './migrations';
interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void}
const KEY='mm:user-songs'
export class LocalSongRepository implements SongRepository {
 private listeners=new Set<()=>void>()
 private storage: StoragePort
 constructor(storage: StoragePort, events?: Pick<Window,'addEventListener'>) {
  this.storage=storage
  events?.addEventListener('storage', e=>{if(e.key===KEY || e.key===null)this.emit()})
 }
 private emit(){for(const cb of this.listeners) cb()}
 subscribe(cb:()=>void){this.listeners.add(cb);return ()=>{this.listeners.delete(cb)}}
 private read(){try{return this.storage.getItem(KEY)}catch(e){throw new SongStorageError('denied',e)}}
 private parse(raw:string|null):UserSong[]{return decodeSongPayload(raw).songs}
 diagnostics():{error:SongStorageError['code']|null;rejected:number}{
  try{const schema=this.storage.getItem(`${KEY}:schema`);if(schema!==null&&schema!=='0'&&schema!=='1')return {error:'version',rejected:0};const result=decodeSongPayload(this.read());return {error:null,rejected:result.rejected}}
  catch(e){return {error:e instanceof SongStorageError?e.code:'denied',rejected:0}}
 }
 list(){try{return this.parse(this.read())}catch{return []}}
 get(id:string){return this.list().find(s=>s.id===id)}
 private write(songs:UserSong[]){
  const schema=this.storage.getItem(`${KEY}:schema`)
  if(schema!==null&&schema!=='0'&&schema!=='1')throw new SongStorageError('version')
  const raw=this.read()
  // An unknown envelope is never downgraded. Corrupt records remain exportable.
  if(raw){try{this.parse(raw)}catch(e){if(e instanceof SongStorageError && e.code==='version')throw e}
   try{this.storage.setItem(`${KEY}:backup`,raw);if(this.storage.getItem(`${KEY}:backup`)!==raw)throw new SongStorageError('backup');if(this.storage.getItem(`${KEY}:recovery`)===null){this.storage.setItem(`${KEY}:recovery`,raw);if(this.storage.getItem(`${KEY}:recovery`)!==raw)throw new SongStorageError('backup')}}catch(e){throw new SongStorageError(e instanceof DOMException && e.name==='QuotaExceededError'?'quota':'backup',e)}
  }
  try{this.storage.setItem(`${KEY}:schema`,'1');this.storage.setItem(KEY,JSON.stringify(songs))}catch(e){throw new SongStorageError(e instanceof DOMException && e.name==='QuotaExceededError'?'quota':'denied',e)}
  this.emit()
 }
 save(song:UserSong){if(!isSong(song))throw new SongStorageError('corrupt');const songs=this.list();const i=songs.findIndex(s=>s.id===song.id);if(i<0)songs.push(song);else songs[i]=song;this.write(songs)}
 saveMany(updates:UserSong[]){
  if(!updates.every(isSong)||new Set(updates.map(song=>song.id)).size!==updates.length)throw new SongStorageError('corrupt')
  const songs=new Map(this.list().map(song=>[song.id,song]))
  for(const song of updates)songs.set(song.id,song)
  this.write([...songs.values()])
 }
 remove(id:string){this.write(this.list().filter(s=>s.id!==id))}
 recovery(){
  const backup=this.storage.getItem(`${KEY}:recovery`);if(backup)return backup
  const raw=this.read();if(!raw)return null
  try{const parsed:unknown=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(isSong))return raw}catch{return raw}
  return null
 }
 restoreRecovery(){const raw=this.recovery();if(!raw)throw new SongStorageError('backup');const songs=this.parse(raw);if(!songs.length)throw new SongStorageError('corrupt');this.write(songs)}
}
