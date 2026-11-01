import { expect,test } from '@playwright/test';
test('production build loads all lazy pages, editor data roundtrip and audio-free autoscroll',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>errors.push(`${request.url()}: ${request.failure()?.errorText}`))
 await page.goto('/');await expect(page.locator('.mm-artist').first()).toBeVisible()
 for(const index of [3,2,1,0]){await page.locator('nav button').nth(index).click();await expect(page.locator('main')).not.toHaveText('Loading…')}
 await page.locator('nav button').nth(2).click();await page.getByRole('button',{name:'+ New song',exact:true}).click();await page.getByLabel('Song name',{exact:true}).fill('Production song');await page.keyboard.press('Enter')
 await page.getByRole('button',{name:/Tabs/}).click();await page.locator('table tbody button').first().click();await page.getByRole('button',{name:'+ Save',exact:true}).click();await page.getByRole('button',{name:'Practice',exact:true}).last().click()
 await expect(page.locator('.mm-renderer-body svg')).toBeVisible();await page.getByRole('tab',{name:'Standard notation',exact:true}).click();await expect(page.locator('.mm-renderer-body svg')).toBeVisible()
 await page.evaluate(()=>{window.audioStarts=0;const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=original.call(this);const start=source.start.bind(source);source.start=(...args:Parameters<typeof source.start>)=>{window.audioStarts++;start(...args)};return source}})
 await page.getByRole('button',{name:'▶ Autoscroll',exact:true}).click();expect(await page.evaluate(()=>window.audioStarts)).toBe(0);await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toHaveCount(0)
 await page.reload();await page.locator('nav button').nth(2).click();await expect(page.getByRole('button',{name:/Production song/})).toBeVisible();expect(errors).toEqual([])
})
test.describe('uncached chunk recovery',()=>{
test.use({serviceWorkers:'block'})
test('failed lazy page loading presents a recovery action',async({page})=>{
 await page.route('**/assets/EditorPage-*.js',route=>route.abort('failed'))
 await page.goto('/');await expect(page.locator('.mm-artist').first()).toBeVisible();await page.locator('nav button').nth(2).click()
 await expect(page.getByRole('alert')).toContainText('Page could not load');await expect(page.getByRole('button',{name:'Reload',exact:true})).toBeVisible()
})
})
