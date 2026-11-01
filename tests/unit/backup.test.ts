import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync,strToU8} from 'fflate'
import {BackupError,parseBackupManifest,type BackupManifest} from '../../src/domain/backup/backup.ts'
import {createBackupZip,openBackupZip,sha256} from '../../src/infrastructure/backup/backupZip.ts'
import {mergeBackupSongs} from '../../src/application/backup/mergeSongs.ts'
import type {UserSong} from '../../src/domain/songs/types.ts'
const song:UserSong={id:'s1',name:'Study',artist:'Ada',artistAliases:['Ada Example'],genre:'Folk',createdAt:1,arrangements:[{id:'arr',name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Original words'}],source:{format:'chordpro',text:'[Am]Original words'}}]}
const manifest=():BackupManifest=>({format:'musicmaestro-backup',version:1,createdAt:new Date(0).toISOString(),songs:[structuredClone(song)],documents:[],preferences:{locale:'it',theme:'theme-default',enabled:['content-user'],config:{}}})
test('backup ZIP preserves source bytes, aliases, arrangement IDs and preferences',async()=>{
 const text='From: Original author\r\n{t: Studio è bello}\r\n[Am]Original [G/B]words\r\n',bytes=strToU8(text),value=manifest()
 value.documents=[{file:'olga/000000.txt',sha256:await sha256(bytes),entry:{id:'o1',title:'Studio',baseTitle:'Studio',artist:'Ada',artistFolder:'ada',instrument:'Chitarra',category:'main',format:'crd',path:'main/a/ada/studio.crd',digest:'original-digest',sourceKey:'old/key'}}]
 const zip=createBackupZip();zip.add('olga/000000.txt',bytes)
 const opened=await openBackupZip(zip.finish(value),new AbortController().signal)
 assert.deepEqual(opened.manifest,value);assert.equal(new TextDecoder().decode(await opened.read('olga/000000.txt')),text)
})
test('backup rejects unknown versions, malformed songs, unexpected files, corrupt CRC and oversized directory claims',async()=>{
 assert.throws(()=>parseBackupManifest({...manifest(),version:99}),(e:unknown)=>e instanceof BackupError&&e.code==='version')
 assert.throws(()=>parseBackupManifest({...manifest(),songs:[{...song,arrangements:[{kind:'lyrics'}]}]}),BackupError)
 const read=(bytes:Uint8Array)=>openBackupZip(new Blob([new Uint8Array(bytes)]),new AbortController().signal)
 await assert.rejects(read(zipSync({'manifest.json':strToU8(JSON.stringify(manifest())),'../escape.txt':strToU8('unsafe')})),BackupError)
 const bytes=zipSync({'manifest.json':strToU8(JSON.stringify(manifest()))},{level:0});bytes[45]^=1
 await assert.rejects(read(bytes),BackupError)
 const huge=zipSync({'manifest.json':strToU8('{}')});const view=new DataView(huge.buffer)
 for(let i=0;i<huge.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,0x7fffffff,true);break}
 await assert.rejects(read(huge),BackupError)
})
test('backup merge skips equivalent copies, preserves existing songs and numbers conflicting names and IDs',()=>{
 const conflict={...song,arrangements:[{...song.arrangements[0],source:{format:'chordpro' as const,text:'[C]Different words'}}]}
 const result=mergeBackupSongs([structuredClone(song),conflict],[song],[])
 assert.equal(result.added,1);assert.equal(result.skipped,1);assert.equal(result.songs[0],song)
 assert.notEqual(result.songs[1].id,song.id);assert.equal(result.songs[1].name,'Study (1)')
 assert.equal(mergeBackupSongs([conflict],result.songs,[]).skipped,1)
 const empty=mergeBackupSongs([song],[],[]);assert.deepEqual(empty.songs,[song])
 const credited={...song,arrangements:[{...song.arrangements[0],source:{format:'chordpro' as const,text:'{author: Different retained credit}\n[Am]Original words'}}]}
 assert.equal(mergeBackupSongs([credited],[song],[]).added,1)
})
test('backup ZIP cancellation stops verification before reading documents',async()=>{
 const zip=createBackupZip(),blob=zip.finish(manifest()),controller=new AbortController();controller.abort()
 await assert.rejects(openBackupZip(blob,controller.signal),/abort/i)
})
