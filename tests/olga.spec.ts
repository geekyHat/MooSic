import {test,expect} from './fixtures/browser'
import {zipSync,strToU8} from 'fflate'
import type {Page} from '@playwright/test'

const source='Title: Evening study\nArtist: Ada Example\n\n  Am        G\nOriginal study line\ne|--0--3--|\nB|--1--0--|\nG|--2--0--|\nD|--2--0--|\nA|--0--2--|\nE|-----3--|\nPrivate original fixture notice\n'
function archive(extra=false){return Buffer.from(zipSync({
 'OLGA Archive/main 2/e/example_ada/evening.crd':strToU8(source),
 'OLGA Archive/oct97/main/e/example_ada/evening.crd':strToU8(source),
 'OLGA Archive/main 3/e/example_ada/variant.crd':strToU8(source.replace('--0--3--','--0--5--')),
 'OLGA Archive/bass/e/example_ada/bass.btab':strToU8('Title: Bass exercise\nG|--2---|\nD|----3-|\nA|--0---|\nE|------|'),
 'OLGA Archive/chordpro/e/Ada.Example/chord.chopro':strToU8('{title: Inline exercise}\n{st: Ada Example}\n[Am]Original [G]study'),
 'OLGA Archive/resources/utilities/readme.txt':strToU8('not music'),
 'OLGA Archive/main.tgz':strToU8('packed duplicate'),
 ...(extra?{'OLGA Archive/acoustic/e/example_ada/new.tab':strToU8('Title: New acoustic exercise\ne|--1--|\nB|--1--|\nG|--2--|\nD|--3--|\nA|--3--|\nE|--1--|')}:{}),
}))}
async function select(page:Page,buffer:Buffer){await page.getByRole('button',{name:'import olga archive',exact:true}).click();await page.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles({name:'OLGA Archive.zip',mimeType:'application/zip',buffer})}
async function stored(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('musicmaestro-olga',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return new Promise<{artist:string;title:string;instrument:string}[]>(resolve=>{const req=db.transaction('entries').objectStore('entries').getAll();req.onsuccess=()=>{resolve(req.result);db.close()}})})}

test('OLGA ZIP imports locally, preserves originals, groups artists and updates without duplicates',async({page})=>{
 await page.goto('/');await select(page,archive())
 await page.getByRole('button',{name:'Import into library',exact:true}).click()
 await expect(page.getByText('Import complete: 4 added, 1 duplicates skipped, 1 numbered titles.',{exact:true})).toBeVisible()
 await expect(page.locator('.mm-artist').filter({hasText:'Ada Example'})).toHaveCount(1)
 const entries=await stored(page)
 expect(new Set(entries.map(e=>e.artist))).toEqual(new Set(['Ada Example']))
 expect(entries.map(e=>e.title)).toContain('Evening study (1)')
 expect(entries.some(e=>e.instrument==='Basso')).toBe(true)
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.locator('.mm-artist').filter({hasText:'Ada Example'}).getByRole('button',{name:'Open',exact:true}).click()
 await page.locator('.mm-song').filter({has:page.getByRole('heading',{name:'Evening study',exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
 await expect(page.getByLabel('OLGA document',{exact:true})).toHaveText(source)
 await expect(page.getByRole('button',{name:'▶ Autoscroll',exact:true})).toBeVisible()
 await expect(page.locator('.mm-chord-diagrams')).toHaveCount(0)
 await page.reload()
 await page.goto('/#/library')
 await expect(page.locator('.mm-artist').filter({hasText:'Ada Example'})).toHaveCount(1)
 await select(page,archive(true))
 await page.getByRole('button',{name:'Import into library',exact:true}).click()
 await expect(page.getByText('Import complete: 1 added, 5 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
 expect((await stored(page)).length).toBe(5)
})

test('similar OLGA artist requires confirmation and cancellation leaves the library unchanged',async({page})=>{
 await page.goto('/')
 const zip=Buffer.from(zipSync({'OLGA Archive/main/b/beethoven/test.tab':strToU8('Title: Original test\ne|--0--|')}))
 await select(page,zip)
 await expect(page.getByRole('button',{name:'Import into library',exact:true})).toBeDisabled()
 const artist=page.getByLabel('Final artist beethoven',{exact:true})
 await artist.fill('Ludwig van Beethoven')
 await page.getByLabel('I confirm this artist',{exact:true}).check()
 await page.getByRole('button',{name:'Close',exact:true}).click()
 expect(await stored(page)).toHaveLength(0)
 await select(page,zip)
 await page.getByLabel('Final artist beethoven',{exact:true}).fill('Ludwig van Beethoven')
 await page.getByLabel('I confirm this artist',{exact:true}).check()
 await page.getByRole('button',{name:'Import into library',exact:true}).click()
 await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
 expect((await stored(page))[0].artist).toBe('Ludwig van Beethoven')
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await select(page,zip)
 await expect(page.getByLabel('Final artist beethoven',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Import into library',exact:true}).click()
 await expect(page.getByText('Import complete: 0 added, 1 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
})

test('corrupt and unsafe ZIPs do not change the library; OLGA panel fits a phone',async({page})=>{
 await page.setViewportSize({width:320,height:850});await page.goto('/')
 await select(page,Buffer.from('not a ZIP'))
 await expect(page.getByRole('alert')).toContainText('ZIP non valido')
 await page.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles({name:'unsafe.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync({'OLGA Archive/main/a/../escape.tab':strToU8('e|--0--|')}))})
 await expect(page.getByRole('alert')).toContainText('Percorso ZIP non sicuro')
 expect(await stored(page)).toHaveLength(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('already imported OLGA documents recognize explicit chord markers and scroll without changing their source',async({page},testInfo)=>{
 const original='{title: Inline reading study}\n{artist: Ada Example}\n[Verse 1]\nAm     G\n'+Array.from({length:60},(_,i)=>`[Am]Original line ${i+1} [G/B] [Cadd9]`).join('\n')
 const zip=Buffer.from(zipSync({'OLGA Archive/chordpro/e/example_ada/inline.chopro':strToU8(original)}))
 await page.setViewportSize({width:320,height:850})
 await page.addInitScript(()=>{window.audioStarts=0;window.AudioContext=new Proxy(AudioContext,{construct(target,args){window.audioStarts++;return Reflect.construct(target,args)}})})
 await page.goto('/');await select(page,zip)
 await page.getByRole('button',{name:'Import into library',exact:true}).click()
 await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Close',exact:true}).click()
 // Reopening persisted data exercises the same path as an archive imported before this feature.
 await page.reload()
 await page.locator('.mm-artist').filter({hasText:'Ada Example'}).getByRole('button',{name:'Open',exact:true}).click()
 await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
 const document=page.getByLabel('OLGA document',{exact:true})
 expect(await document.textContent()).toBe(original)
 await expect(document.locator('[data-chord="Am"]')).toHaveCount(60)
 await expect(document.locator('[data-chord="G/B"]')).toHaveCount(60)
 await expect(document.locator('[data-chord="Verse 1"]')).toHaveCount(0)
 await expect(document.locator('[data-chord="G"]')).toHaveCount(0)
 await expect(page.locator('.mm-chord-diag')).toHaveCount(3)
 await expect(page.locator('.mm-chord-diag').filter({has:page.getByRole('img',{name:'Am',exact:true})})).toHaveCount(1)
 await expect(page.locator('.mm-chord-diag').filter({hasText:'Cadd9'})).toContainText('Diagram unavailable')
 await page.getByRole('button',{name:'▶ Autoscroll',exact:true}).click()
 await expect.poll(()=>page.locator('main').evaluate(element=>element.scrollTop)).toBeGreaterThan(10)
 await page.getByRole('button',{name:'⏸ Pause autoscroll',exact:true}).click()
 expect(await page.evaluate(()=>window.audioStarts)).toBe(0)
 expect(await document.textContent()).toBe(original)
 expect(await page.locator('main').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
 await page.screenshot({path:testInfo.outputPath('olga-autoscroll-320.png')})
})
