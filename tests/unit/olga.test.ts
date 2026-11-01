import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync,strToU8} from 'fflate'
import {describeOlga,olgaPath,similarOlgaArtist} from '../../src/domain/olga/catalog.ts'
import {readOlgaZip,sourceDigest} from '../../src/infrastructure/olga/readOlgaZip.ts'

const text='Title: My study\nArtist: Ada Example\nFrom: Someone Else <transcriber@example.invalid>\nC        G\nOriginal line\n'
test('OLGA distinguishes collections, reversed folders and transcriber credits; preserves ASCII chords',()=>{
 const source={path:'OLGA Archive/main 19/e/example_ada/study.crd',text,digest:'a'}
 const entry=describeOlga(source)!
 assert.equal(entry.artist,'Ada Example');assert.equal(entry.title,'My study');assert.equal(entry.category,'main')
 assert.equal(olgaPath('OLGA Archive/jan98/bass/e/example_ada/study.btab')?.instrument,'Basso')
 assert.equal(olgaPath('OLGA Archive/acoustic/e/example_ada/study.tab')?.instrument,'Chitarra acustica')
 assert.equal(olgaPath('OLGA Archive/resources/tools/readme.txt'),null)
 assert.equal(olgaPath('OLGA Archive/main.tgz'),null)
 assert.throws(()=>olgaPath('OLGA Archive/main/../../evil.tab'))
 assert.notEqual(sourceDigest(text),sourceDigest(text+'x'))
})
test('ZIP reader validates CRC and completeness and honors cancellation',async()=>{
 const path='OLGA Archive/main/e/example_ada/study.crd',zip=zipSync({[path]:strToU8(text)},{level:0})
 const read=async(bytes:Uint8Array,signal=new AbortController().signal)=>{const result=[];for await(const batch of readOlgaZip(new Blob([bytes]),signal,()=>{}))result.push(...batch);return result}
 assert.equal((await read(zip))[0].text,text)
 const damaged=zip.slice();damaged[30+new TextEncoder().encode(path).length]^=1
 await assert.rejects(read(damaged),/danneggiato/)
 await assert.rejects(read(zip.slice(0,-10)),/incompleto/)
 const cancel=new AbortController();cancel.abort();await assert.rejects(read(zip,cancel.signal),/abort/i)
})

import {OlgaService} from '../../src/application/olga/OlgaService.ts'
import type {OlgaRepository} from '../../src/application/olga/ports.ts'
import type {OlgaEntry} from '../../src/domain/olga/catalog.ts'
class MemoryOlga implements OlgaRepository {
 entries:OlgaEntry[]=[];texts=new Map<string,{batch:string;text:string}>();fail=false
 async list(){return this.entries.slice()}
 async stage(batch:string,rows:{key:string;text:string}[]){for(const row of rows)this.texts.set(row.key,{batch,text:row.text})}
 async equalSources(pairs:[string,string][]){return pairs.map(([a,b])=>this.texts.get(a)!.text===this.texts.get(b)!.text)}
 async source(key:string){return this.texts.get(key)!.text}
 async discard(batch:string){for(const [key,value] of this.texts)if(value.batch===batch)this.texts.delete(key)}
 async commit(entries:OlgaEntry[],batch:string){if(this.fail)throw new Error('Quota exceeded');this.entries.push(...entries);for(const entry of entries)this.texts.get(entry.sourceKey)!.batch='committed';await this.discard(batch)}
}
const zipFile=()=>new File(['zip'],'OLGA Archive.zip')
const fixtureReader=async function*(){yield [{path:'OLGA Archive/main/b/beetoven/test.crd',text,digest:sourceDigest(text)}]}
test('OLGA asks about misspelled artists, persists the confirmed identity and rolls back quota errors',async()=>{
 const repo=new MemoryOlga(),service=new OlgaService(repo,fixtureReader)
 await service.initialize();await service.prepare(zipFile(),['L. van Beethoven'])
 assert.equal(service.getSnapshot().reviews.length,1)
 await assert.rejects(service.commit(),/Conferma/)
 service.review('beetoven','L. van Beethoven',true)
 await service.commit()
 assert.equal(repo.entries[0].artist,'L. van Beethoven')
 await service.prepare(zipFile(),['L. van Beethoven'])
 assert.equal(service.getSnapshot().reviews.length,0)
 await service.commit();assert.equal(service.getSnapshot().duplicates,1);assert.equal(repo.entries.length,1)
 const failing=new OlgaService(repo,async function*(){yield [{path:'OLGA Archive/main/a/another/test.crd',text:'New original source',digest:'other'}]})
 await failing.initialize();await failing.prepare(zipFile(),[]);repo.fail=true;await failing.commit()
 assert.equal(failing.getSnapshot().status,'error');assert.equal(repo.entries.length,1);assert.equal(repo.texts.size,1)
})

test('OLGA name review finds incomplete and misspelled artists without matching unrelated band names',()=>{
 assert.equal(similarOlgaArtist('beetoven','L. van Beethoven'),true)
 assert.equal(similarOlgaArtist('Jackson','Michael Jackson'),true)
 assert.equal(similarOlgaArtist('Philip Sousa','John Philip Sousa'),true)
 assert.equal(similarOlgaArtist('philip sousa','Blessid Union Of Souls'),false)
 assert.equal(similarOlgaArtist('black sabbath','black flag'),false)
 assert.equal(similarOlgaArtist('Janet Jackson','Michael Jackson'),false)
})
