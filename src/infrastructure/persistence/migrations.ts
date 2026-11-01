import { SongStorageError } from '@/application/songs/SongRepository';
import { isSong,record } from '@/domain/songs/validation';
/** Read-only migration. Legacy arrays and v1 envelopes preserve the same IDs. */
export function decodeSongPayload(raw:string|null){
 if(!raw)return {songs:[],rejected:0,version:0}
 let value:unknown;try{value=JSON.parse(raw)}catch(e){throw new SongStorageError('corrupt',e)}
 let version=0
 if(record(value)){if(value.version!==1)throw new SongStorageError('version');version=1;value=value.songs}
 if(!Array.isArray(value))throw new SongStorageError('corrupt')
 const songs=value.filter(isSong)
 return {songs,rejected:value.length-songs.length,version}
}
