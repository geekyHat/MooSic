import { gzipSync,gunzipSync,strToU8,strFromU8 } from 'fflate'
export interface PairingCode {version:1;kind:'offer'|'answer';id:string;expires:number;sdp:string;offerHash?:string}
export const PAIRING_LIFETIME=10*60*1000
const PREFIX='MM-SYNC1.',MAX_EXPANDED=24000
export class SyncError extends Error {readonly code:string;constructor(code:string){super(code);this.code=code}}
export async function digest(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('')}
export const descriptionHash=(sdp:string)=>digest(strToU8(sdp))
export function encodePairing(value:PairingCode){const bytes=gzipSync(strToU8(JSON.stringify(value)),{level:9});return PREFIX+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
export function extractPairing(value:string){
 const text=value.trim();if(text.length>20000)throw new SyncError('code')
 if(text.startsWith(PREFIX))return text
 try{const url=new URL(text);if(!['http:','https:'].includes(url.protocol))throw new Error();const code=new URLSearchParams(url.hash.split('?')[1]??'').get('sync');if(!code?.startsWith(PREFIX))throw new Error();return code}catch{throw new SyncError('code')}
}
export function decodePairing(input:string,now=Date.now()):PairingCode{
 try{
   const encoded=extractPairing(input).slice(PREFIX.length)
   if(!/^[a-zA-Z0-9_-]+$/.test(encoded))throw new Error()
   const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))
   if(bytes.length<18||bytes.length>14000)throw new Error()
   const declared=new DataView(bytes.buffer).getUint32(bytes.length-4,true)
   if(declared>MAX_EXPANDED)throw new Error()
   const plain=gunzipSync(bytes,{out:new Uint8Array(declared)})
   if(plain.length!==declared)throw new Error()
   const value:unknown=JSON.parse(strFromU8(plain))
   if(!value||typeof value!=='object'||!('version'in value)||value.version!==1||!('kind'in value)||!['offer','answer'].includes(String(value.kind))||!('id'in value)||typeof value.id!=='string'||!/^[a-f0-9-]{36}$/.test(value.id)||!('expires'in value)||typeof value.expires!=='number'||!Number.isSafeInteger(value.expires)||!('sdp'in value)||typeof value.sdp!=='string'||value.sdp.length>18000||!value.sdp.startsWith('v=0\r\n')||!/^a=fingerprint:sha-256 [A-Fa-f0-9:]+\r?$/m.test(value.sdp))throw new Error()
   if(value.expires<now||value.expires>now+PAIRING_LIFETIME+30000)throw new SyncError('expired')
   if(value.kind==='answer'&&(!('offerHash'in value)||typeof value.offerHash!=='string'||!/^[a-f0-9]{64}$/.test(value.offerHash)))throw new Error()
   return value as PairingCode
 }catch(error){if(error instanceof SyncError)throw error;throw new SyncError('code')}
}
