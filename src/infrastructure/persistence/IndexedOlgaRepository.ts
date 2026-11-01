import type { OlgaRepository } from '@/application/olga/ports'
import type { OlgaEntry } from '@/domain/olga/catalog'

export class IndexedOlgaRepository implements OlgaRepository {
 private db?:Promise<IDBDatabase>
 /** Shared connection for the backup adapter; the existing OLGA schema stays compatible. */
 backupConnection():Promise<IDBDatabase>{return this.open()}
 private open():Promise<IDBDatabase>{
  return this.db??=new Promise((resolve,reject)=>{
   if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB non disponibile su questo dispositivo.'));return}
   const request=indexedDB.open('musicmaestro-olga',1)
   request.onupgradeneeded=()=>{
    request.result.createObjectStore('entries',{keyPath:'id'})
    request.result.createObjectStore('sources',{keyPath:'key'}).createIndex('batch','batch')
   }
   request.onsuccess=()=>{
    const db=request.result;db.onversionchange=()=>db.close()
    // Recover space from imports interrupted by a closed tab, without touching recent imports or committed documents.
    const tx=db.transaction('sources','readwrite'),store=tx.objectStore('sources')
    const cursor=store.index('batch').openKeyCursor(IDBKeyRange.upperBound(`${Date.now()-86400000}-\uffff`))
    cursor.onsuccess=()=>{const row=cursor.result;if(row){store.delete(row.primaryKey);row.continue()}}
    tx.oncomplete=()=>resolve(db);tx.onabort=()=>reject(tx.error)
   }
   request.onerror=()=>reject(request.error)
   request.onblocked=()=>reject(new Error('Chiudi le altre schede di MooSic e riprova.'))
  })
 }
 private async transaction<T>(stores:string[],mode:IDBTransactionMode,run:(tx:IDBTransaction,set:(value:T)=>void)=>void):Promise<T>{
  const db=await this.open()
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(stores,mode);let result:T
   tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error??new Error('Salvataggio OLGA annullato.'));tx.onerror=()=>reject(tx.error)
   try{run(tx,value=>{result=value})}catch(error){tx.abort();reject(error)}
  })
 }
 list():Promise<OlgaEntry[]>{return this.transaction(['entries'],'readonly',(tx,set)=>{tx.objectStore('entries').getAll().onsuccess=e=>set((e.target as IDBRequest<OlgaEntry[]>).result)})}
 stage(batch:string,sources:{key:string;text:string}[]):Promise<void>{return this.transaction(['sources'],'readwrite',tx=>{for(const source of sources)tx.objectStore('sources').put({...source,batch})})}
 commit(entries:OlgaEntry[],batch:string):Promise<void>{
  return this.transaction(['entries','sources'],'readwrite',tx=>{
   for(const entry of entries){tx.objectStore('entries').put(entry);const request=tx.objectStore('sources').get(entry.sourceKey);request.onsuccess=()=>{if(!request.result){tx.abort();return}tx.objectStore('sources').put({...request.result,batch:'committed'})}}
   // Duplicates staged in this batch are not retained.
   const cursor=tx.objectStore('sources').index('batch').openCursor(IDBKeyRange.only(batch))
   const retained=new Set(entries.map(e=>e.sourceKey))
   cursor.onsuccess=()=>{const row=cursor.result;if(row){if(!retained.has(row.primaryKey as string))row.delete();row.continue()}}
  })
 }
 discard(batch:string):Promise<void>{return this.transaction(['sources'],'readwrite',tx=>{
  const cursor=tx.objectStore('sources').index('batch').openCursor(IDBKeyRange.only(batch));cursor.onsuccess=()=>{if(cursor.result){cursor.result.delete();cursor.result.continue()}}
 })}
 equalSources(pairs:[string,string][]):Promise<boolean[]>{
  return this.transaction(['sources'],'readonly',(tx,set)=>{
   const result:boolean[]=Array(pairs.length).fill(false);set(result)
   pairs.forEach(([a,b],index)=>{
    const left=tx.objectStore('sources').get(a),right=tx.objectStore('sources').get(b)
    const compare=()=>{if(left.readyState==='done'&&right.readyState==='done'){
     if(!left.result||!right.result){tx.abort();return}
     result[index]=left.result.text===right.result.text
    }}
    left.onsuccess=compare;right.onsuccess=compare
   })
  })
 }
 source(key:string):Promise<string>{return this.transaction(['sources'],'readonly',(tx,set)=>{const request=tx.objectStore('sources').get(key);request.onsuccess=()=>{if(!request.result){tx.abort();return}set(request.result.text as string)}})}
}
