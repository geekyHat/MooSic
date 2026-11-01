import {test,expect} from './fixtures/browser'
import {unzipSync,strFromU8,zipSync,strToU8} from 'fflate'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import type {Page} from '@playwright/test'

const song={id:'transfer-song',name:'Transfer study',artist:'LocalSend Artist',genre:'Folk',createdAt:1,arrangements:[{id:'lyrics',name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Original words'}],source:{format:'chordpro',text:'[Am]Original words'}}]}
const tab={...song,id:'transfer-tab',name:'Transfer TAB',arrangements:[{id:'tab',name:'TAB',kind:'tabs',tempo:80,bars:1,beatsPerBar:4,tabNotes:[{row:0,beat:0,fret:5}]}]}
const source='Original OLGA credits\r\n[Am]Original song text\r\n'
const archive=()=>Buffer.from(zipSync({'manifest.json':strToU8(JSON.stringify({format:'musicmaestro-backup',version:1,createdAt:'2026-11-02T00:00:00.000Z',songs:[song,tab],documents:[{file:'olga/000000.txt',sha256:createHash('sha256').update(source).digest('hex'),entry:{id:'transfer-olga',title:'OLGA study',baseTitle:'OLGA study',artist:'LocalSend Artist',artistFolder:'localsend artist',instrument:'Chitarra / accordi',category:'main',path:'main/l/localsend_artist/study.crd',format:'crd',digest:'source-digest',sourceKey:'source-key'}}]})),'olga/000000.txt':strToU8(source)}))
const panel=(page:Page)=>page.getByRole('region',{name:'Transfer with LocalSend',exact:true})
const prepared=(page:Page)=>page.getByLabel('Library ready to transfer',{exact:true})
async function prepare(page:Page){await page.goto('/#/settings');await panel(page).getByRole('button',{name:'Prepare library file',exact:true}).click();await expect(prepared(page)).toBeVisible()}
async function stored(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')??'[]'))}

test('a downloaded LocalSend library preserves TAB and original OLGA sources and merges on an independent device without duplication',async({page,browser})=>{
 const context=await browser.newContext({locale:'en-US',viewport:{width:320,height:850}}),mobile=await context.newPage()
 try{
  await page.goto('/#/settings');await page.getByLabel('Backup file',{exact:true}).setInputFiles({name:'seed.zip',mimeType:'application/zip',buffer:archive()})
  await page.getByRole('button',{name:'Merge into library',exact:true}).click();await page.getByRole('button',{name:'Reopen app',exact:true}).click()
  await prepare(page)
  const download=page.waitForEvent('download');await prepared(page).getByRole('button',{name:'Save file for LocalSend',exact:true}).click()
  const received=await download;expect(received.suggestedFilename()).toMatch(/^MooSic-library-\d{4}-\d{2}-\d{2}\.zip$/)
  const buffer=await readFile((await received.path())!),files=unzipSync(buffer),manifest=JSON.parse(strFromU8(files['manifest.json']))
  expect(manifest.songs).toEqual([song,tab]);expect(strFromU8(files[manifest.documents[0].file])).toBe(source)
  const existing={...song,id:'phone-song',name:'Phone study'}
  await mobile.addInitScript(existing=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([existing]))},existing)
  await mobile.goto('/#/settings')
  for(let round=0;round<2;round++){
   await panel(mobile).getByLabel('Received library file',{exact:true}).setInputFiles({name:received.suggestedFilename(),mimeType:'application/zip',buffer})
   await expect(mobile.getByLabel('Backup preview',{exact:true})).toContainText('2 songs · 1 OLGA documents')
   expect(await stored(mobile)).toHaveLength(round?3:1)
   await expect(mobile.getByLabel('Also restore preferences',{exact:true})).not.toBeChecked()
   await mobile.getByRole('button',{name:'Merge into library',exact:true}).click()
   await expect(mobile.getByRole('dialog',{name:'Backup restored',exact:true})).toContainText(round?'Added 0 songs and 0 OLGA documents. Skipped 3 identical copies.':'Added 2 songs and 1 OLGA documents.')
   await mobile.getByRole('button',{name:'Reopen app',exact:true}).click()
  }
  expect(await stored(mobile)).toEqual([existing,song,tab])
  const texts=await mobile.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('musicmaestro-olga',1);r.onsuccess=()=>resolve(r.result)});const rows=await new Promise<{text:string}[]>(resolve=>{const r=db.transaction('sources').objectStore('sources').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return rows.map(row=>row.text)})
  expect(texts).toEqual([source]);expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await context.close()}
})

test('native file sharing requires its own click; cancellation and failure keep the ZIP available without claiming delivery',async({page})=>{
 await page.addInitScript(()=>{
  Object.assign(window,{shareCalls:[],shareOutcome:'cancel'})
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files}:{files:File[]})=>files.length===1&&files[0].type==='application/zip'})
  Object.defineProperty(navigator,'share',{configurable:true,value:async({files}:{files:File[]})=>{
   Reflect.get(window,'shareCalls').push({name:files[0].name,active:navigator.userActivation.isActive,bytes:files[0].size})
   const outcome=Reflect.get(window,'shareOutcome')
   if(outcome==='cancel')throw new DOMException('Cancelled','AbortError')
   if(outcome==='fail')throw new DOMException('Blocked','NotAllowedError')
  }})
 })
 await prepare(page)
 expect(await page.evaluate(()=>Reflect.get(window,'shareCalls'))).toEqual([])
 await prepared(page).getByRole('button',{name:'Share…',exact:true}).click()
 await expect(prepared(page).getByRole('button',{name:'Share…',exact:true})).toBeEnabled()
 await expect(prepared(page)).not.toContainText('File handed to')
 await page.evaluate(()=>Reflect.set(window,'shareOutcome','fail'))
 await prepared(page).getByRole('button',{name:'Share…',exact:true}).click()
 await expect(prepared(page)).toContainText('Sharing unavailable. Save the file and send it from LocalSend.')
 await expect(prepared(page).getByRole('button',{name:'Save file for LocalSend',exact:true})).toBeEnabled()
 await page.evaluate(()=>Reflect.set(window,'shareOutcome','ok'))
 await prepared(page).getByRole('button',{name:'Share…',exact:true}).click()
 await expect(prepared(page)).toContainText('Check receipt in LocalSend, then import it in MooSic.')
 const calls=await page.evaluate(()=>Reflect.get(window,'shareCalls'));expect(calls).toHaveLength(3)
 expect(calls.every((call:{active:boolean;bytes:number})=>call.active&&call.bytes>0)).toBe(true)
 await prepared(page).getByRole('button',{name:'Dismiss prepared file',exact:true}).click();await expect(prepared(page)).toHaveCount(0)
 expect(await stored(page)).toEqual([])
})

for(const mode of ['missing','unsupported','throws'])test(`download remains available when native sharing is ${mode}`,async({page})=>{
 await page.addInitScript(mode=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:mode==='missing'?undefined:async()=>{throw new Error('Must not share')}})
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>{if(mode==='throws')throw new TypeError('Not supported');return false}})
 },mode)
 await prepare(page)
 await expect(prepared(page).getByRole('button',{name:'Share…',exact:true})).toHaveCount(0)
 await expect(prepared(page)).toContainText('Save the file, open LocalSend')
 const download=page.waitForEvent('download');await prepared(page).getByRole('button',{name:'Save file for LocalSend',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.zip$/)
})

test('Italian transfer instructions work at 320px, explain the separate app and reject invalid imports before writing',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/#/settings')
 await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('it')
 const region=page.getByRole('region',{name:'Trasferisci con LocalSend',exact:true})
 await expect(region).toBeVisible();await expect(region).toContainText('Installa LocalSend su entrambi i dispositivi')
 await expect(region.getByRole('link',{name:'Scarica LocalSend (sito esterno)',exact:true})).toHaveAttribute('href','https://localsend.org/download')
 await region.getByRole('button',{name:'Prepara file della libreria',exact:true}).click()
 await expect(page.getByLabel('Libreria pronta per il trasferimento',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const axe=await new AxeBuilder({page}).include('[aria-labelledby="library-transfer-title"]').analyze();expect(axe.violations.filter(item=>['serious','critical'].includes(item.impact??''))).toEqual([])
 await region.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('localsend-it-320.png'),fullPage:true})
 await region.getByLabel('File della libreria ricevuta',{exact:true}).setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('invalid')})
 await expect(page.getByRole('alert')).toBeVisible();expect(await stored(page)).toEqual([])
 await expect(page.getByLabel('Libreria pronta per il trasferimento',{exact:true})).toHaveCount(0)
})
