import {test,expect} from './fixtures/browser'
import process from 'node:process'
import {writeFileSync} from 'node:fs'

if(process.env.MM_OLGA_ARCHIVE)test('full local OLGA archive round trip',async({page},testInfo)=>{
 const path=process.env.MM_OLGA_ARCHIVE
 test.setTimeout(600000)
 const started=Date.now()
 const reporter=setInterval(()=>{void page.locator('section[aria-label="Import OLGA Archive"]').innerText({timeout:1000}).then(text=>console.log('OLGA progress:',text.slice(0,900))).catch(()=>{})},20000)
 page.on('close',()=>clearInterval(reporter))
 await page.goto('/');await page.getByRole('button',{name:'import olga archive',exact:true}).click()
 await page.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles(path!)
 const confirm=page.getByRole('button',{name:'Import into library',exact:true})
 await expect(confirm).toBeVisible({timeout:180000})
 const keep=page.getByRole('button',{name:'Keep remaining names separate and confirm',exact:true})
 if(await keep.isVisible())await keep.click()
 await confirm.click()
 await expect(page.getByText('Import complete:',{exact:false})).toBeVisible({timeout:240000})
 const first=await page.getByRole('region',{name:'Import OLGA Archive'}).textContent().catch(()=>page.locator('section[aria-label="Import OLGA Archive"]').textContent())
 await page.screenshot({path:testInfo.outputPath('full-archive.png')})
 const count=async()=>page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const request=indexedDB.open('musicmaestro-olga',1);request.onsuccess=()=>resolve(request.result)})
  return new Promise<number>(resolve=>{const request=db.transaction('entries').objectStore('entries').count();request.onsuccess=()=>{resolve(request.result);db.close()}})
 })
 const imported=await count();expect(imported).toBeGreaterThan(20000)
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByRole('searchbox').fill('metallica')
 await expect(page.locator('.mm-artist').filter({hasText:/metallica/i})).toBeVisible()
 await page.reload()
 expect(await count()).toBe(imported)
 await page.getByRole('button',{name:'import olga archive',exact:true}).click()
 await page.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles(path!)
 await expect(confirm).toBeVisible({timeout:180000});if(await keep.isVisible())await keep.click()
 await confirm.click()
 await expect(page.getByText('Import complete: 0 added,',{exact:false})).toBeVisible({timeout:240000})
 expect(await count()).toBe(imported)
 const result={imported,first,reimport:await page.locator('section[aria-label="Import OLGA Archive"]').textContent(),elapsedSeconds:(Date.now()-started)/1000}
 clearInterval(reporter)
 console.log('OLGA full archive:',JSON.stringify(result))
 writeFileSync(testInfo.outputPath('full-archive-result.json'),JSON.stringify(result,null,2))
})
