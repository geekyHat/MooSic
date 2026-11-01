import type { UserSong } from '@/domain/songs/types'
import type { SongRepository } from './SongRepository'
export class SongConflictError extends Error {constructor(){super('Song conflict: changed in another tab')}}
export class SongService {
 readonly repository:SongRepository
 constructor(repository:SongRepository){this.repository=repository}
 list=()=>this.repository.list()
 save=(song:UserSong,expected?:UserSong)=>{if(expected&&JSON.stringify(this.repository.get(song.id))!==JSON.stringify(expected))throw new SongConflictError();this.repository.save(song)}
 /** Serialize cross-tab read/modify/write operations where Web Locks is available. */
 saveAtomic=async(song:UserSong,expected?:UserSong)=>this.withLock(()=>this.save(song,expected))
 /** Re-evaluate a whole batch under the same cross-tab lock and write it once. */
 updateManyAtomic=async<T>(prepare:(current:UserSong[])=>{songs:UserSong[];result:T}):Promise<T>=>{
  let result!:T
  await this.withLock(()=>{const batch=prepare(this.list());if(batch.songs.length)this.repository.saveMany(batch.songs);result=batch.result})
  return result
 }
 remove=(id:string)=>this.repository.remove(id)
 removeAtomic=async(id:string,expected?:UserSong)=>this.withLock(()=>{if(expected&&JSON.stringify(this.repository.get(id))!==JSON.stringify(expected))throw new SongConflictError();this.repository.remove(id)})
 restoreRecoveryAtomic=async()=>this.withLock(()=>this.repository.restoreRecovery())
 private async withLock(action:()=>void):Promise<void>{
  const locks=typeof navigator!=='undefined'?navigator.locks:undefined
  if(locks){
   // Release the lock normally before reporting a synchronous storage failure.
   let failed=false,failure:unknown
   await locks.request('musicmaestro:user-songs',{mode:'exclusive'},()=>{try{action()}catch(error){failed=true;failure=error}})
   if(failed)throw failure
   return
  }
  // Older browsers keep the synchronous local-first behavior. Their tabs cannot
  // provide an atomic shared-storage transaction; supported browsers use Web Locks.
  action()
 }
 subscribe=(cb:()=>void)=>this.repository.subscribe(cb)
 diagnostics=()=>this.repository.diagnostics()
 recovery=()=>this.repository.recovery()
 restoreRecovery=()=>this.repository.restoreRecovery()
}
