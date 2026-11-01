import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateConfig } from '../../src/application/settings/SettingsService.ts'
import { AppCore } from '../../src/core/plugin/context-impl.ts'
import type { TransportPlugin } from '../../src/core/plugin/types.ts'
test('config rejects unknown keys, fractional integers, nonfinite and out of range values',()=>{
 const schema={volume:{type:'integer',min:0,max:10},flag:{type:'boolean'},title:{type:'string'}}
 for(const value of [NaN,Infinity,1.5,-1,11,'2'])assert.throws(()=>validateConfig(schema,'volume',value))
 validateConfig(schema,'volume',5);validateConfig(schema,'flag',false);validateConfig(schema,'title','abc')
 assert.throws(()=>validateConfig(schema,'oops',true))
})
test('concurrent single-active plugins are serialized and config validation is enforced',async()=>{
 Object.assign(globalThis,{localStorage:{getItem:()=>null,setItem:()=>{}}})
 const core=new AppCore()
 const plugin=(id:string):TransportPlugin=>({manifest:{id,type:'transport',name:{it:id,en:id},version:'1',apiVersion:1,config:{schema:{volume:{type:'integer',min:0,max:5}}}},transport:{id,label:{en:id,it:id},start(){},stop(){}},async onEnable(){await Promise.resolve()}})
 core.registry.register(plugin('a'));core.registry.register(plugin('b'))
 await Promise.all([core.enablePlugin('a'),core.enablePlugin('b')]);assert.deepEqual([...core.enabled],['b'])
 assert.throws(()=>core.setConfig('b','volume',9))
})
