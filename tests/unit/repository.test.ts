import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LocalSongRepository } from '../../src/infrastructure/persistence/LocalSongRepository.ts'
import { song } from '../fixtures/songs.ts'
class Memory {
 data = new Map<string,string>()
 getItem(k:string) { return this.data.get(k) ?? null }
 setItem(k:string,v:string) {this.data.set(k,v)}
}
test('migration preserves legacy ids and verifies backup; restore and unknown version are non-destructive', () => {
 const memory = new Memory(); const raw = JSON.stringify([song(),null]); memory.setItem('mm:user-songs',raw)
 const repo = new LocalSongRepository(memory)
 assert.equal(repo.list()[0].id,'s')
 repo.save({...song(),name:'Updated'})
 assert.equal(memory.getItem('mm:user-songs:recovery'),raw)
 repo.restoreRecovery()
 assert.equal(repo.list()[0].name,'Fixture')
 memory.setItem('mm:user-songs','{"version":999,"songs":[]}')
 assert.throws(() => repo.save(song()),/version/i)
 assert.equal(memory.getItem('mm:user-songs'),'{"version":999,"songs":[]}')
})
test('failed write preserves data and emits no successful subscription', () => {
 const memory = new Memory(); memory.setItem('mm:user-songs',JSON.stringify([song()]))
 const repo = new LocalSongRepository(memory); let calls=0;repo.subscribe(()=>calls++)
 memory.setItem=()=>{throw new DOMException('Full','QuotaExceededError')}
 assert.throws(()=>repo.save({...song(),name:'Lost'}),/quota/i)
 assert.equal(repo.list()[0].name,'Fixture'); assert.equal(calls,0)
})
test('version metadata is written without changing the legacy array contract',()=>{
 const memory=new Memory();const repo=new LocalSongRepository(memory);repo.save(song())
 assert.equal(memory.getItem('mm:user-songs:schema'),'1');assert.ok(Array.isArray(JSON.parse(memory.getItem('mm:user-songs')!)))
 memory.setItem('mm:user-songs:schema','999');assert.throws(()=>repo.save(song()),/version/)
})
test('later valid saves never overwrite the original recovery copy',()=>{
 const memory=new Memory(),raw=JSON.stringify([song(),null]);memory.setItem('mm:user-songs',raw)
 const repo=new LocalSongRepository(memory);repo.save({...song(),name:'First'});repo.save({...song(),name:'Second'})
 assert.equal(repo.recovery(),raw)
})
test('migration failure after verified backup preserves primary and can restart',()=>{
 const memory=new Memory(),raw=JSON.stringify([song()]);memory.setItem('mm:user-songs',raw)
 const original=memory.setItem.bind(memory);memory.setItem=(k,v)=>{if(k==='mm:user-songs:schema')throw new DOMException('Blocked','SecurityError');original(k,v)}
 assert.throws(()=>new LocalSongRepository(memory).save({...song(),name:'Next'}),/denied/)
 assert.equal(memory.getItem('mm:user-songs'),raw);assert.equal(memory.getItem('mm:user-songs:backup'),raw)
 memory.setItem=original;const restarted=new LocalSongRepository(memory);restarted.save({...song(),name:'Next'});assert.equal(restarted.list()[0].name,'Next')
})
test('storage changes synchronize subscribers and unsubscribe detaches notifications',()=>{
 const memory=new Memory(),events=new EventTarget(),repo=new LocalSongRepository(memory,events as unknown as Pick<Window,'addEventListener'>)
 let calls=0;const off=repo.subscribe(()=>calls++)
 memory.setItem('mm:user-songs',JSON.stringify([song()]));events.dispatchEvent(Object.assign(new Event('storage'),{key:'mm:user-songs'}))
 assert.equal(calls,1);assert.equal(repo.list()[0].id,'s');off();events.dispatchEvent(Object.assign(new Event('storage'),{key:null}));assert.equal(calls,1)
})
test('read diagnostics distinguish corrupt, mixed, unknown version and denied storage',()=>{
 const memory=new Memory(),repo=new LocalSongRepository(memory)
 memory.setItem('mm:user-songs','not-json');assert.equal(repo.diagnostics().error,'corrupt')
 memory.setItem('mm:user-songs',JSON.stringify([song(),null]));assert.equal(repo.diagnostics().rejected,1)
 memory.setItem('mm:user-songs','{"version":9,"songs":[]}');assert.equal(repo.diagnostics().error,'version')
 memory.getItem=()=>{throw new DOMException('Denied','SecurityError')};assert.equal(repo.diagnostics().error,'denied')
})
