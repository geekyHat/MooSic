import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editorReducer,initialDraft,isDirty } from '../../src/features/editor/model/editorReducer.ts'
import { song } from '../fixtures/songs.ts'
test('draft edits survive external updates and save failure; cancel restores last saved state',()=>{
 const initial=initialDraft(song());const edited=editorReducer(initial,{type:'edit',song:{...song(),name:'Draft'}})
 assert.equal(isDirty(edited),true)
 const failed=editorReducer(edited,{type:'error',error:'quota'});assert.equal(failed.draft.name,'Draft')
 const saved=editorReducer(failed,{type:'saved',song:failed.draft});assert.equal(isDirty(saved),false)
 const cancelled=editorReducer(editorReducer(saved,{type:'edit',song:song()}),{type:'cancel'});assert.equal(cancelled.draft.name,'Draft')
})
