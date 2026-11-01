import assert from 'node:assert/strict'
import { test } from 'node:test'
import abc from '../../src/parsers/abc/index.ts'
test('ABC imported syllables retain note timing and rests instead of distributing by BPM',async()=>{
 const p=await abc.parser.parse('X:1\nT:Timing\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\nC z D E |\nw: Bel- la ciao\n')
 const tokens=p.lyrics![0].tokens!
 assert.ok(tokens)
 assert.deepEqual(tokens.map(t=>[t.text,t.startBeat,t.endBeat]),[['Bel',0,1],['la',2,3],['ciao',3,4]])
})
test('all bundled ABC sources produce valid scores through the production parser',async()=>{
 const {readdirSync,readFileSync}=await import('node:fs')
 const {validatePiece}=await import('../../src/domain/score/validation.ts')
 for(const file of readdirSync('src/content/publicdomain/pieces').filter(file=>file.endsWith('.abc'))){
  const p=await abc.parser.parse(readFileSync(`src/content/publicdomain/pieces/${file}`,'utf8'))
  assert.deepEqual(validatePiece(p),[],file)
 }
})
test('trailing rests remain part of the playback duration and final measure',async()=>{
 const p=await abc.parser.parse('X:1\nT:Rest\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\nC z z z |\nw: stay\n')
 assert.equal(p.duration,2);assert.equal(p.bars,1)
})
