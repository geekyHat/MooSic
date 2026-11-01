import { inflateSync, Zip, ZipDeflate } from 'fflate'
import { BACKUP_LIMITS, BackupError, parseBackupManifest, type BackupManifest } from '@/domain/backup/backup'
import { crc32 } from '@/infrastructure/olga/readOlgaZip'
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true})
export const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('')
interface ZipMember {name:string;size:number;compressed:number;offset:number;method:number;crc:number}
export async function openBackupZip(file:Blob,signal:AbortSignal) {
  if(file.size>BACKUP_LIMITS.compressed||file.size<22)throw new BackupError('size')
  const tailStart=Math.max(0,file.size-65557),tail=new DataView(await file.slice(tailStart).arrayBuffer())
  let end=-1
  for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50&&i+22+tail.getUint16(i+20,true)===tail.byteLength){end=i;break}
  if(end<0)throw new BackupError('format')
  const count=tail.getUint16(end+10,true),length=tail.getUint32(end+12,true),offset=tail.getUint32(end+16,true)
  if(tail.getUint16(end+4,true)||tail.getUint16(end+6,true)||tail.getUint16(end+8,true)!==count||count>BACKUP_LIMITS.documents+1||length>16*1024*1024||offset+length!==tailStart+end)throw new BackupError('format')
  const directory=new DataView(await file.slice(offset,offset+length).arrayBuffer()),members=new Map<string,ZipMember>()
  let position=0,expanded=0
  for(let i=0;i<count;i++){
    signal.throwIfAborted()
    if(position+46>length||directory.getUint32(position,true)!==0x02014b50)throw new BackupError('corrupt')
    const flags=directory.getUint16(position+8,true),method=directory.getUint16(position+10,true),compressed=directory.getUint32(position+20,true),size=directory.getUint32(position+24,true),nameLength=directory.getUint16(position+28,true),extra=directory.getUint16(position+30,true),comment=directory.getUint16(position+32,true),localOffset=directory.getUint32(position+42,true)
    if(position+46+nameLength+extra+comment>length)throw new BackupError('corrupt')
    const name=decoder.decode(new Uint8Array(directory.buffer,position+46,nameLength))
    if(name!=='manifest.json'&&!/^olga\/\d{6}\.txt$/.test(name)||members.has(name)||flags&1||flags&64||![0,8].includes(method)||size>(name==='manifest.json'?BACKUP_LIMITS.manifest:BACKUP_LIMITS.document)||compressed>BACKUP_LIMITS.manifest+1024||localOffset+30+compressed>offset)throw new BackupError('format')
    expanded+=size;if(expanded>BACKUP_LIMITS.expanded)throw new BackupError('size')
    members.set(name,{name,size,compressed,offset:localOffset,method,crc:directory.getUint32(position+16,true)})
    position+=46+nameLength+extra+comment
  }
  if(position!==length||!members.has('manifest.json'))throw new BackupError('corrupt')
  async function read(name:string):Promise<Uint8Array> {
    signal.throwIfAborted()
    const member=members.get(name);if(!member)throw new BackupError('corrupt')
    const header=new DataView(await file.slice(member.offset,member.offset+30).arrayBuffer())
    if(header.byteLength!==30||header.getUint32(0,true)!==0x04034b50||header.getUint16(6,true)&1||header.getUint16(8,true)!==member.method)throw new BackupError('corrupt')
    const start=member.offset+30+header.getUint16(26,true)+header.getUint16(28,true)
    if(start+member.compressed>offset)throw new BackupError('corrupt')
    const localName=decoder.decode(await file.slice(member.offset+30,member.offset+30+header.getUint16(26,true)).arrayBuffer())
    if(localName!==name)throw new BackupError('corrupt')
    const compressed=new Uint8Array(await file.slice(start,start+member.compressed).arrayBuffer())
    const bytes=member.method===0?compressed:inflateSync(compressed,{out:new Uint8Array(member.size)})
    if(bytes.length!==member.size||crc32(bytes)!==member.crc)throw new BackupError('corrupt')
    return bytes
  }
  let manifest:BackupManifest
  try{manifest=parseBackupManifest(JSON.parse(decoder.decode(await read('manifest.json'))))}catch(error){if(error instanceof BackupError)throw error;throw new BackupError('corrupt')}
  if(members.size!==manifest.documents.length+1||manifest.documents.some(document=>!members.has(document.file)))throw new BackupError('corrupt')
  return {manifest,read}
}
export function createBackupZip() {
  const chunks:BlobPart[]=[]
  let failure:Error|null=null
  const zip=new Zip((error,data)=>{if(error)failure=error;else chunks.push(new Uint8Array(data).buffer)})
  return {
    add(name:string,bytes:Uint8Array){if(failure)throw failure;const entry=new ZipDeflate(name,{level:6});zip.add(entry);entry.push(bytes,true)},
    finish(manifest:BackupManifest){const bytes=encoder.encode(JSON.stringify(manifest));if(bytes.length>BACKUP_LIMITS.manifest)throw new BackupError('size');this.add('manifest.json',bytes);zip.end();if(failure)throw failure;const blob=new Blob(chunks,{type:'application/zip'});if(blob.size>BACKUP_LIMITS.compressed)throw new BackupError('size');return blob},
  }
}
