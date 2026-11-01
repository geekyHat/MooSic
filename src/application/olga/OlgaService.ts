import { artistKey,resolveArtist,type ArtistLink } from '@/domain/songs/artists'
import { artistWords,describeOlga,olgaIdentity,similarOlgaArtist,type OlgaEntry } from '@/domain/olga/catalog'
import type { OlgaProgress,OlgaRepository,ReadOlgaZip } from './ports'

export interface ArtistReview {name:string;target:string;suggestions:string[];count:number;confirmed:boolean}
interface Snapshot {
 status:'idle'|'scanning'|'review'|'saving'|'done'|'error';progress:OlgaProgress;reviews:ArtistReview[]
 scanned:number;added:number;duplicates:number;renamed:number;error:string
}
const initial=():Snapshot=>({status:'idle',progress:{bytes:0,total:0,files:0,skipped:0},reviews:[],scanned:0,added:0,duplicates:0,renamed:0,error:''})
export class OlgaService {
 entries:OlgaEntry[]=[]
 private snapshot=initial()
 private listeners=new Set<()=>void>()
 private catalogListeners=new Set<()=>void>()
 private pending:OlgaEntry[]=[]
 private batch=''
 private controller?:AbortController
 private repository:OlgaRepository
 private readZip:ReadOlgaZip
 constructor(repository:OlgaRepository,readZip:ReadOlgaZip){this.repository=repository;this.readZip=readZip}
 getSnapshot=()=>this.snapshot
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener)}
 onCatalog(listener:()=>void){this.catalogListeners.add(listener);return()=>this.catalogListeners.delete(listener)}
 private publish(patch:Partial<Snapshot>){this.snapshot={...this.snapshot,...patch};for(const listener of this.listeners)listener()}
 async initialize(){this.entries=await this.repository.list()}
 async prepare(file:File,knownArtists:string[],links:ArtistLink[]=[]){
  if(['scanning','review','saving'].includes(this.snapshot.status))throw new Error('Importazione già in corso.')
  this.controller=new AbortController();this.batch=`${Date.now()}-${Math.random().toString(36).slice(2)}`;this.pending=[]
  this.snapshot=initial();this.publish({status:'scanning'})
  try{
   if(!/\.zip$/i.test(file.name))throw new Error('Seleziona OLGA Archive.zip.')
   let ordinal=0
   for await(const sources of this.readZip(file,this.controller.signal,progress=>this.publish({progress}))){
    const staged:{key:string;text:string}[]=[]
    for(const source of sources){
     const entry=describeOlga(source);if(!entry)continue
     entry.id=`olga-${this.batch}-${ordinal++}`;entry.sourceKey=entry.id
     this.pending.push(entry);staged.push({key:entry.sourceKey,text:source.text})
    }
    await this.repository.stage(this.batch,staged)
   }
   this.controller.signal.throwIfAborted()
   if(!this.pending.length)throw new Error('Nessun documento musicale leggibile trovato.')
   // Folder identity, confirmed aliases and exactly equal word sets reconcile names, including surname/first-name reversal.
   const folders=new Map(this.entries.map(e=>[e.artistFolder,e.artist]))
   const names=new Map<string,string>()
   for(const name of [...knownArtists,...this.entries.map(e=>e.artist)])names.set(artistWords(name),name)
   for(const entry of this.pending){const resolved=resolveArtist(entry.artist,links);entry.artist=folders.get(entry.artistFolder)??names.get(artistWords(resolved))??resolved;names.set(artistWords(entry.artist),entry.artist)}
   const counts=new Map<string,number>();for(const entry of this.pending)counts.set(entry.artist,(counts.get(entry.artist)??0)+1)
   const existing=new Set([...knownArtists,...this.entries.map(e=>e.artist)].map(artistKey))
   const all=[...new Set([...knownArtists,...counts.keys()])]
   const tokens=new Map<string,Set<string>>()
   const signatures=(word:string)=>word.length<5?[]:[word,...Array.from({length:word.length},(_,i)=>word.slice(0,i)+word.slice(i+1))]
   for(const name of all)for(const word of artistWords(name).split(' '))for(const signature of signatures(word)){
    const candidates=tokens.get(signature)??new Set<string>();candidates.add(name);tokens.set(signature,candidates)
   }
   const reviews:ArtistReview[]=[]
   for(const [name,count] of counts){
    if(existing.has(artistKey(name)))continue
    const suggestions=[...new Set(artistWords(name).split(' ').flatMap(word=>signatures(word).flatMap(signature=>[...(tokens.get(signature)??[])])))].filter(other=>artistKey(other)!==artistKey(name)&&similarOlgaArtist(name,other)).slice(0,8)
    if(suggestions.length||/^(unknown|various|misc|miscellaneous|traditional|anon|anonymous|sconosciuto)$/i.test(name))reviews.push({name,target:name,suggestions,count,confirmed:false})
   }
   this.publish({status:'review',scanned:this.pending.length,reviews})
  }catch(error){await this.repository.discard(this.batch).catch(()=>{});this.pending=[];this.publish({status:'error',error:this.controller.signal.aborted?'Importazione annullata.':String(error instanceof Error?error.message:error)})}
 }
 review(name:string,target:string,confirmed:boolean){this.publish({reviews:this.snapshot.reviews.map(row=>row.name===name?{...row,target,confirmed}:row)})}
 async cancel(){
  if(this.snapshot.status==='saving')return
  if(this.snapshot.status==='scanning'){this.controller?.abort();return}
  await this.repository.discard(this.batch);this.pending=[];this.publish(initial())
 }
 async commit(knownTitles:{artist:string;title:string}[]=[]){
  if(this.snapshot.status!=='review')return
  if(this.snapshot.reviews.some(row=>!row.confirmed||!row.target.trim()))throw new Error('Conferma gli artisti da verificare.')
  this.publish({status:'saving'})
  try{
   const save=async()=>{
    const current=await this.repository.list(),byIdentity=new Map<string,OlgaEntry[]>(),occupied=new Map<string,Set<string>>()
    const reserve=(artist:string,title:string)=>{const key=artistKey(artist),set=occupied.get(key)??new Set<string>();set.add(artistKey(title));occupied.set(key,set)}
    for(const song of [...knownTitles,...current])reserve(song.artist,song.title)
    for(const entry of current){const key=olgaIdentity(entry),list=byIdentity.get(key)??[];list.push(entry);byIdentity.set(key,list)}
    const mappings=new Map(this.snapshot.reviews.filter(r=>artistKey(r.name)!==artistKey(r.target)).map(r=>[artistKey(r.name),r.target.trim().replace(/\s+/g,' ')]))
    const canonical=new Map(current.map(e=>[artistKey(e.artist),e.artist]))
    const mappedEntries=this.pending.map(original=>{
     const entry={...original};let mapped=entry.artist;const seen=new Set<string>()
     while(mappings.has(artistKey(mapped))&&!seen.has(artistKey(mapped))){seen.add(artistKey(mapped));mapped=mappings.get(artistKey(mapped))!}
     if(seen.has(artistKey(mapped)))throw new Error('Associazioni artisti circolari: scegli un unico nome finale.')
     entry.artist=canonical.get(artistKey(mapped))??mapped;canonical.set(artistKey(entry.artist),entry.artist)
     return entry
    })
    // Compare existing documents in bounded transactions rather than two transactions per file.
    const equalExisting=new Set<string>()
    for(let start=0;start<mappedEntries.length;start+=250){
     const candidates=mappedEntries.slice(start,start+250).flatMap(entry=>{const match=byIdentity.get(olgaIdentity(entry))?.[0];return match?[{entry,match}]:[]})
     if(candidates.length){const results=await this.repository.equalSources(candidates.map(({entry,match})=>[entry.sourceKey,match.sourceKey]));results.forEach((equal,i)=>{if(equal)equalExisting.add(candidates[i].entry.sourceKey)})}
    }
    const added:OlgaEntry[]=[];let duplicates=0,renamed=0,processed=0
    for(const entry of mappedEntries){
     if(equalExisting.has(entry.sourceKey)){duplicates++;continue}
     const key=olgaIdentity(entry),matches=byIdentity.get(key)??[]
     let identical=false
     if(matches.length){const text=await this.repository.source(entry.sourceKey);for(const match of matches)if(text===await this.repository.source(match.sourceKey)){identical=true;break}}
     if(identical){duplicates++;continue}
     const titles=occupied.get(artistKey(entry.artist))??new Set<string>()
     let suffix=1;while(titles.has(artistKey(entry.title)))entry.title=`${entry.baseTitle} (${suffix++})`
     if(entry.title!==entry.baseTitle)renamed++
     reserve(entry.artist,entry.title);added.push(entry);matches.push(entry);byIdentity.set(key,matches)
     if(++processed%250===0){this.publish({added:added.length,duplicates,renamed});await new Promise(resolve=>setTimeout(resolve,0))}
    }
    await this.repository.commit(added,this.batch)
    this.entries=[...current,...added];this.pending=[]
    this.publish({status:'done',added:added.length,duplicates,renamed})
    for(const listener of this.catalogListeners)listener()
   }
   if(typeof navigator!=='undefined'&&navigator.locks){let failure:unknown;await navigator.locks.request('musicmaestro-olga-import',async()=>{try{await save()}catch(error){failure=error}});if(failure)throw failure}else await save()
  }catch(error){await this.repository.discard(this.batch).catch(()=>{});this.pending=[];this.publish({status:'error',error:`Salvataggio non riuscito; la libreria precedente è conservata. ${error instanceof Error?error.message:String(error)}`})}
 }
 source(key:string){return this.repository.source(key)}
}
