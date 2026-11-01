import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parseSongFile, SongImportError } from '../../src/domain/songs/importSong.ts'
import { artistKey, artistLinks, resolveArtist, suggestArtists } from '../../src/domain/songs/artists.ts'
import { importSongs, planImports, mergeLocalArtist, type ImportChoice } from '../../src/application/songs/importSongs.ts'
import { SongService } from '../../src/application/songs/SongService.ts'
import { LocalSongRepository } from '../../src/infrastructure/persistence/LocalSongRepository.ts'
import { buildCatalog } from '../../src/application/library/buildCatalog.ts'
import { buildUserPiece } from '../../src/domain/songs/piece.ts'
import type { ContentArtist, ContentPlugin } from '../../src/core/plugin/types.ts'
import type { UserSong } from '../../src/domain/songs/types.ts'

const simple = (artist='Traditional', lyric='Original words')=>`{title: Study}\n{artist: ${artist}}\n{tempo: 90}\n{start_of_verse}\n[C]${lyric}\n{end_of_verse}`
const choice = (content=simple()):ImportChoice=>{const entry=parseSongFile('study.cho',content);return {entry,name:entry.song.name,artist:entry.song.artist,confirmed:false}}
const catalog:ContentArtist[]=[{meta:{id:'beethoven',name:'L. van Beethoven'},songs:[]},{meta:{id:'traditional',name:'Traditional'},songs:[]}]
function storage(){const data=new Map<string,string>();const port={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};return {data,port,service:new SongService(new LocalSongRepository(port))}}

test('downloaded official ChordPro imports Unicode, metadata, repeated chorus and original source',()=>{
  const raw=readFileSync(new URL('../fixtures/imports/swinglow.cho',import.meta.url),'utf8')
  const {song,warnings}=parseSongFile('swinglow.cho',raw)
  assert.equal(song.name,'Swing Low Sweet Chariot')
  const arrangement=song.arrangements[0]
  assert.equal(arrangement.kind,'lyrics')
  if(arrangement.kind!=='lyrics')throw new Error('lyrics')
  assert.equal(arrangement.lyricSheet?.rows.filter(row=>row.kind==='line').length,12)
  assert.equal(arrangement.source?.text,raw)
  assert.ok(arrangement.lyricSheet?.rows.some(row=>row.kind==='line'&&row.text.includes('Comin’')))
  assert.deepEqual(warnings,[{code:'timing'}])
  assert.equal(buildUserPiece(song,arrangement).source?.format,'chordpro')
})

test('downloaded official TAB blocks preserve repeats, notes and original technique instructions',()=>{
  const raw=readFileSync(new URL('../fixtures/imports/tab-example.cho',import.meta.url),'utf8')
  const {song,warnings}=parseSongFile('tab-example.cho',raw)
  assert.equal(song.name,'tab-example')
  assert.equal(song.arrangements[0].kind,'tabs')
  assert.equal(song.arrangements[0].bars,32)
  assert.ok(warnings.some(warning=>warning.code==='tabTiming'))
  assert.ok(song.arrangements[0].source?.text.includes('x4'))
})

test('text .tab keeps simultaneous notes, multi-digit frets and source, and marks rhythm approximate',()=>{
  const raw='Title: Riff\nArtist: Test band\ne|--10h12--|\nB|--10----|\nG|--------|\nD|--------|\nA|--------|\nE|--------|'
  const {song,warnings}=parseSongFile('riff.tab',raw)
  const arrangement=song.arrangements[0]
  assert.equal(song.artist,'Test band')
  assert.equal(arrangement.kind,'tabs')
  if(arrangement.kind!=='tabs')throw new Error('tabs')
  assert.deepEqual(arrangement.tabNotes,[{row:0,fret:10,beat:0},{row:1,fret:10,beat:0},{row:0,fret:12,beat:1}])
  assert.equal(arrangement.source?.text,raw)
  assert.equal(warnings[0].code,'tabTiming')
})

test('unsupported sections, bad encodings, malformed brackets, wrong meter and excessive files fail before saving',()=>{
  for(const [filename,raw,code] of [
    ['unsupported-abc.cho',readFileSync(new URL('../fixtures/imports/unsupported-abc.cho',import.meta.url),'utf8'),'directive'],
    ['bad.cho','[Cbroken','content'], ['bad.cho','\0binary','format'],['bad.cho','<html>not music</html>','format'],
    ['bad.cho','{time: 3/4}\n[C]hello','meter'],['bad.cho','{tempo: 900}\n[C]hello','tempo'],
    ['bad.cho','{title:A}\n{title:B}\n[C]hello','multiple'],['big.cho','x'.repeat(100001),'size'],
    ['bad.tab','e|--1--|\nB|--2--|','tab'],['song.gp5','binary','format'],
  ])assert.throws(()=>parseSongFile(filename,raw),(error:unknown)=>error instanceof SongImportError&&error.code===code,filename+' '+code)
})

test('same artist and title: identical content skips; differing content receives the next free suffix',()=>{
  const a=choice(),b=choice(simple('TRADITIONAL','Different words')),c=choice(simple('Traditional','Third words'))
  const plans=planImports([a,a,b,c],[],catalog)
  assert.deepEqual(plans.map(plan=>[plan.status,plan.song.name]),[['add','Study'],['duplicate','Study'],['rename','Study (1)'],['rename','Study (2)']])
  const again=planImports([b],plans.filter(plan=>plan.status!=='duplicate').map(plan=>plan.song),catalog)
  assert.equal(again[0].status,'duplicate')
  const sameTitleOtherArtist=planImports([{...a,artist:'Other artist',confirmed:true}],plans.map(plan=>plan.song),catalog)
  assert.equal(sameTitleOtherArtist[0].song.name,'Study')
})

test('TAB techniques and ChordPro instructions remain part of duplicate detection',()=>{
  const tab=(technique:string)=>`Title: Riff\nArtist: Traditional\ne|--1${technique}3--|\nB|-------|\nG|-------|\nD|-------|\nA|-------|\nE|-------|`
  const makeChoice=(source:string):ImportChoice=>{const entry=parseSongFile('riff.tab',source);return {entry,name:entry.song.name,artist:entry.song.artist,confirmed:false}}
  const plans=planImports([makeChoice(tab('h')),makeChoice(tab('/')),makeChoice(tab('h'))],[],catalog)
  assert.deepEqual(plans.map(plan=>plan.status),['add','rename','duplicate'])
  assert.deepEqual(planImports([choice(simple()+'\n{capo: 1}'),choice(simple()+'\n{capo: 2}')],[],catalog).map(plan=>plan.status),['add','rename'])
})

test('incomplete artist requires confirmation; confirmed aliases survive reload and keep one artist',async()=>{
  for(const query of ['Beethoven','Ludwig van Beethoven','Beetoven'])assert.ok(suggestArtists(query,['L. van Beethoven']).includes('L. van Beethoven'))
  const input=choice(simple('Beetoven'))
  assert.equal(planImports([input],[],catalog)[0].status,'confirm')
  const {service}=storage()
  await assert.rejects(()=>importSongs(service,[input],catalog),/Confirm/)
  assert.equal(service.list().length,0)
  await importSongs(service,[{...input,artist:'L. van Beethoven',confirmed:true,matchedAlias:'Beetoven'}],catalog)
  const saved=service.list()
  assert.deepEqual(saved[0].artistAliases,['Beetoven'])
  assert.equal(resolveArtist('BEETOVEN',artistLinks(saved)),'L. van Beethoven')
  assert.equal(planImports([choice(simple('Beetoven','Second'))],saved,catalog)[0].status,'rename')
  const raw:ContentPlugin={manifest:{id:'test',type:'content',apiVersion:1,version:'1',name:{en:'Test',it:'Test'}},artists:async()=>[{meta:{id:'canonical',name:'L. van Beethoven'},songs:[]},{meta:{id:'alias',name:'Beetoven'},songs:[{meta:{id:'old',title:'Old',composer:'Beetoven'},versions:[]}]}],file:()=>undefined}
  const result=await buildCatalog({enabledContentPlugins:[raw],parsers:[],artistLinks:artistLinks(saved)})
  assert.equal(result.artists.length,1)
  assert.equal(result.artists[0].songs[0].meta.composer,'L. van Beethoven')
})

test('correcting the artist field alone does not remap every song by the original artist',()=>{
  const input=choice(simple('Traditional'))
  const plan=planImports([{...input,artist:'My own band'}],[],catalog)[0]
  assert.equal(plan.song.artist,'My own band')
  assert.deepEqual(plan.song.artistAliases,[])
})

test('confirming a new alias on an identical copy remembers the alias without adding a song',async()=>{
  const {service}=storage()
  await importSongs(service,[choice(simple('L. van Beethoven'))],catalog)
  const result=await importSongs(service,[{...choice(simple('Beetoven')),artist:'L. van Beethoven',confirmed:true,matchedAlias:'Beetoven'}],catalog)
  assert.equal(result[0].status,'duplicate')
  assert.equal(service.list().length,1)
  assert.deepEqual(service.list()[0].artistAliases,['Beetoven'])
})

test('batch storage is atomic, retries do not duplicate, and concurrent imports retain unique names',async()=>{
  const {service,port,data}=storage()
  const original=port.setItem
  port.setItem=(key,value)=>{if(key==='mm:user-songs')throw new DOMException('Full','QuotaExceededError');original(key,value)}
  await assert.rejects(()=>importSongs(service,[choice(),choice(simple('Traditional','Other'))],catalog),/quota/)
  assert.equal(data.get('mm:user-songs'),undefined)
  port.setItem=original
  await Promise.all([importSongs(service,[choice()],catalog),importSongs(service,[choice(simple('Traditional','Other'))],catalog)])
  assert.deepEqual(service.list().map(song=>song.name),['Study','Study (1)'])
  await importSongs(service,[choice()],catalog)
  assert.equal(service.list().length,2)
})

test('explicit artist merge keeps all IDs and contents, numbers conflicting titles and records aliases',async()=>{
  const {service}=storage()
  const a=choice(simple('Beetoven')).entry.song,b={...choice(simple('L. van Beethoven','Other')).entry.song,name:'Study'}
  service.repository.saveMany([a,b])
  await mergeLocalArtist(service,'Beetoven','L. van Beethoven',catalog)
  const saved=service.list()
  assert.equal(saved.length,2)
  assert.equal(saved[0].id,a.id)
  assert.equal(saved[0].name,'Study (1)')
  assert.equal(new Set(saved.map(song=>artistKey(song.artist))).size,1)
  assert.deepEqual(saved[0].arrangements,a.arrangements)
  assert.equal(resolveArtist('Beetoven',artistLinks(saved)),'L. van Beethoven')
  assert.equal((saved as UserSong[])[1].name,'Study')
})
