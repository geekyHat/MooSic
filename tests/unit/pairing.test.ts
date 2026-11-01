import test from 'node:test'
import assert from 'node:assert/strict'
import {encodePairing,decodePairing,extractPairing,descriptionHash,PAIRING_LIFETIME} from '../../src/infrastructure/sync/pairingCode.ts'
import {LazyPeerSyncService} from '../../src/application/sync/LazyPeerSyncService.ts'
import {initialSync,type PeerSyncService} from '../../src/application/sync/PeerSyncService.ts'
const offer=()=>({version:1 as const,kind:'offer' as const,id:crypto.randomUUID(),expires:Date.now()+PAIRING_LIFETIME,sdp:'v=0\r\na=fingerprint:sha-256 AA:BB:CC:DD\r\n'})
test('pairing QR/code and fragment URL roundtrip without sending library data',()=>{
 const value=offer(),code=encodePairing(value),url='https://example.invalid/MooSic/#/settings?sync='+code
 assert.deepEqual(decodePairing(code),value);assert.deepEqual(decodePairing(url),value);assert.equal(new URL(url).search,'');assert.equal(extractPairing(url),code)
 assert.throws(()=>decodePairing('not a code'));assert.throws(()=>decodePairing('MM-SYNC1.'+'A'.repeat(20001)))
})
test('expired codes, missing fingerprints, invalid versions and unbound answers are rejected',async()=>{
 const value=offer();assert.throws(()=>decodePairing(encodePairing({...value,expires:Date.now()-1})),/expired/)
 assert.throws(()=>decodePairing(encodePairing({...value,sdp:'v=0\r\n'})),/code/)
 assert.throws(()=>decodePairing(encodePairing({...value,kind:'answer'})),/code/)
 const reply={...value,kind:'answer' as const,offerHash:await descriptionHash(value.sdp)};assert.deepEqual(decodePairing(encodePairing(reply)),reply)
 assert.notEqual(await descriptionHash(value.sdp),await descriptionHash(value.sdp+'a=candidate:1\r\n'))
})
test('cancelling a pairing during lazy loading cannot start a late connection',async()=>{
 let loaded!:(service:PeerSyncService)=>void,started=0
 const fake:PeerSyncService={busy:false,getSnapshot:()=>initialSync(true),subscribe:()=>()=>{},createOffer:async()=>{started++},acceptCode:async()=>{},confirm:async()=>{},restore:async()=>{},cancel:()=>{}}
 const service=new LazyPeerSyncService(true,'',()=>new Promise(resolve=>{loaded=resolve}),()=>{})
 const pending=service.createOffer();service.cancel();loaded(fake);await pending
 assert.equal(started,0);assert.equal(service.getSnapshot().phase,'idle');await service.createOffer();assert.equal(started,1)
})
