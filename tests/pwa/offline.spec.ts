import {chooseTunerPreset} from '../fixtures/browser'
import {openLegacySync} from '../fixtures/legacySync'
import {test,expect,type Page} from '@playwright/test'
import {scanImage,textPdf} from '../fixtures/scans'
import {zipSync,strToU8} from 'fflate'
const base='/MooSic/'
const song={id:'offline-song',name:'Offline study',artist:'Offline Artist',genre:'',createdAt:1,arrangements:[{id:'arr',name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Original offline words'}]}]}
async function ready(page:Page){await page.goto(base+'#/settings');await expect(page.getByText('Library and reading ready offline',{exact:true})).toBeVisible({timeout:30000});await page.evaluate(()=>navigator.serviceWorker.ready)}
async function switchVersion(page:Page,value:string){const response=await page.request.post('/__test/version?value='+value);expect(response.ok()).toBe(true)}
test.beforeEach(async({request})=>{await request.post('/__test/version?value=a')})
test('subpath manifest, verified precache and native install prompt support a fresh offline launch',async({page,context})=>{
 await page.addInitScript(song=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([song]))},song)
 await ready(page)
 const manifest=await (await page.request.get(base+'manifest.webmanifest')).json();expect(manifest.start_url).toBe(base);expect(manifest.scope).toBe(base)
 expect(manifest.name).toBe('MooSic');expect(manifest.short_name).toBe('MooSic')
 await expect(page).toHaveTitle('MooSic')
 const logo=page.getByRole('img',{name:'MooSic',exact:true})
 await expect(logo).toHaveAttribute('src',base+'Logo/MooSicLogo.png')
 expect(await logo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===1304)).toBe(true)
 const inventory=await (await page.request.get(base+'offline-inventory.json')).json()
 expect(inventory.core.some((file:{url:string})=>file.url===base+'Logo/MooSicLogo.png')).toBe(true)
 expect(inventory.core.some((file:{url:string})=>file.url.includes('/MooSic-icons/'))).toBe(false)
 for(const icon of manifest.icons)expect((await page.request.get(base+icon.src)).ok()).toBe(true)
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt');Object.assign(event,{prompt:async()=>{document.body.dataset.prompted='yes'},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(event)})
 await page.getByRole('button',{name:'Install MooSic',exact:true}).click();expect(await page.locator('body').getAttribute('data-prompted')).toBe('yes')
 await context.setOffline(true);const cold=await context.newPage();await page.close();await cold.goto(base)
 const offlineLogo=cold.getByRole('img',{name:'MooSic',exact:true})
 await expect(offlineLogo).toBeVisible();expect(await offlineLogo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===1304)).toBe(true)
 await cold.setViewportSize({width:375,height:900});await expect(offlineLogo).toHaveJSProperty('naturalWidth',192)
 await cold.setViewportSize({width:1280,height:720});await expect(offlineLogo).toHaveJSProperty('naturalWidth',1304)
 await expect(cold.locator('.mm-artist').filter({hasText:'Offline Artist'})).toBeVisible()
 await cold.locator('.mm-artist').filter({hasText:'Offline Artist'}).getByRole('button',{name:'Open',exact:true}).click();await cold.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
 await expect(cold.locator('.mm-chord-sheet')).toContainText('Original offline words');await cold.getByRole('button',{name:'Up one semitone',exact:true}).click();await expect(cold.locator('.mm-chord-sheet')).toContainText('A#m')
 await cold.getByRole('button',{name:'Tuner',exact:true}).click()
 await expect(cold.getByRole('heading',{name:'Guitar tuner',exact:true})).toBeVisible()
 await cold.getByRole('button',{name:/^String 6 E2/}).click()
 await expect(cold.getByRole('button',{name:'Manual',exact:true})).toHaveAttribute('aria-pressed','true')
 await chooseTunerPreset(cold,'ukulele')
 await expect(cold.locator('.mm-tuner-string')).toHaveCount(4)
 await cold.getByRole('button',{name:/^String 4 G4/}).click()
 await cold.reload();await expect(cold.getByRole('group',{name:'Instrument',exact:true}).getByRole('button',{name:'Ukulele',exact:true})).toHaveAttribute('aria-pressed','true')
 await cold.getByRole('button',{name:'← Back',exact:true}).click()
 for(const index of [2,3,0]){await cold.locator('nav button').nth(index).click();await expect(cold.locator('main')).not.toHaveText('Loading…')}
 await cold.reload();await expect(cold.locator('.mm-song')).toContainText('Offline study');await cold.goto(base+'#/library');await expect(cold.locator('.mm-artist').filter({hasText:'Offline Artist'})).toBeVisible()
 await cold.getByRole('button',{name:'import olga archive',exact:true}).click()
 await cold.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles({name:'OLGA Archive.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync({'OLGA Archive/chordpro/e/example_ada/offline.cho':strToU8('{t: Offline archive}\n{st: Ada Example}\n[Am]Original offline archive words')}))})
 await cold.getByRole('button',{name:'Import into library',exact:true}).click();await expect(cold.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
 await cold.getByRole('button',{name:'Close',exact:true}).click();await cold.locator('.mm-artist').filter({hasText:'Ada Example'}).getByRole('button',{name:'Open',exact:true}).click();await cold.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click();await expect(cold.getByLabel('OLGA document',{exact:true})).toContainText('Original offline archive words')
 await cold.reload();await expect(cold.getByLabel('OLGA document',{exact:true})).toContainText('Original offline archive words')
})
test('explicit recognition pack supports OCR and PDF on a cold offline launch',async({page,context})=>{
 await ready(page);await page.getByRole('button',{name:'Download offline photo/PDF tools',exact:true}).click();await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible({timeout:30000})
 await context.setOffline(true);const cold=await context.newPage();await page.close();await cold.goto(base)
 const image=await scanImage(cold);await cold.getByRole('button',{name:'Scan photo / PDF',exact:true}).click()
 await cold.getByLabel('Camera photo',{exact:true}).setInputFiles({name:'offline.png',mimeType:'image/png',buffer:Buffer.from(image.png,'base64')})
 await expect(cold.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true})).toHaveValue(/Morning light across the sea/,{timeout:60000})
 await cold.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true}).fill('')
 await cold.getByLabel('Photo or PDF',{exact:true}).setInputFiles({name:'offline.pdf',mimeType:'application/pdf',buffer:textPdf()})
 await expect(cold.getByText('Text read directly from PDF',{exact:true})).toBeVisible();await expect(cold.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true})).toHaveValue(/Morning light across the sea/)
})
test('coordinated update waits for a dirty tab, preserves libraries and keeps downloaded recognition tools',async({page,context})=>{
 await page.addInitScript(song=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([song]))},song)
 await ready(page);await page.getByRole('button',{name:'Download offline photo/PDF tools',exact:true}).click();await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible({timeout:30000})
 await expect(page.getByRole('complementary',{name:'Update available',exact:true})).toHaveCount(0)
 const old=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return r.active?.scriptURL})
 const peer=await context.newPage();await peer.goto(base+'#/editor');await peer.getByRole('button',{name:/Offline study/}).click();await peer.getByLabel('Song name',{exact:true}).fill('Unsaved draft')
 await switchVersion(page,'b');await page.getByRole('button',{name:'Check for updates',exact:true}).click()
 const notice=page.getByRole('complementary',{name:'Update available',exact:true});await expect(notice).toBeVisible({timeout:30000});await notice.getByRole('button',{name:'Install update',exact:true}).click()
 await expect(notice.getByRole('alert')).toContainText('every open tab');await expect(peer.getByLabel('Song name',{exact:true})).toHaveValue('Unsaved draft')
 const third=await context.newPage();await third.goto(base+'#/settings');await expect(third.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible()
 const inventory=await (await page.request.get(base+'offline-inventory.json')).json();expect(inventory.appBuild).toBe('test-commit')
 // Opening another old-build tab runs cache cleanup while the new version is waiting.
 await expect.poll(()=>page.evaluate(async version=>(await caches.keys()).some(key=>key.endsWith(version)),inventory.version)).toBe(true)
 await peer.getByLabel('Song name',{exact:true}).fill('Offline study');await peer.locator('nav button').nth(3).click();await expect(peer.getByRole('heading',{name:'Backup and restore',exact:true})).toBeVisible()
 await context.setOffline(true)
 await notice.getByRole('button',{name:'Install update',exact:true}).click()
 await expect(page.getByLabel('Version in use',{exact:true})).toContainText('1.1.2',{timeout:30000});await expect(notice).toHaveCount(0);await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible()
 const info=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;return {waiting:!!registration.waiting,keys:await caches.keys(),songs:JSON.parse(localStorage.getItem('mm:user-songs')??'[]'),script:registration.active?.scriptURL}})
 expect(info.waiting).toBe(false);expect(info.songs).toEqual([song]);expect(info.script).toBe(old)
 expect(info.keys.some(key=>key.endsWith(inventory.version))).toBe(true)
 await context.setOffline(true);await page.reload();await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible()
})
test('interrupted recognition download stays incomplete and resumes safely',async({page})=>{
 await ready(page);await page.request.post('/__test/fault?path=ita.traineddata.gz')
 await page.getByRole('button',{name:'Download offline photo/PDF tools',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Offline preparation failed',{timeout:15000})
 await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Download offline photo/PDF tools',exact:true}).click();await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible({timeout:30000})
})
test('a release with a corrupted file never replaces the usable offline version',async({page,context})=>{
 await ready(page);await switchVersion(page,'b')
 const inventory=await (await page.request.get(base+'offline-inventory.json')).json(),entry=inventory.core.find((file:{url:string;bytes:number})=>file.url.endsWith('.js')&&file.bytes>300000&&file.bytes<400000)
 expect(entry).toBeTruthy();await page.request.post('/__test/fault?corrupt=1&path='+encodeURIComponent(entry.url.slice(base.length)))
 await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Offline preparation failed',{timeout:15000})
 expect(await page.evaluate(async()=>!!(await navigator.serviceWorker.ready).waiting)).toBe(false)
 await context.setOffline(true);await page.reload();await expect(page.getByText('Library and reading ready offline',{exact:true})).toBeVisible()
})
test('HTTP-decoded gzip language files pass integrity verification and run OCR offline',async({page,context})=>{
 await page.request.post('/__test/encoding');await ready(page)
 await page.getByRole('button',{name:'Download offline photo/PDF tools',exact:true}).click();await expect(page.getByText('App ready offline, including photos and PDFs',{exact:true})).toBeVisible({timeout:30000})
 await context.setOffline(true);const cold=await context.newPage();await page.close();await cold.goto(base)
 const image=await scanImage(cold);await cold.getByRole('button',{name:'Scan photo / PDF',exact:true}).click()
 await cold.getByLabel('Camera photo',{exact:true}).setInputFiles({name:'encoded-language.png',mimeType:'image/png',buffer:Buffer.from(image.png,'base64')})
 await expect(cold.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true})).toHaveValue(/Morning light across the sea/,{timeout:60000})
})
test('two cached installations cold launch and sync over LAN while HTTP hosting is unavailable',async({page,browser})=>{
 test.setTimeout(90000)
 await page.addInitScript(song=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([song]))},song)
 const second=await browser.newContext({locale:'en-US'}),phone=await second.newPage()
 const sync=(device:Page)=>device.getByRole('region',{name:'Sync with another device',exact:true})
 try{
  await ready(page);await ready(phone)
  // Browser offline emulation also disables RTC. Fail every hosting HTTP request
  // instead, preserving LAN connectivity just as when Internet access is lost.
  await page.request.post('/__test/unavailable');expect((await page.request.get(base)).status()).toBe(503)
  await page.reload();await phone.reload()
  for(const device of [page,phone])await expect(device.getByText('Library and reading ready offline',{exact:true})).toBeVisible()
  await openLegacySync(page);await openLegacySync(phone)
  await sync(page).getByRole('button',{name:'1. Create pairing code',exact:true}).click();const offer=sync(page).getByLabel('Code to share',{exact:true});await expect(offer).not.toHaveValue('',{timeout:20000})
  await sync(phone).getByLabel('Received code or link',{exact:true}).fill(await offer.inputValue());await sync(phone).getByRole('button',{name:'Use received code',exact:true}).click();const answer=sync(phone).getByLabel('Code to share',{exact:true});await expect(answer).not.toHaveValue('',{timeout:20000})
  await sync(page).getByLabel('Received code or link',{exact:true}).fill(await answer.inputValue());await sync(page).getByRole('button',{name:'Use received code',exact:true}).click()
  await expect(sync(page).getByLabel('Verification code',{exact:true})).toBeVisible({timeout:20000});await expect(sync(phone).getByLabel('Verification code',{exact:true})).toHaveText(await sync(page).getByLabel('Verification code',{exact:true}).textContent()??'')
  for(const device of [page,phone])await sync(device).getByRole('button',{name:'Codes match — confirm',exact:true}).click()
  for(const device of [page,phone])await expect(sync(device).getByLabel('Received library verified',{exact:true})).toBeVisible({timeout:30000})
  for(const device of [page,phone]){await sync(device).getByRole('button',{name:'Merge received library',exact:true}).click();await expect(device.getByRole('dialog',{name:'Sync complete',exact:true})).toBeVisible();await device.getByRole('button',{name:'Reopen app',exact:true}).click()}
  await openLegacySync(phone);await expect(sync(phone)).toBeVisible();expect(await phone.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')??'[]'))).toEqual([song])
 }finally{await second.close()}
})
test('first QR access prepares the app and resumes real pairing after an installation prompt and icon launch',async({page,browser})=>{
 test.setTimeout(90000)
 await page.addInitScript(song=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([song]))},song)
 const second=await browser.newContext({locale:'en-US',viewport:{width:375,height:900}}),landing=await second.newPage()
 const sync=(device:Page)=>device.getByRole('region',{name:'Sync with another device',exact:true})
 try{
  await ready(page);await openLegacySync(page);await sync(page).getByRole('button',{name:'1. Create pairing code',exact:true}).click()
  const link=sync(page).getByLabel('Link to share',{exact:true});await expect(link).not.toHaveValue('',{timeout:20000})
  const requests:string[]=[];landing.on('request',request=>requests.push(request.url()))
  await landing.goto(await link.inputValue())
  const welcome=landing.getByRole('region',{name:'Bring your library to this device',exact:true})
  await expect(welcome).toBeVisible();await expect(welcome.getByText('The app is ready for offline reading.',{exact:true})).toBeVisible({timeout:30000})
  expect(await landing.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
  // The browser's OS dialog is simulated; the worker, cache, handoff and RTC transfer are real.
  await landing.evaluate(()=>{const event=new Event('beforeinstallprompt');Object.assign(window,{installPromptShown:false});Object.assign(event,{prompt:async()=>{Object.assign(window,{installPromptShown:true})},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(event)})
  expect(await landing.evaluate(()=>Reflect.get(window,'installPromptShown'))).toBe(false)
  await welcome.getByRole('button',{name:'Install MooSic',exact:true}).click()
  expect(await landing.evaluate(()=>Reflect.get(window,'installPromptShown'))).toBe(true)
  await expect(welcome.getByRole('heading',{name:'Installation confirmed',exact:true})).toHaveCount(0)
  await landing.evaluate(()=>window.dispatchEvent(new Event('appinstalled')))
  await expect(welcome.getByRole('heading',{name:'Installation confirmed',exact:true})).toBeVisible()
  const app=await second.newPage();await app.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));await app.goto(base)
  await expect(app).toHaveURL(/#\/settings$/);await expect(app.getByRole('region',{name:'Bring your library to this device',exact:true})).toHaveCount(0)
  await openLegacySync(app);await expect(sync(app).getByLabel('Received code or link',{exact:true})).toHaveValue(/^MM-SYNC1/)
  await landing.close()
  await sync(app).getByRole('button',{name:'Use received code',exact:true}).click()
  const answer=sync(app).getByLabel('Code to share',{exact:true});await expect(answer).not.toHaveValue('',{timeout:20000})
  await sync(page).getByLabel('Received code or link',{exact:true}).fill(await answer.inputValue());await sync(page).getByRole('button',{name:'Use received code',exact:true}).click()
  await expect(sync(page).getByLabel('Verification code',{exact:true})).toBeVisible({timeout:20000});await expect(sync(app).getByLabel('Verification code',{exact:true})).toHaveText(await sync(page).getByLabel('Verification code',{exact:true}).textContent()??'')
  for(const device of [page,app])await sync(device).getByRole('button',{name:'Codes match — confirm',exact:true}).click()
  await expect(sync(app).getByLabel('Received library verified',{exact:true})).toBeVisible({timeout:30000})
  expect(await app.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
  await sync(app).getByRole('button',{name:'Merge received library',exact:true}).click();await expect(app.getByRole('dialog',{name:'Sync complete',exact:true})).toBeVisible()
  await app.getByRole('button',{name:'Reopen app',exact:true}).click();await openLegacySync(app);await expect(sync(app)).toBeVisible()
  expect(await app.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')??'[]'))).toEqual([song])
  expect(requests.every(url=>!url.includes('sync=')&&!url.includes('MM-SYNC1'))).toBe(true)
  await app.goto(base);await expect(app).toHaveURL(/#\/library$/)
 }finally{await second.close()}
})

test('an activation request delivered to the already active worker does not freeze the app',async({page})=>{
 await ready(page)
 const result=await page.evaluate(()=>new Promise(resolve=>{
  const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();resolve(event.data)}
  navigator.serviceWorker.controller!.postMessage({type:'ACTIVATE_UPDATE'},[channel.port2])
 }))
 expect(result).toEqual({ok:true,alreadyActive:true})
 await expect(page.getByRole('alert').filter({hasText:'Updating…'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Check for updates',exact:true})).toBeEnabled()
 await expect(page.getByLabel('Version in use',{exact:true})).toContainText('1.1.1')
})

test('activation completes even when controllerchange is missed and the new release stays installed',async({page,context})=>{
 await page.addInitScript(()=>{
  const add=ServiceWorkerContainer.prototype.addEventListener
  ServiceWorkerContainer.prototype.addEventListener=function(type:string,listener:EventListenerOrEventListenerObject,options?:boolean|AddEventListenerOptions){
   if(type!=='controllerchange')add.call(this,type,listener,options)
  }
 })
 await ready(page);await switchVersion(page,'b')
 await page.getByRole('button',{name:'Check for updates',exact:true}).click()
 const notice=page.getByRole('complementary',{name:'Update available',exact:true})
 await expect(notice).toContainText('1.1.1 → 1.1.2',{timeout:30000})
 await notice.getByRole('button',{name:'Install update',exact:true}).click()
 await expect(page.getByLabel('Version in use',{exact:true})).toContainText('1.1.2',{timeout:30000})
 await expect(page.getByText('Update completed: 1.1.2',{exact:true})).toBeVisible()
 await expect(notice).toHaveCount(0)
 await context.setOffline(true);await page.reload()
 await expect(page.getByLabel('Version in use',{exact:true})).toContainText('1.1.2')
 await expect(notice).toHaveCount(0)
})

test('a stalled activation unlocks after its deadline and a retry safely completes',async({page})=>{
 await page.addInitScript(()=>{
  Reflect.set(window,'stallActivation',true)
  const send=ServiceWorker.prototype.postMessage
  ServiceWorker.prototype.postMessage=function(message:unknown,options?:Transferable[]|StructuredSerializeOptions){
   const transfer=Array.isArray(options)?options:options?.transfer
   if(message&&typeof message==='object'&&'type' in message&&message.type==='ACTIVATE_UPDATE'&&Reflect.get(window,'stallActivation')){
    (transfer?.[0] as MessagePort)?.postMessage({ok:true});return
   }
   Reflect.apply(send,this,[message,transfer??[]])
  }
 })
 await ready(page);await switchVersion(page,'b')
 await page.getByRole('button',{name:'Check for updates',exact:true}).click()
 const notice=page.getByRole('complementary',{name:'Update available',exact:true})
 await expect(notice).toBeVisible({timeout:30000})
 await page.clock.install()
 await notice.getByRole('button',{name:'Install update',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'Updating…'})).toBeVisible()
 await page.clock.fastForward(21000)
 await expect(page.getByRole('alert').filter({hasText:'Updating…'})).toHaveCount(0)
 await expect(page.getByText('Activation did not finish in time. Retry the update.',{exact:true})).toBeVisible()
 expect(await page.locator('.mm-shell').getAttribute('inert')).toBeNull()
 await page.evaluate(()=>Reflect.set(window,'stallActivation',false))
 await page.clock.resume()
 await notice.getByRole('button',{name:'Install update',exact:true}).click()
 await expect(page.getByLabel('Version in use',{exact:true})).toContainText('1.1.2',{timeout:30000})
 await expect(notice).toHaveCount(0)
})
