import {test,expect} from './fixtures/browser'
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import type {Page} from '@playwright/test'
const source='From: Ada <author@example.invalid>\r\n{t: Backup study}\r\n[Am]Original [G/B]words\r\n'
const song={id:'backup-song',name:'Saved study',artist:'Backup Artist',genre:'Folk',artistAliases:['Backup Alias'],createdAt:1,arrangements:[{id:'arr',name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Saved words'}],source:{format:'chordpro',text:'[Am]Saved words'}}]}
function backup(version=1){return Buffer.from(zipSync({'manifest.json':strToU8(JSON.stringify({format:'musicmaestro-backup',version,createdAt:'2026-10-01T00:00:00.000Z',songs:[song],preferences:{locale:'it',theme:'theme-default',enabled:['content-user','content-olga'],config:{}},documents:[{file:'olga/000000.txt',sha256:createHash('sha256').update(source).digest('hex'),entry:{id:'backup-olga',title:'Backup study',baseTitle:'Backup study',artist:'Backup Artist',artistFolder:'artist backup',instrument:'Chitarra / accordi',category:'main',path:'main/b/backup_artist/study.crd',format:'crd',digest:'digest',sourceKey:'original-source'}}]})),'olga/000000.txt':strToU8(source)}))}
async function select(page:Page,buffer=backup()){
 await page.getByLabel('Backup file',{exact:true}).setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer})
}
async function settings(page:Page){await page.goto('/#/settings');await expect(page.getByRole('heading',{name:'Backup and restore',exact:true})).toBeVisible()}
async function entries(page:Page){return page.evaluate(async()=>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('musicmaestro-olga',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
 const tx=db.transaction(['entries','sources']);const read=(name:string)=>new Promise<unknown[]>(resolve=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve(r.result)})
 const [entries,sources]=await Promise.all([read('entries'),read('sources')]);db.close();return {entries,sources,songs:JSON.parse(localStorage.getItem('mm:user-songs')??'[]')}
})}
test('full backup restores exact OLGA sources and editor records, downloads both, and skips duplicates',async({page})=>{
 await settings(page);await select(page)
 await expect(page.getByLabel('Backup preview',{exact:true})).toContainText('1 songs · 1 OLGA documents')
 expect((await entries(page)).entries).toHaveLength(0)
 await page.getByRole('button',{name:'Merge into library',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Backup restored',exact:true})).toContainText('Added 1 songs and 1 OLGA documents')
 await page.getByRole('button',{name:'Reopen app',exact:true}).click()
 expect((await entries(page)).songs).toEqual([song]);expect((await entries(page)).sources).toEqual([expect.objectContaining({text:source})])
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download full backup',exact:true}).click()
 const file=await (await downloaded).path();expect(file).toBeTruthy()
 const zip=unzipSync(await readFile(file!)),manifest=JSON.parse(strFromU8(zip['manifest.json']))
 expect(manifest.songs).toEqual([song]);expect(manifest.documents[0].entry.id).toBe('backup-olga');expect(strFromU8(zip[manifest.documents[0].file])).toBe(source)
 await select(page,Buffer.from(await readFile(file!)));await page.getByRole('button',{name:'Merge into library',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Backup restored',exact:true})).toContainText('Added 0 songs and 0 OLGA documents. Skipped 2 identical copies.')
 expect((await entries(page)).entries).toHaveLength(1)
})
test('restore keeps conflicting existing records, allocates new IDs and applies preferences only when selected',async({page})=>{
 await page.addInitScript(value=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([{...value,name:'Saved study',arrangements:[{...value.arrangements[0],source:{format:'chordpro',text:'[C]Existing local words'}}]}]))},song)
 await settings(page);await select(page);await page.getByLabel('Also restore preferences',{exact:true}).check()
 await page.getByRole('button',{name:'Merge into library',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Backup restored',exact:true})).toBeVisible()
 const stored=await entries(page);expect(stored.songs).toHaveLength(2);expect(stored.songs[0].arrangements[0].source.text).toBe('[C]Existing local words');expect(stored.songs[1].name).toBe('Saved study (1)');expect(stored.songs[1].id).not.toBe('backup-song')
 await page.getByRole('button',{name:'Reopen app',exact:true}).click();await expect(page.getByRole('heading',{name:'Backup e ripristino',exact:true})).toBeVisible()
})
test('unknown and corrupt backups are rejected before any write and cancellation discards preview',async({page})=>{
 await settings(page);await select(page,backup(99));await expect(page.getByRole('alert')).toContainText('Unsupported backup version')
 await select(page,Buffer.from('invalid-backup'));await expect(page.getByRole('alert')).toContainText('exceeds backup limits')
 expect((await entries(page)).entries).toHaveLength(0);expect((await entries(page)).songs).toHaveLength(0)
 await select(page);await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await entries(page)).entries).toHaveLength(0);await expect(page.getByLabel('Backup preview',{exact:true})).toHaveCount(0)
})
test('local quota failure aborts OLGA changes and rolls back partially written settings',async({page})=>{
 await settings(page);const before=await page.evaluate(()=>localStorage.getItem('mm:settings'))
 await select(page);await page.getByLabel('Also restore preferences',{exact:true}).check()
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='mm:settings'&&JSON.parse(value).locale==='it')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,key,value)}})
 await page.getByRole('button',{name:'Merge into library',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Not enough space')
 const value=await entries(page);expect(value.entries).toHaveLength(0);expect(value.sources).toHaveLength(0);expect(value.songs).toHaveLength(0);expect(await page.evaluate(()=>localStorage.getItem('mm:settings'))).toBe(before)
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
})
for(const committed of [false,true])test(`startup recovery ${committed?'retains committed':'rolls back interrupted'} restore`,async({page})=>{
 await settings(page)
 await page.evaluate(async({song,committed})=>{
   const id='interrupted',previous=localStorage.getItem('mm:user-songs'),next=JSON.stringify([song]);localStorage.setItem('mm:user-songs',next)
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('musicmaestro-backup-journal',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
   await new Promise<void>((resolve,reject)=>{const tx=db.transaction('journal','readwrite');tx.objectStore('journal').put({key:'restore',id,previous:{'mm:user-songs':previous},next:{'mm:user-songs':next}});tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error)});db.close()
   if(committed){const olga=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('musicmaestro-olga',1);r.onsuccess=()=>resolve(r.result)});await new Promise<void>(resolve=>{const tx=olga.transaction('sources','readwrite');tx.objectStore('sources').put({key:'backup-commit:'+id,batch:'backup-commit',text:'committed'});tx.oncomplete=()=>resolve()});olga.close()}
 },{song,committed})
 await page.reload();await expect(page.getByRole('heading',{name:'Backup and restore',exact:true})).toBeVisible()
 expect((await entries(page)).songs).toEqual(committed?[song]:[])
 expect((await entries(page)).sources).toHaveLength(0)
})
test('a large backup crosses source batches and duplicate-comparison batches without losing documents',async({page})=>{
 test.setTimeout(90000)
 const fixture=unzipSync(backup()),manifest=JSON.parse(strFromU8(fixture['manifest.json'])),template=manifest.documents[0],files:Record<string,Uint8Array>={}
 manifest.documents=Array.from({length:600},(_,index)=>{
   const text=source+`\nOriginal document ${index}\n`,file=`olga/${String(index).padStart(6,'0')}.txt`
   files[file]=strToU8(text)
   return {...template,file,sha256:createHash('sha256').update(text).digest('hex'),entry:{...template.entry,id:`doc-${index}`,sourceKey:`old-${index}`,title:`Study ${index}`,baseTitle:`Study ${index}`,digest:`digest-${index}`}}
 })
 files['manifest.json']=strToU8(JSON.stringify(manifest));const buffer=Buffer.from(zipSync(files))
 await settings(page);await select(page,buffer);await expect(page.getByLabel('Backup preview',{exact:true})).toContainText('600 OLGA documents',{timeout:30000})
 await page.getByRole('button',{name:'Merge into library',exact:true}).click();await expect(page.getByRole('dialog',{name:'Backup restored',exact:true})).toContainText('Added 1 songs and 600 OLGA documents',{timeout:30000})
 await page.getByRole('button',{name:'Reopen app',exact:true}).click()
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download full backup',exact:true}).click();const path=await (await download).path(),exported=unzipSync(await readFile(path!))
 const result=JSON.parse(strFromU8(exported['manifest.json']));expect(result.documents).toHaveLength(600)
 for(const document of result.documents)expect(strFromU8(exported[document.file])).toContain(`Original document ${document.entry.id.slice(4)}\n`)
 await select(page,Buffer.from(await readFile(path!)));await page.getByRole('button',{name:'Merge into library',exact:true}).click();await expect(page.getByRole('dialog',{name:'Backup restored',exact:true})).toContainText('Added 0 songs and 0 OLGA documents. Skipped 601 identical copies.',{timeout:30000})
})
