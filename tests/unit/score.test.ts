import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AppCore } from '../../src/core/plugin/context-impl.ts'
import { validatePiece } from '../../src/core/score-model/utils.ts'
import { piece } from '../fixtures/songs.ts'
test('score validates finite times, MIDI bounds, stable IDs and simultaneous chord notes',()=>{
 const p=piece();assert.deepEqual(validatePiece(p),[])
 assert.deepEqual(validatePiece({...p,notes:[{...p.notes[0],isChord:true},{...p.notes[0],id:'second',pitchMidi:64,isChord:true}]}),[])
 for(const bad of [{...p,tempo:Infinity},{...p,bars:1.2},{...p,notes:[{...p.notes[0],pitchMidi:128}]},{...p,notes:[{...p.notes[0],time:7.9,duration:2}]}])assert.ok(validatePiece(bad).length)
})
test('invalid plugin scores are rejected before changing the clock',()=>{
 const core=new AppCore();core.setPiece({...piece(),duration:NaN});assert.equal(core.score,null);assert.equal(core.scheduler.piece,null);assert.equal(core.notifications[0].level,'error')
})

test('dense notation continuations preserve parsed pitches, ties, duration and barlines', async () => {
 const {scoreToAbc}=await import('../../src/renderers/notation/scoreToAbc.ts')
 const {default:tunebook}=await import('abcjs/src/api/abc_tunebook.js')
 const score={...piece(),bars:1,duration:2,notes:Array.from({length:16},(_,index)=>({id:`dense-${index}`,bar:1,time:index/8,duration:.125,pitchMidi:60+index%8}))}
 interface Element {el_type?:string;duration?:number;pitches?:unknown[]}
 interface Tune {lines?:{staff?:{voices?:Element[][]}[]}[]}
 const notes=(text:string)=>(tunebook.parseOnly(text) as unknown as Tune[])[0].lines?.flatMap(line=>line.staff?.flatMap(staff=>staff.voices?.[0]??[])??[]).filter(element=>element.el_type==='note').map(element=>({duration:element.duration,pitches:element.pitches}))
 const original=scoreToAbc(score),wrapped=scoreToAbc(score,3)
 assert.ok(wrapped.split('\n').length>original.split('\n').length)
 assert.deepEqual(notes(wrapped),notes(original))
 assert.equal(notes(wrapped)?.length,16)
 assert.equal(notes(wrapped)?.reduce((total,note)=>total+(note.duration??0),0),1)
 assert.equal(wrapped.match(/\|/g)?.length,original.match(/\|/g)?.length)
})
