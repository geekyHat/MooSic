import type { IndexedOlgaRepository } from '@/infrastructure/persistence/IndexedOlgaRepository'
export const LOCAL_BACKUP_KEYS=['mm:user-songs','mm:user-songs:schema','mm:settings'] as const
export interface RestoreJournal {key:'restore';id:string;previous:Record<string,string|null>;next:Record<string,string|null>}
export async function backupLock<T>(action:()=>Promise<T>):Promise<T>{
  return navigator.locks?navigator.locks.request('musicmaestro-backup',action):action()
}
export async function journalDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('musicmaestro-backup-journal',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('journal',{keyPath:'key'})
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
  })
}
export function idbRun<T>(db:IDBDatabase,stores:string[],mode:IDBTransactionMode,action:(tx:IDBTransaction,set:(value:T)=>void)=>void):Promise<T>{
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(stores,mode);let value:T
    tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error??new Error('Backup transaction aborted'));tx.onerror=()=>{}
    try{action(tx,result=>{value=result})}catch(error){tx.abort();reject(error)}
  })
}
export function rollbackLocal(journal:RestoreJournal,storage:Storage){
  for(const key of LOCAL_BACKUP_KEYS)if(key in journal.next&&storage.getItem(key)===journal.next[key]){
    const previous=journal.previous[key]
    if(previous===null)storage.removeItem(key);else storage.setItem(key,previous)
  }
}
/** The OLGA commit receipt and documents commit together; absence means local writes must roll back. */
export async function recoverInterruptedRestore(repository:IndexedOlgaRepository,storage:Storage){
  await backupLock(async()=>{
    const journalDb=await journalDatabase()
    try{
      const journal=await idbRun<RestoreJournal|undefined>(journalDb,['journal'],'readonly',(tx,set)=>{tx.objectStore('journal').get('restore').onsuccess=e=>set((e.target as IDBRequest<RestoreJournal|undefined>).result)})
      if(!journal)return
      if(journal.key!=='restore'||typeof journal.id!=='string'||!journal.previous||!journal.next||Object.values(journal.previous).some(v=>v!==null&&typeof v!=='string')||Object.values(journal.next).some(v=>v!==null&&typeof v!=='string'))throw new Error('Invalid restore journal')
      const db=await repository.backupConnection()
      const committed=await idbRun<boolean>(db,['sources'],'readonly',(tx,set)=>{tx.objectStore('sources').get('backup-commit:'+journal.id).onsuccess=e=>set(!!(e.target as IDBRequest).result)})
      if(!committed)rollbackLocal(journal,storage)
      await idbRun(journalDb,['journal'],'readwrite',tx=>{tx.objectStore('journal').delete('restore')})
      if(committed)await idbRun(db,['sources'],'readwrite',tx=>{tx.objectStore('sources').delete('backup-commit:'+journal.id)})
    }finally{journalDb.close()}
  })
}
