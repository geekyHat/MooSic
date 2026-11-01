import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SongService } from '../../src/application/songs/SongService.ts'
import { LocalSongRepository } from '../../src/infrastructure/persistence/LocalSongRepository.ts'
import { song } from '../fixtures/songs.ts'
test('optimistic save detects external changes and preserves the newer record',()=>{
 const data=new Map<string,string>(),repo=new LocalSongRepository({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)}}),service=new SongService(repo)
 service.save(song());const original=service.list()[0];service.save({...original,name:'Other tab'})
 assert.throws(()=>service.save({...original,name:'Draft'},original),/conflict/i)
 assert.equal(service.list()[0].name,'Other tab')
})
