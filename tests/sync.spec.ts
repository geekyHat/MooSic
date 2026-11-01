import {test,expect,type Page} from '@playwright/test'
const song=(id:string,words:string)=>({id,name:id,artist:'Sync Artist',genre:'Folk',createdAt:1,arrangements:[{id:'arr-'+id,name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:words}],source:{format:'chordpro',text:'[Am]'+words}}]})
async function seed(page:Page,songs:ReturnType<typeof song>[]){await page.addInitScript(songs=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify(songs))},songs)}
const panel=(page:Page)=>page.getByRole('region',{name:'Sync with another device',exact:true})
async function start(pc:Page,mobile:Page,qr=false){
 await pc.goto('/#/settings');await panel(pc).getByRole('button',{name:'1. Create pairing code',exact:true}).click()
 const link=panel(pc).getByLabel('Link to share',{exact:true});await expect(link).not.toHaveValue('',{timeout:20000})
 if(qr){
   await mobile.goto('/#/settings');await expect(panel(pc).getByAltText('Pairing QR code',{exact:true})).toBeVisible()
   const image=await panel(pc).getByAltText('Pairing QR code',{exact:true}).getAttribute('src')
   await panel(mobile).getByLabel('QR image',{exact:true}).setInputFiles({name:'offer.png',mimeType:'image/png',buffer:Buffer.from(image!.split(',')[1],'base64')})
   await expect(panel(mobile).getByLabel('Received code or link',{exact:true})).toHaveValue(/^MM-SYNC1/)
 }else{await mobile.goto(await link.inputValue());await expect(panel(mobile).getByLabel('Received code or link',{exact:true})).toHaveValue(/^MM-SYNC1/)}
 await panel(mobile).getByRole('button',{name:'Use received code',exact:true}).click()
 const reply=panel(mobile).getByLabel('Code to share',{exact:true});await expect(reply).not.toHaveValue('',{timeout:20000})
 await panel(pc).getByLabel('Received code or link',{exact:true}).fill(await reply.inputValue());await panel(pc).getByRole('button',{name:'Use received code',exact:true}).click()
 await expect(panel(pc).getByLabel('Verification code',{exact:true})).toBeVisible({timeout:20000})
 await expect(panel(mobile).getByLabel('Verification code',{exact:true})).toHaveText(await panel(pc).getByLabel('Verification code',{exact:true}).textContent()??'')
}
async function stored(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')??'[]'))}

test('two independent devices exchange encrypted libraries, require both consents and merge without duplicates',async({page,browser})=>{
 test.setTimeout(90000)
 const context=await browser.newContext({locale:'en-US',viewport:{width:375,height:850}}),mobile=await context.newPage()
 try{
  await seed(page,[song('PC study','Original PC words'),song('Shared','Shared words')]);await seed(mobile,[song('Mobile study','Original mobile words'),song('Shared','Shared words')])
  await start(page,mobile)
  await panel(page).getByRole('button',{name:'Codes match — confirm',exact:true}).click();await expect(panel(page).getByText('Waiting for confirmation on the other device…',{exact:true})).toBeVisible()
  expect(await stored(page)).toHaveLength(2);expect(await stored(mobile)).toHaveLength(2)
  await panel(mobile).getByRole('button',{name:'Codes match — confirm',exact:true}).click()
  for(const device of [page,mobile])await expect(panel(device).getByLabel('Received library verified',{exact:true})).toContainText('2 songs · 0 OLGA documents',{timeout:30000})
  expect(await stored(page)).toHaveLength(2);expect(await stored(mobile)).toHaveLength(2)
  await panel(page).getByRole('button',{name:'Merge received library',exact:true}).click();await expect(page.getByRole('dialog',{name:'Sync complete',exact:true})).toContainText('Added 1 songs and 0 OLGA documents. Skipped 1 identical copies.')
  await panel(mobile).getByRole('button',{name:'Merge received library',exact:true}).click();await expect(mobile.getByRole('dialog',{name:'Sync complete',exact:true})).toBeVisible()
  expect((await stored(page)).map((s:{id:string})=>s.id).sort()).toEqual(['Mobile study','PC study','Shared']);expect((await stored(mobile)).map((s:{id:string})=>s.id).sort()).toEqual(['Mobile study','PC study','Shared'])
  await page.getByRole('button',{name:'Reopen app',exact:true}).click();await expect(panel(page)).toBeVisible()
 }finally{await context.close()}
})
test('QR image pairing works at 320px and cancelled verified transfers do not write local data',async({page,browser})=>{
 test.setTimeout(90000);await page.setViewportSize({width:320,height:850})
 const context=await browser.newContext({locale:'en-US'}),mobile=await context.newPage()
 try{
  await seed(page,[song('PC study','Words')]);await seed(mobile,[song('Phone study','Different words')]);await start(page,mobile,true)
  for(const device of [page,mobile])await panel(device).getByRole('button',{name:'Codes match — confirm',exact:true}).click()
  for(const device of [page,mobile])await expect(panel(device).getByLabel('Received library verified',{exact:true})).toBeVisible({timeout:30000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await panel(page).getByRole('button',{name:'Cancel pairing',exact:true}).click();await panel(mobile).getByRole('button',{name:'Cancel pairing',exact:true}).click()
  expect((await stored(page)).map((s:{id:string})=>s.id)).toEqual(['PC study']);expect((await stored(mobile)).map((s:{id:string})=>s.id)).toEqual(['Phone study'])
 }finally{await context.close()}
})
test('invalid codes and camera denial expose usable fallbacks without changing libraries',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))})})
 await seed(page,[song('Untouched','Original words')]);await page.goto('/#/settings')
 await panel(page).getByLabel('Received code or link',{exact:true}).fill('https://example.invalid/#bad');await panel(page).getByRole('button',{name:'Use received code',exact:true}).click();await expect(panel(page).getByRole('alert')).toContainText('Invalid or incomplete code')
 await panel(page).getByRole('button',{name:'1. Create pairing code',exact:true}).click();await expect(panel(page).getByLabel('Code to share',{exact:true})).not.toHaveValue('',{timeout:20000})
 await panel(page).getByRole('button',{name:'Cancel pairing',exact:true}).click()
 await panel(page).getByLabel('Received code or link',{exact:true}).fill('invalid after cancellation');await panel(page).getByRole('button',{name:'Use received code',exact:true}).click();await expect(panel(page).getByRole('alert')).toContainText('Invalid or incomplete code')
 await panel(page).getByRole('button',{name:'Scan QR with camera',exact:true}).click();await expect(panel(page).getByText('Camera unavailable. Paste the code or open a QR image instead.',{exact:true})).toBeVisible()
 expect((await stored(page)).map((s:{id:string})=>s.id)).toEqual(['Untouched'])
})
test('active pairing guards navigation and backup commands until explicit cancellation',async({page})=>{
 await seed(page,[song('Untouched','Original words')]);await page.goto('/#/settings')
 await panel(page).getByRole('button',{name:'1. Create pairing code',exact:true}).click();await expect(panel(page).getByLabel('Code to share',{exact:true})).not.toHaveValue('',{timeout:20000})
 await expect(page.getByRole('button',{name:'Download full backup',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Open backup',exact:true})).toBeDisabled()
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Library',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Keep editing',exact:true}).click()
 await expect(panel(page).getByLabel('Code to share',{exact:true})).not.toHaveValue('')
 await panel(page).getByRole('button',{name:'Cancel pairing',exact:true}).click();await expect(page.getByRole('button',{name:'Download full backup',exact:true})).toBeEnabled()
 expect((await stored(page)).map((s:{id:string})=>s.id)).toEqual(['Untouched'])
})
test('large OLGA sources, TAB and conflicting edits survive transfer and a repeated sync is idempotent',async({page,browser})=>{
 test.setTimeout(120000)
 const context=await browser.newContext({locale:'en-US'}),mobile=await context.newPage()
 const tab={id:'TAB study',name:'TAB study',artist:'Sync Artist',genre:'Classical',createdAt:1,arrangements:[{id:'tab-arr',name:'Tabs',kind:'tabs',tempo:100,bars:1,beatsPerBar:4,tabNotes:[{row:0,beat:0,fret:5},{row:1,beat:1,fret:3}]}]}
 try{
  await page.addInitScript(songs=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify(songs))},[song('Edited study','PC original'),tab])
  await seed(mobile,[song('Edited study','Phone edited')]);await page.goto('/#/settings');await expect(panel(page)).toBeVisible()
  const original=await page.evaluate(async()=>{
   let text='Original synthetic source notice\r\n[Am]Large library study\r\n'
   for(let n=0;n<7;n++){const bytes=crypto.getRandomValues(new Uint8Array(65536));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));text+=btoa(binary)+'\r\n'}
   const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('musicmaestro-olga',1);r.onsuccess=()=>resolve(r.result)})
   await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['entries','sources'],'readwrite');tx.objectStore('sources').put({key:'sync-large-source',batch:'committed',text});tx.objectStore('entries').put({id:'sync-olga',title:'Large original study',baseTitle:'Large original study',artist:'Sync Artist',artistFolder:'artist sync',instrument:'Chitarra / accordi',category:'main',path:'main/s/sync_artist/large.cho',format:'cho',digest:'large-source',sourceKey:'sync-large-source'});tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error)});db.close();return text
  })
  for(let round=0;round<2;round++){
   await start(page,mobile)
   for(const device of [page,mobile])await panel(device).getByRole('button',{name:'Codes match — confirm',exact:true}).click()
   for(const device of [page,mobile])await expect(panel(device).getByLabel('Received library verified',{exact:true})).toBeVisible({timeout:45000})
   for(const device of [page,mobile]){await panel(device).getByRole('button',{name:'Merge received library',exact:true}).click();await expect(device.getByRole('dialog',{name:'Sync complete',exact:true})).toBeVisible();if(round)await expect(device.getByRole('dialog')).toContainText('Added 0 songs and 0 OLGA documents');await device.getByRole('button',{name:'Reopen app',exact:true}).click()}
   for(const device of [page,mobile]){
    const songs=await stored(device);expect(songs).toHaveLength(3);expect(songs.find((s:{id:string})=>s.id==='TAB study')).toEqual(tab)
    expect(songs.filter((s:{arrangements:{kind:string}[]})=>s.arrangements[0].kind==='lyrics').map((s:{arrangements:{chordBars:{lyric:string}[]}[]})=>s.arrangements[0].chordBars[0].lyric).sort()).toEqual(['PC original','Phone edited'])
   }
  }
  const received=await mobile.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('musicmaestro-olga',1);r.onsuccess=()=>resolve(r.result)});const rows=await new Promise<{text:string}[]>(resolve=>{const r=db.transaction('sources').objectStore('sources').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return rows.map(row=>row.text)})
  expect(received).toEqual([original])
 }finally{await context.close()}
})
