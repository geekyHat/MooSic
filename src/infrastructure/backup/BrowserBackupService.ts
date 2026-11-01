import type { BackupOptions, BackupPreview, BackupService, RestoreResult } from '@/application/backup/BackupService'
import { mergeBackupSongs } from '@/application/backup/mergeSongs'
import type { SongService } from '@/application/songs/SongService'
import { BACKUP_LIMITS, BackupError, parseBackupManifest, validPreferences, type BackupManifest, type BackupPreferences } from '@/domain/backup/backup'
import { olgaIdentity, type OlgaEntry } from '@/domain/olga/catalog'
import { artistKey } from '@/domain/songs/artists'
import type { IndexedOlgaRepository } from '@/infrastructure/persistence/IndexedOlgaRepository'
import { createBackupZip, openBackupZip, sha256 } from './backupZip'
import { backupLock,idbRun,journalDatabase,LOCAL_BACKUP_KEYS,rollbackLocal,type RestoreJournal } from './restoreJournal'

interface Dependencies {songs:SongService;olga:IndexedOlgaRepository;preferences:()=>BackupPreferences;afterRestore:()=>Promise<void>}
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true})
async function libraryLocks<T>(action:()=>Promise<T>):Promise<T>{
  return backupLock(()=>navigator.locks?navigator.locks.request('musicmaestro:user-songs',()=>navigator.locks.request('musicmaestro-olga-import',action)):action())
}
export class BrowserBackupService implements BackupService {
  busy=false
  private dependencies:Dependencies
  private prepared:{file:File;manifest:BackupManifest;token:string}|null=null
  constructor(dependencies:Dependencies){this.dependencies=dependencies}
  discard=()=>{this.prepared=null}
  private async run<T>(action:()=>Promise<T>):Promise<T>{
    if(this.busy)throw new BackupError('busy')
    this.busy=true
    try{return await action()}catch(error){if(error instanceof BackupError||error instanceof DOMException&&error.name==='AbortError')throw error;throw new BackupError('storage')}
    finally{this.busy=false}
  }
  private sources(keys:string[]):Promise<string[]>{
    return this.dependencies.olga.backupConnection().then(db=>idbRun<string[]>(db,['sources'],'readonly',(tx,set)=>{
      const sources:string[]=Array(keys.length);set(sources)
      keys.forEach((key,index)=>{tx.objectStore('sources').get(key).onsuccess=e=>{const value=(e.target as IDBRequest<{text:string}|undefined>).result;if(!value||typeof value.text!=='string'){tx.abort();return}sources[index]=value.text}})
    }))
  }
  export=(options:BackupOptions)=>this.run(()=>libraryLocks(async()=>{
    const {songs,olga,preferences}=this.dependencies
    if(songs.diagnostics().error||songs.diagnostics().rejected)throw new BackupError('corrupt')
    const entries=await olga.list(),manifest:BackupManifest={format:'musicmaestro-backup',version:1,createdAt:new Date().toISOString(),songs:songs.list(),preferences:preferences(),documents:[]}
    if(entries.length>BACKUP_LIMITS.documents||!validPreferences(manifest.preferences))throw new BackupError('size')
    const zip=createBackupZip();let expanded=0
    for(let start=0;start<entries.length;start+=50){
      const batch=entries.slice(start,start+50),sources=await this.sources(batch.map(entry=>entry.sourceKey))
      for(const [index,entry] of batch.entries()){
        options.signal.throwIfAborted()
        const bytes=encoder.encode(sources[index]),file=`olga/${String(start+index).padStart(6,'0')}.txt`
        expanded+=bytes.length
        if(bytes.length>BACKUP_LIMITS.document||expanded>BACKUP_LIMITS.expanded-BACKUP_LIMITS.manifest)throw new BackupError('size')
        manifest.documents.push({entry,file,sha256:await sha256(bytes)});zip.add(file,bytes)
        options.progress({phase:'export',completed:start+index+1,total:entries.length})
      }
    }
    options.signal.throwIfAborted();parseBackupManifest(manifest)
    return zip.finish(manifest)
  }))
  prepare=(file:File,options:BackupOptions)=>this.run(async()=>{
    this.prepared=null
    let archive:Awaited<ReturnType<typeof openBackupZip>>
    try{archive=await openBackupZip(file,options.signal)}catch(error){if(error instanceof BackupError)throw error;throw new BackupError('corrupt')}
    for(const [index,document] of archive.manifest.documents.entries()){
      options.signal.throwIfAborted()
      try{const bytes=await archive.read(document.file);decoder.decode(bytes);if(await sha256(bytes)!==document.sha256)throw new BackupError('corrupt')}catch(error){if(options.signal.aborted)throw error;throw new BackupError('corrupt')}
      options.progress({phase:'verify',completed:index+1,total:archive.manifest.documents.length})
    }
    const token=crypto.randomUUID();this.prepared={file,manifest:archive.manifest,token}
    return {token,createdAt:archive.manifest.createdAt,songs:archive.manifest.songs.length,documents:archive.manifest.documents.length,hasPreferences:!!archive.manifest.preferences} satisfies BackupPreview
  })
  restore=(token:string,preferences:boolean,options:BackupOptions)=>this.run(()=>libraryLocks(async()=>{
    const prepared=this.prepared
    if(!prepared||prepared.token!==token)throw new BackupError('changed')
    const {olga,songs}=this.dependencies
    if(songs.diagnostics().error||songs.diagnostics().rejected)throw new BackupError('corrupt')
    const archive=await openBackupZip(prepared.file,options.signal),batch=`${Date.now()}-backup-${crypto.randomUUID()}`
    const staged:OlgaEntry[]=[],oldEntries=await olga.list(),ids=new Set(oldEntries.map(entry=>entry.id))
    try{
      for(let start=0;start<archive.manifest.documents.length;start+=50){
        const sources:{key:string;text:string}[]=[]
        for(const [index,document] of archive.manifest.documents.slice(start,start+50).entries()){
          options.signal.throwIfAborted()
          const text=decoder.decode(await archive.read(document.file)),sourceKey=`${batch}/${start+index}`
          let id=document.entry.id
          while(ids.has(id))id='olga-'+crypto.randomUUID()
          ids.add(id);staged.push({...document.entry,id,sourceKey});sources.push({key:sourceKey,text})
        }
        await olga.stage(batch,sources)
        options.progress({phase:'restore',completed:Math.min(start+50,archive.manifest.documents.length),total:archive.manifest.documents.length})
      }
      options.signal.throwIfAborted()
      const identities=new Map(oldEntries.map(entry=>[olgaIdentity(entry),entry])),comparisons:{entry:OlgaEntry;prior:OlgaEntry}[]=[]
      for(const entry of staged){const prior=identities.get(olgaIdentity(entry));if(prior)comparisons.push({entry,prior});else identities.set(olgaIdentity(entry),entry)}
      const duplicates=new Set<string>()
      for(let start=0;start<comparisons.length;start+=250){
        options.signal.throwIfAborted()
        const subset=comparisons.slice(start,start+250),equal=await olga.equalSources(subset.map(({entry,prior})=>[entry.sourceKey,prior.sourceKey]))
        equal.forEach((same,index)=>{if(same)duplicates.add(subset[index].entry.sourceKey)})
      }
      const retained=staged.filter(entry=>!duplicates.has(entry.sourceKey)),occupied=new Set([...oldEntries.map(entry=>JSON.stringify([artistKey(entry.artist),artistKey(entry.title)])),...songs.list().map(song=>JSON.stringify([artistKey(song.artist),artistKey(song.name)]))])
      for(const entry of retained){const original=entry.title;let count=1;while(occupied.has(JSON.stringify([artistKey(entry.artist),artistKey(entry.title)])))entry.title=`${original.replace(/\s+\(\d+\)$/,'')} (${count++})`;occupied.add(JSON.stringify([artistKey(entry.artist),artistKey(entry.title)]))}
      const merge=mergeBackupSongs(archive.manifest.songs,songs.list(),[...oldEntries,...retained].map(entry=>({artist:entry.artist,title:entry.title})))
      const previous:Record<string,string|null>={},next:Record<string,string|null>={}
      for(const key of LOCAL_BACKUP_KEYS){if(key==='mm:settings'&&!preferences)continue;previous[key]=localStorage.getItem(key);next[key]=previous[key]}
      if(merge.added){next['mm:user-songs']=JSON.stringify(merge.songs);next['mm:user-songs:schema']='1'}
      if(preferences&&archive.manifest.preferences)next['mm:settings']=JSON.stringify(archive.manifest.preferences)
      options.signal.throwIfAborted()
      await this.commit(retained,batch,{key:'restore',id:batch,previous,next})
      this.prepared=null
      await this.dependencies.afterRestore().catch(()=>{})
      return {songsAdded:merge.added,songsSkipped:merge.skipped,documentsAdded:retained.length,documentsSkipped:duplicates.size} satisfies RestoreResult
    }catch(error){await olga.discard(batch).catch(()=>{});throw error}
  }))
  private async commit(entries:OlgaEntry[],batch:string,journal:RestoreJournal){
    const db=await this.dependencies.olga.backupConnection(),journalDb=await journalDatabase()
    try{
      await idbRun(journalDb,['journal'],'readwrite',tx=>{tx.objectStore('journal').put(journal)})
      try{
        await new Promise<void>((resolve,reject)=>{
          const tx=db.transaction(['entries','sources'],'readwrite'),sources=tx.objectStore('sources');let failure:unknown
          const fail=(error:unknown)=>{failure=error;tx.abort()}
          tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure??tx.error??new BackupError('storage'));tx.onerror=()=>{}
          for(const entry of entries){tx.objectStore('entries').put(entry);sources.get(entry.sourceKey).onsuccess=e=>{const source=(e.target as IDBRequest).result;if(!source){fail(new BackupError('corrupt'));return}sources.put({...source,batch:'committed'})}}
          const retained=new Set(entries.map(entry=>entry.sourceKey)),cursor=sources.index('batch').openCursor(IDBKeyRange.only(batch))
          cursor.onsuccess=()=>{const item=cursor.result;if(item){if(!retained.has(String(item.primaryKey)))item.delete();item.continue()}}
          sources.put({key:'backup-commit:'+journal.id,batch:'backup-commit',text:'committed'})
          tx.objectStore('entries').count().onsuccess=()=>{
            try{
              for(const key of Object.keys(journal.next))if(localStorage.getItem(key)!==journal.previous[key])throw new BackupError('changed')
              for(const [key,value] of Object.entries(journal.next))if(value!==journal.previous[key]){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}
            }catch(error){fail(error)}
          }
        })
      }catch(error){rollbackLocal(journal,localStorage);await idbRun(journalDb,['journal'],'readwrite',tx=>{tx.objectStore('journal').delete('restore')});throw error}
      // Once committed, cleanup failure is deferred to startup recovery. Keep the receipt
      // until the journal has been removed so a completed restore cannot be rolled back.
      try{
        await idbRun(journalDb,['journal'],'readwrite',tx=>{tx.objectStore('journal').delete('restore')})
        await idbRun(db,['sources'],'readwrite',tx=>{tx.objectStore('sources').delete('backup-commit:'+journal.id)})
      }catch{/* The durable commit already succeeded. */}
    }finally{journalDb.close()}
  }
}
