import test from 'node:test'
import assert from 'node:assert/strict'
import {syncInvitation} from '../../src/infrastructure/sync/invitation.ts'
import {encodePairing,PAIRING_LIFETIME} from '../../src/infrastructure/sync/pairingCode.ts'

const code=(expires=Date.now()+PAIRING_LIFETIME)=>encodePairing({version:1,kind:'offer',id:crypto.randomUUID(),expires,sdp:'v=0\r\na=fingerprint:sha-256 AA:BB:CC:DD\r\n'})
function browser(hash:string,local=new Map<string,string>(),session=new Map<string,string>()){
 const storage=(map:Map<string,string>)=>({getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>map.set(key,value),removeItem:(key:string)=>map.delete(key)})
 return {location:{hash},localStorage:storage(local),sessionStorage:storage(session)} as unknown as Window
}
test('an offer survives installation into a new window with shared local storage and resumes only at the root',async()=>{
 const invitation=code(),local=new Map<string,string>(),first=await syncInvitation(browser('#/settings?sync='+invitation,local))
 assert.equal(first.code,invitation);assert.equal(first.resume,false)
 const installed=await syncInvitation(browser('',local));assert.equal(installed.code,invitation);assert.equal(installed.resume,true)
 assert.equal((await syncInvitation(browser('#/editor',local))).resume,false)
 installed.clear();assert.equal((await syncInvitation(browser('',local))).code,'')
})
test('expired and malformed stored invitations are removed without redirecting the next launch',async()=>{
 for(const invitation of [code(Date.now()-100),'invalid']){
  const local=new Map([['mm:pending-sync',JSON.stringify({version:1,code:invitation,expires:Date.now()+PAIRING_LIFETIME})]])
  const result=await syncInvitation(browser('',local));assert.equal(result.code,'');assert.equal(result.resume,false);assert.equal(local.size,0)
 }
 const local=new Map<string,string>();await syncInvitation(browser('#/settings?sync='+code(),local))
 const explicitInvalid=await syncInvitation(browser('#/settings?sync=invalid',local));assert.equal(explicitInvalid.code,'invalid');assert.equal(local.size,0)
})
test('an isolated installation can resume by reusing the link; unavailable storage still permits pairing',async()=>{
 const invitation=code(),isolated=browser('#/settings?sync='+invitation)
 Object.defineProperties(isolated,{localStorage:{get(){throw new Error('denied')}},sessionStorage:{get(){throw new Error('denied')}}})
 const result=await syncInvitation(isolated);assert.equal(result.code,invitation);result.clear()
 assert.equal((await syncInvitation(browser(''))).code,'')
})
