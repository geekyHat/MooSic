import assert from 'node:assert/strict'
import {test} from 'node:test'
import {identifySongMetadata} from '../../src/domain/songs/importMetadata.ts'
import {parseSongFile} from '../../src/domain/songs/importSong.ts'
import {importSongs, type ImportChoice} from '../../src/application/songs/importSongs.ts'
import {SongService} from '../../src/application/songs/SongService.ts'
import {LocalSongRepository} from '../../src/infrastructure/persistence/LocalSongRepository.ts'

const artists=['Traditional','L. van Beethoven','Known Band']
test('filename detection recognizes either orientation, track numbers, underscores and multi-part titles using known artists',()=>{
  for(const filename of ['Known Band - New song.cho','New song - Known Band.cho','01 - Known_Band - New_song.cho','Known%20Band%20-%20New%20song.cho']){
    const result=identifySongMetadata(filename,{},artists)
    assert.equal(result.artist,'Known Band',filename)
    assert.equal(result.name,'New song',filename)
    assert.equal(result.metadata.artistSource,'filename')
    assert.equal(result.metadata.needsReview,false)
  }
  assert.equal(identifySongMetadata('Known Band - Song - Live.cho',{},artists).name,'Song - Live')
  assert.equal(identifySongMetadata('Song - Live - Known Band.cho',{},artists).name,'Song - Live')
})

test('unknown filename orientation is proposed for confirmation; ordinary filenames do not invent an artist',()=>{
  const guess=identifySongMetadata('New Band - New song.tab',{},artists)
  assert.equal(guess.artist,'New Band')
  assert.equal(guess.name,'New song')
  assert.equal(guess.metadata.needsReview,true)
  const plain=identifySongMetadata('stand_by_me.cho',{},artists)
  assert.equal(plain.name,'stand by me')
  assert.equal(plain.artist,'')
  assert.equal(identifySongMetadata('21 - Known Band.cho',{},artists).name,'21')
})

test('metadata performers take precedence and can be read from plain, commented and ChordPro headers',()=>{
  for(const header of ['{artist: Singer}','{performer: Singer}','{cantante: Singer}','{meta: artist Singer}','Artist: Singer','# Artist: Singer']){
    const entry=parseSongFile('Other - File title.cho',`${header}\n{composer: Writer}\n{title: Song title}\n[C]Original line`,artists)
    assert.equal(entry.song.artist,'Singer',header)
    assert.equal(entry.song.name,'Song title',header)
    assert.equal(entry.metadata.artistSource,'metadata')
    assert.equal(entry.metadata.needsReview,false)
  }
  assert.equal(parseSongFile('song.cho','{author: Writer}\n{performer: Singer}\n[C]Line',artists).song.artist,'Singer')
  assert.equal(parseSongFile('song.cho','{performer: Singer}\n{author: Writer}\n[C]Line',artists).song.artist,'Singer')
})

test('internal titles, credited subtitles and known plain subtitles can identify the performer',()=>{
  const title=parseSongFile('download.cho','{title: New song - Known Band}\n[C]Line',artists)
  assert.equal(title.song.artist,'Known Band')
  assert.equal(title.song.name,'New song')
  assert.equal(title.metadata.artistSource,'title')
  for(const subtitle of ['Known Band','by: New Singer']){
    const entry=parseSongFile('download.cho',`{title: New song}\n{subtitle: ${subtitle}}\n[C]Line`,artists)
    assert.equal(entry.song.artist,subtitle==='Known Band'?'Known Band':'New Singer')
    assert.equal(entry.metadata.artistSource,'subtitle')
  }
  assert.equal(parseSongFile('download.cho','{subtitle: Live version}\n[C]Line',artists).song.artist,'')
})

test('known title anchors filename orientation; conflicting performer fields require confirmation',()=>{
  const anchored=identifySongMetadata('New song - New Singer.cho',{title:'New song'},artists)
  assert.equal(anchored.artist,'New Singer')
  assert.equal(anchored.metadata.needsReview,false)
  const conflicting=parseSongFile('song.cho','{artist: Band}\n{singer: Person}\n[C]Line',artists)
  assert.equal(conflicting.song.artist,'Band')
  assert.equal(conflicting.metadata.needsReview,true)
  const explicit=identifySongMetadata('Known Band - New song.cho',{artist:'Known Band',title:'Known Band - New song'},artists)
  assert.equal(explicit.name,'New song')
})

test('ambiguous detected metadata cannot bypass confirmation during batch save',async()=>{
  const data=new Map<string,string>()
  const service=new SongService(new LocalSongRepository({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value)}}))
  const entry=parseSongFile('New Band - New song.cho','[C]Line',artists)
  const input:ImportChoice={entry,name:entry.song.name,artist:entry.song.artist,confirmed:false}
  await assert.rejects(()=>importSongs(service,[input],[]),/Confirm the detected artist/)
  assert.equal(service.list().length,0)
  await importSongs(service,[{...input,metadataConfirmed:true}],[])
  assert.equal(service.list()[0].artist,'New Band')
  assert.deepEqual(service.list()[0].artistAliases,[])
})
