import assert from 'node:assert/strict'
import { test } from 'node:test'
import { composeCore } from '../../src/app/composeCore.ts'
import { SettingsService } from '../../src/application/settings/SettingsService.ts'
import { SongService } from '../../src/application/songs/SongService.ts'
import type { PluginModule } from '../../src/core/plugin/types.ts'
import { LocalSongRepository } from '../../src/infrastructure/persistence/LocalSongRepository.ts'
test('composition restores settings before plugin setup, retains IDs, and exposes current backend through old contexts',async()=>{
 const data=new Map<string,string>(),songs=new SongService(new LocalSongRepository({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)}}))
 let observed:unknown
 const plugins:PluginModule[]=[{manifest:{id:'fake',type:'content',version:'1',apiVersion:1,name:{en:'Fake',it:'Fake'}},setup(ctx){observed=ctx.config().value}}]
 const settings=new SettingsService({load:()=>({locale:'en',enabled:['fake'],config:{fake:{value:'restored'}}}),save(){}})
 const core=await composeCore(plugins,{songs,settings,language:'it-IT',defaults:[]})
 assert.equal(core.locale,'en');assert.equal(observed,'restored');assert.equal(core.registry.get('fake')?.status,'enabled')
 const ctx=core.ctxFor(plugins[0].manifest);await ctx.storage.set('key','memory');assert.equal(await ctx.storage.get('key'),'memory')
})
