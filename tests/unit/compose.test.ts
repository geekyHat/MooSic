import assert from 'node:assert/strict'
import { test } from 'node:test'
import { composeArrangements } from '../../src/features/editor/model/arrangementValidation.ts'
test('multi selection is atomic, integer limits apply and invisible notes cannot validate empty work',()=>{
 const input={kinds:['tabs','lyrics'] as ('tabs'|'lyrics')[],tempo:100,bars:1,tabNotes:[{row:0,beat:0,fret:0}],sheetNotes:[],chordBars:[{chord:'Am',lyric:''}]}
 assert.equal(composeArrangements(input,k=>k,()=> 'id').length,2)
 assert.throws(()=>composeArrangements({...input,tabNotes:[{row:0,beat:5,fret:0}]},k=>k,()=> 'id'))
 assert.throws(()=>composeArrangements({...input,tempo:NaN},k=>k,()=> 'id'))
 assert.throws(()=>composeArrangements({...input,kinds:['tabs','tabs']},k=>k,()=> 'id'))
})
