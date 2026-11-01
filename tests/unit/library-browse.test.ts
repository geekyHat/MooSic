import test from 'node:test'
import assert from 'node:assert/strict'
import { alphabeticSort,alphabeticPage,initialLetter,letterCounts,songsForView } from '../../src/features/library/model/browseLibrary.ts'
import type { ContentArtist,ArrangementKind } from '../../src/core/plugin/types.ts'
import type { Piece } from '../../src/domain/score/types.ts'

const piece:Piece={id:'p',title:'Study',instrumentId:'instrument-guitar',tempo:120,timeSignature:{numerator:4,denominator:4},secondsPerBeat:0.5,barLength:2,bars:1,duration:2,notes:[]}
const arrangements=(...kinds:ArrangementKind[])=>kinds.map(kind=>({kind,piece}))
test('alphabetical browsing orders accented names, punctuation and numeric variants without changing the catalog',()=>{
  const original=Object.freeze(['Zulu','Écho','Alba (10)','Alba (2)','10 studies','2 studies','"Ària"','東京'])
  const sorted=alphabeticSort(original,title=>title,'it',title=>title)
  assert.deepEqual(sorted,['2 studies','10 studies','Alba (2)','Alba (10)','"Ària"','Écho','Zulu','東京'])
  assert.equal(original[0],'Zulu')
  assert.equal(initialLetter('… èchi'),'E');assert.equal(initialLetter('東京'),'#')
  assert.deepEqual([...letterCounts(sorted,title=>title)],[['0–9',2],['A',3],['E',1],['Z',1],['#',1]])
})
test('selecting Z reaches songs beyond the first page of a large catalog',()=>{
  const catalog=Array.from({length:30000},(_,i)=>`${i<29000?'A':'Z'} song ${i}`)
  const sorted=alphabeticSort(catalog,title=>title,'en',title=>title)
  const first=alphabeticPage(sorted,title=>title,'all',48)
  assert.equal(first.total,30000);assert.equal(first.items.length,48);assert.ok(first.items.every(title=>title.startsWith('A')))
  const z=alphabeticPage(sorted,title=>title,'Z',48)
  assert.equal(z.total,1000);assert.equal(z.items[0],'Z song 29000');assert.equal(z.items.length,48)
})
test('format views include matching songs once and expose only matching versions and arrangements',()=>{
  const artist:ContentArtist={meta:{id:'a',name:'Artist'},songs:[
    {meta:{id:'mixed',title:'Mixed'},versions:[{id:'v1',name:'One',arrangements:arrangements('tabs','lyrics')},{id:'v2',name:'Two',arrangements:arrangements('sheet')}]},
    {meta:{id:'text',title:'Original OLGA'},versions:[{id:'v',name:'OLGA',arrangements:[{kind:'lyrics',piece:{...piece,source:{format:'olga-reference',text:'local-key'}}}]}]},
    {meta:{id:'empty',title:'Metadata only'},versions:[]},
  ]}
  assert.equal(songsForView([artist],'songs').length,3)
  const tabs=songsForView([artist],'tabs')
  assert.equal(tabs.length,1);assert.equal(tabs[0].song.versions.length,1)
  assert.deepEqual(tabs[0].song.versions[0].arrangements.map(arr=>arr.kind),['tabs'])
  assert.equal(songsForView([artist],'chords').length,2)
  assert.equal(songsForView([artist],'sheet')[0].song.meta.id,'mixed')
  assert.equal(artist.songs[0].versions[0].arrangements.length,2)
})
