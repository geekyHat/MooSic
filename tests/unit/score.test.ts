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
