import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AppCore } from '../../src/core/plugin/context-impl.ts'
import type { ContentPlugin } from '../../src/core/plugin/types.ts'
import { piece } from '../fixtures/songs.ts'
test('toast and language do not rebuild catalog; deleting active song clears score',async()=>{
 const core=new AppCore();let loads=0,exists=true
 const cp:ContentPlugin={manifest:{id:'content-test',type:'content',name:{it:'Test',en:'Test'},version:'1',apiVersion:1},async artists(){loads++;return exists?[{meta:{id:'a',name:'A'},songs:[{meta:{id:'s',title:'Song'},versions:[{id:'v',name:'V',arrangements:[{kind:'tabs',file:'a'}]}]}]}]:[]},file:()=>undefined,buildPiece:()=>piece()}
 core.registry.register(cp);await core.enablePlugin('content-test');await core.ensureLibrary();assert.equal(loads,1)
 core.notify('info','hello');core.setLocale('en');await core.ensureLibrary();assert.equal(loads,1)
 core.openSong('s','v');assert.ok(core.score);exists=false;await core.reloadLibrary();assert.equal(core.score,null);assert.equal(core.currentSongId,null)
})
test('notification changes preserve shell snapshot identity while legacy subscribers still receive updates',()=>{
 const core=new AppCore();let calls=0;const off=core.subscribe(()=>calls++),snapshot=core.getSnapshot()
 core.notify('ok','Saved');assert.equal(core.getSnapshot(),snapshot);assert.equal(calls,1);off()
})
