/** Compatibility facade. Bootstrap injects the one repository-backed service. */
import type { SongService } from '@/application/songs/SongService'
import type { UserSong } from '@/domain/songs/types'
export { makeId } from '@/domain/songs/ids'
export * from '@/domain/songs/types'
let service:SongService|undefined
export function configureSongService(value:SongService){service=value}
function current(){if(!service)throw new Error('SongService has not been configured');return service}
export const loadUserSongs=()=>current().list()
export const saveUserSong=(song:UserSong)=>current().save(song)
export const removeUserSong=(id:string)=>current().remove(id)
export const subscribeUserSongs=(cb:()=>void)=>current().subscribe(cb)
