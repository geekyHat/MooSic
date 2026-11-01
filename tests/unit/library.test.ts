import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LibraryService } from '../../src/application/library/LibraryService.ts'
import type { ContentArtist } from '../../src/core/plugin/types.ts'
import { filterLibrary } from '../../src/features/library/model/filterLibrary.ts'
test('combined filters match one song and include missing metadata',()=>{
 const artists:ContentArtist[]=[{meta:{id:'a',name:'Artist'},songs:[{meta:{id:'s',title:'Song',tags:['tag'],genre:'Rock'},versions:[]},{meta:{id:'t',title:'Other',composer:'Writer'},versions:[]}]}]
 assert.equal(filterLibrary(artists,{search:'tag',composer:'—',genre:'Rock'})[0].songs[0].meta.id,'s')
 assert.equal(filterLibrary(artists,{search:'Other',composer:'—',genre:'Rock'}).length,0)
})
test('ensure coalesces StrictMode requests but explicit reload still reloads',async()=>{
 const service=new LibraryService();let loads=0
 const load=async()=>{loads++;return {artists:[],errors:[]}}
 await Promise.all([service.ensure(1,load),service.ensure(1,load)])
 assert.equal(loads,1);await service.ensure(2,load);assert.equal(loads,2)
})
