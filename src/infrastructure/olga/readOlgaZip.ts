import { inflateSync } from 'fflate'
import type { ReadOlgaZip } from '@/application/olga/ports'
import { olgaPath,type OlgaSource } from '@/domain/olga/catalog'

const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0})
export function crc32(bytes:Uint8Array):number {let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
const utf8=new TextDecoder('utf-8',{fatal:true})
function decode(bytes:Uint8Array):string {try{return utf8.decode(bytes)}catch{return new TextDecoder('windows-1252').decode(bytes)}}
// Two independent 32-bit accumulators plus byte length. Exact source equality is checked before deduplication.
export function sourceDigest(text:string):string {
 let a=2166136261,b=5381;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c}return `${text.length}-${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`
}
interface ZipEntry {path:string;size:number;compressed:number;offset:number;method:number;crc:number}
export const readOlgaZip:ReadOlgaZip=async function* (file,signal,onProgress){
 if(file.size>256*1024*1024)throw new Error('ZIP troppo grande (massimo 256 MB).')
 const tailOffset=Math.max(0,file.size-65557),tail=new DataView(await file.slice(tailOffset).arrayBuffer())
 let end=-1
 for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50&&i+22+tail.getUint16(i+20,true)===tail.byteLength){end=i;break}
 if(end<0)throw new Error('ZIP non valido o incompleto.')
 const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),offset=tail.getUint32(end+16,true)
 if(tail.getUint16(end+4,true)||tail.getUint16(end+6,true)||count===65535||size===0xffffffff||offset===0xffffffff)throw new Error('ZIP64 e ZIP suddivisi non supportati.')
 if(count>60000||size>16*1024*1024||offset+size!==tailOffset+end)throw new Error('Indice ZIP non valido o troppo grande.')
 const directory=new DataView(await file.slice(offset,offset+size).arrayBuffer()),entries:ZipEntry[]=[]
 let pos=0,expanded=0,skipped=0
 for(let n=0;n<count;n++){
  signal.throwIfAborted()
  if(pos+46>size||directory.getUint32(pos,true)!==0x02014b50)throw new Error('Indice ZIP danneggiato.')
  const flags=directory.getUint16(pos+8,true),method=directory.getUint16(pos+10,true),compressed=directory.getUint32(pos+20,true),length=directory.getUint32(pos+24,true),nameLen=directory.getUint16(pos+28,true),extra=directory.getUint16(pos+30,true),comment=directory.getUint16(pos+32,true),localOffset=directory.getUint32(pos+42,true)
  const next=pos+46+nameLen+extra+comment
  if(next>size)throw new Error('Indice ZIP troncato.')
  const path=decode(new Uint8Array(directory.buffer,pos+46,nameLen))
  const accepted=olgaPath(path)
  if(accepted){
   if(flags&1||![0,8].includes(method))throw new Error('File ZIP cifrato o compressione non supportata.')
   if(length>2*1024*1024||compressed>4*1024*1024||localOffset+30+compressed>offset)throw new Error('Dimensione file ZIP non consentita.')
   expanded+=length;if(expanded>512*1024*1024)throw new Error('Archivio espanso troppo grande.')
   entries.push({path,size:length,compressed,offset:localOffset,method,crc:directory.getUint32(pos+16,true)})
  }else skipped++
  pos=next
 }
 if(pos!==size||!entries.length)throw new Error('Nessun documento OLGA riconosciuto nello ZIP.')
 entries.sort((a,b)=>a.offset-b.offset)
 let cache=new Uint8Array(),cacheOffset=-1,files=0,batch:OlgaSource[]=[]
 async function read(start:number,length:number):Promise<Uint8Array>{
  if(start<0||start+length>offset)throw new Error('Dati ZIP troncati.')
  if(start<cacheOffset||start+length>cacheOffset+cache.length){cacheOffset=start;cache=new Uint8Array(await file.slice(start,Math.min(offset,start+Math.max(4*1024*1024,length))).arrayBuffer())}
  return cache.subarray(start-cacheOffset,start-cacheOffset+length)
 }
 for(const entry of entries){
  signal.throwIfAborted()
  const header=new DataView((await read(entry.offset,30)).slice().buffer)
  if(header.getUint32(0,true)!==0x04034b50||header.getUint16(6,true)&1||header.getUint16(8,true)!==entry.method)throw new Error('Intestazione ZIP non valida.')
  const start=entry.offset+30+header.getUint16(26,true)+header.getUint16(28,true)
  const compressed=await read(start,entry.compressed)
  // Fixed output allocation prevents malformed deflate data from allocating unbounded memory.
  const bytes=entry.method===0?compressed:inflateSync(compressed,{out:new Uint8Array(entry.size)})
  if(bytes.length!==entry.size||crc32(bytes)!==entry.crc)throw new Error(`File ZIP danneggiato: ${entry.path}`)
  const text=decode(bytes).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')
  batch.push({path:entry.path,text,digest:sourceDigest(text)})
  files++
  if(batch.length===50){onProgress({bytes:start+entry.compressed,total:file.size,files,skipped});yield batch;batch=[];await new Promise(resolve=>setTimeout(resolve,0))}
 }
 if(batch.length)yield batch
 onProgress({bytes:file.size,total:file.size,files,skipped})
}
