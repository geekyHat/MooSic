import type { ContentArtist } from '@/core/plugin/types';
import { ObservableStore } from '../ObservableStore';
export interface LibrarySnapshot {status:'idle'|'loading'|'ready'|'error';artists:ContentArtist[];errors:string[];revision:number}
export class LibraryService extends ObservableStore<LibrarySnapshot>{
 private generation=0
 private key:number|undefined
 private pending:Promise<LibrarySnapshot>|null=null
 ensure(key:number,load:()=>Promise<{artists:ContentArtist[];errors:string[]}>){if(key===this.key && this.pending)return this.pending;this.key=key;this.pending=this.reload(load);return this.pending}
 constructor(){super({status:'idle',artists:[],errors:[],revision:0})}
 async reload(load:()=>Promise<{artists:ContentArtist[];errors:string[]}>){
  const generation=++this.generation
  this.publish({...this.getSnapshot(),status:'loading'})
  try{const result=await load();if(generation===this.generation)this.publish({...result,status:result.errors.length?'error':'ready',revision:generation})}
  catch(e){if(generation===this.generation)this.publish({...this.getSnapshot(),status:'error',errors:[String(e)],revision:generation})}
  return this.getSnapshot()
 }
}
