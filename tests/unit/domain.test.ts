import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildUserPiece } from '../../src/content/user/piece.ts'
import { activeTokenAt,lyricTokens } from '../../src/domain/score/lyrics.ts'
import { validateArrangement } from '../../src/domain/songs/validation.ts'
import { arrangement,song } from '../fixtures/songs.ts'

test('arrangement validates finite integer limits, visible content and duration', () => {
  const a = arrangement()
  assert.deepEqual(validateArrangement(a), [])
  for (const patch of [{tempo:NaN},{tempo:39},{tempo:120.5},{bars:1.5},{bars:33},{tabNotes:[{row:0,beat:8,fret:0}]},{tabNotes:[{row:6,beat:0,fret:0}]}]) assert.ok(validateArrangement({...a,...patch}).length)
  assert.ok(validateArrangement({...a,kind:'sheet',tabNotes:undefined,sheetNotes:[{beat:7,midi:60,durBeats:2}]}).length)
})
test('lyrics explicit beat timing respects gaps and syllables; legacy is approximate', () => {
  const p = buildUserPiece(song(), {id:'l',kind:'lyrics',name:'L',tempo:120,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Bel la ciao',tokens:[{text:'Bel',startBeat:0,endBeat:0.5},{text:'la',startBeat:1,endBeat:1.5},{text:'ciao',startBeat:2,endBeat:4}]}]})
  const tokens = lyricTokens(p.lyrics![0], p.secondsPerBeat)
  assert.equal(activeTokenAt(tokens,0.1),0)
  assert.equal(activeTokenAt(tokens,0.4),-1)
  assert.equal(activeTokenAt(tokens,0.5),1)
  assert.equal(activeTokenAt(tokens,2),-1)
  assert.equal(tokens[0].approximate,false)
  assert.equal(lyricTokens({time:0,endTime:2,text:'one two',bar:1},.5)[0].approximate,true)
})
test('piece construction rejects invalid invisible data explicitly',()=>{
 assert.throws(()=>buildUserPiece(song(),{...arrangement(),tabNotes:[{row:0,beat:20,fret:0}]}),/Invalid/)
})

test('generated beat timings retain the approximate label until explicitly edited',()=>{
 const tokens=lyricTokens({time:0,endTime:4,bar:1,text:'Una luce',timingApproximate:true,tokens:[{text:'Una',startBeat:0,endBeat:2},{text:'luce',startBeat:2,endBeat:4}]},1)
 assert.equal(tokens.every(token=>token.approximate),true)
})
