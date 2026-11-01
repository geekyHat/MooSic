import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parseLyricSheet,serializeLyricSheet,legacyToLyricSheet} from '../../src/domain/songs/lyricSheet.ts'
import {buildUserPiece} from '../../src/domain/songs/piece.ts'
import {validateArrangement} from '../../src/domain/songs/validation.ts'
import {lyricTokens} from '../../src/domain/score/lyrics.ts'
import {song} from '../fixtures/songs.ts'

test('inline chord document preserves sections, blank lines and anchors inside words and at both ends',()=>{
 const source='{c:Verse 1}\n[C]Ri[Am]cordo il mare[G]\n\n[Dm] [G]'
 const sheet=parseLyricSheet(source)
 assert.equal(sheet.rows[0].kind,'section')
 const first=sheet.rows[1]
 assert.equal(first.kind,'line')
 if(first.kind!=='line')throw new Error('expected lyric row')
 assert.equal(first.text,'Ricordo il mare')
 assert.deepEqual(first.chords.map(({name,offset})=>({name,offset})),[{name:'C',offset:0},{name:'Am',offset:2},{name:'G',offset:first.text.length}])
 assert.equal(sheet.rows[2].kind,'spacer')
 assert.equal(sheet.rows[3].kind,'line')
 assert.equal(serializeLyricSheet(sheet),source)
})

test('moving chords preserves explicit musical timing and row IDs while text edits invalidate only that line timing',()=>{
 const previous=parseLyricSheet('{c:Verse 1}\n[C]Ricordo il mare\n[D]Una luce')
 const first=previous.rows[1]
 assert.equal(first.kind,'line')
 if(first.kind!=='line')throw new Error('expected line')
 first.endBeat=6
 first.tokens=[{text:'Ricordo',startBeat:0,endBeat:2},{text:'il',startBeat:3,endBeat:4},{text:'mare',startBeat:5,endBeat:6}]
 const moved=parseLyricSheet('{c:Verse 1}\nRi[Am]cordo il mare\n[D]Una luce',previous)
 const row=moved.rows[1]
 assert.equal(row.kind,'line')
 if(row.kind!=='line')throw new Error('expected line')
 assert.equal(row.id,first.id)
 assert.equal(row.endBeat,6)
 assert.deepEqual(row.tokens,first.tokens)
 const edited=parseLyricSheet('{c:Verse 1}\nRi[Am]cordo la sera\n[D]Una luce',moved)
 const changed=edited.rows[1]
 if(changed.kind!=='line')throw new Error('expected line')
 assert.equal(changed.id,first.id)
 assert.equal(changed.tokens,undefined)
 assert.equal(edited.rows[2].id,previous.rows[2].id)
})

test('a lyric line spans several bars with independent visual anchors, explicit beats, sections and chord-only lines',()=>{
 const sheet=parseLyricSheet('{c:Verse 1}\n[C]Ri[Am]cordo il mare[G]\n\n[D]')
 const first=sheet.rows[1],last=sheet.rows[3]
 if(first.kind!=='line'||last.kind!=='line')throw new Error('expected lines')
 first.startBeat=1;first.endBeat=9
 first.tokens=[{text:'Ricordo',startBeat:0,endBeat:2},{text:'il',startBeat:3,endBeat:4},{text:'mare',startBeat:6,endBeat:8}]
 first.chords[1].beat=3
 last.startBeat=10;last.endBeat=12
 const arr={id:'free',name:'Free',kind:'lyrics' as const,tempo:120,bars:4,beatsPerBar:4,chordBars:[],lyricSheet:sheet}
 assert.deepEqual(validateArrangement(arr),[])
 const piece=buildUserPiece(song(),arr)
 assert.equal(piece.notes.length,0)
 assert.equal(piece.lyrics?.[0].text,first.text)
 assert.equal(piece.lyrics?.[0].time,0.5)
 assert.equal(piece.lyrics?.[0].endTime,4.5)
 assert.deepEqual(piece.lyrics?.[0].anchors,first.chords)
 assert.equal(piece.chords?.find(c=>c.name==='Am')?.time,2)
 assert.equal(lyricTokens(piece.lyrics![0],.5)[1].start,2)
 assert.deepEqual(piece.lyricLayout?.map(r=>r.kind),['section','line','spacer','line'])
 assert.equal(piece.lyrics?.[1].text,'')
 assert.ok(validateArrangement({...arr,chordBars:[{chord:'C',lyric:'mixed'}]}).length)
})

test('explicit legacy conversion preserves empty bars as rests and word timing without changing the source',()=>{
 const bars=[{chord:'',lyric:''},{chord:'Am',lyric:'Una luce',tokens:[{text:'Una',startBeat:0,endBeat:1},{text:'luce',startBeat:2,endBeat:4}]}]
 const before=JSON.stringify(bars)
 const sheet=legacyToLyricSheet(bars,2)
 assert.equal(sheet.rows[0].kind,'spacer')
 const row=sheet.rows[1]
 if(row.kind!=='line')throw new Error('expected line')
 assert.equal(row.startBeat,4);assert.equal(row.endBeat,8)
 assert.deepEqual(row.tokens,bars[1].tokens)
 assert.deepEqual(row.chords,[{name:'Am',offset:0}])
 assert.equal(JSON.stringify(bars),before)
})

test('Unicode anchors may not split graphemes and malformed or excessive source is rejected',()=>{
 const sheet=parseLyricSheet('[C]Caffe\u0301 🎵[G]')
 const row=sheet.rows[0]
 if(row.kind!=='line')throw new Error('expected line')
 const arr={id:'unicode',name:'Unicode',kind:'lyrics' as const,tempo:100,bars:1,beatsPerBar:4,chordBars:[],lyricSheet:sheet}
 assert.deepEqual(validateArrangement(arr),[])
 for(const offset of [5,row.text.length-1,-1,NaN,Infinity]){
   const bad=structuredClone(arr)
   const line=bad.lyricSheet.rows[0]
   if(line.kind!=='line')throw new Error('expected line')
   line.chords[0].offset=offset
   assert.ok(validateArrangement(bad).length,`reject offset ${offset}`)
 }
 for(const raw of ['[Am','[]','[Am[C]x','{unsupported:value}'])assert.throws(()=>parseLyricSheet(raw))
 assert.throws(()=>parseLyricSheet('x'.repeat(100001)),/limit/i)
 assert.throws(()=>parseLyricSheet('[C]'.repeat(129)+'x'),/limit/i)
})

test('inserting and moving chords preserves existing explicit beats rather than matching array indexes',()=>{
 const previous=parseLyricSheet('[C]Ricordo [G]il [C]mare')
 const line=previous.rows[0]
 if(line.kind!=='line')throw new Error('expected line')
 line.chords.forEach((chord,index)=>{chord.beat=[0.5,2,3][index]})
 const inserted=parseLyricSheet('[F][C]Ricordo [G]il [C]mare',previous).rows[0]
 if(inserted.kind!=='line')throw new Error('expected line')
 assert.deepEqual(inserted.chords.map(chord=>chord.beat),[undefined,0.5,2,3])
 const moved=parseLyricSheet('Ri[C]cordo [G]il [C]mare',previous).rows[0]
 if(moved.kind!=='line')throw new Error('expected line')
 assert.deepEqual(moved.chords.map(chord=>chord.beat),[0.5,2,3])
 const single=parseLyricSheet('Ricor[C]do')
 const old=single.rows[0]
 if(old.kind!=='line')throw new Error('expected line')
 old.chords[0].beat=1
 const duplicate=parseLyricSheet('[C]Ricord[C]o',single).rows[0]
 if(duplicate.kind!=='line')throw new Error('expected line')
 assert.deepEqual(duplicate.chords.map(chord=>chord.beat),[undefined,1])
})
