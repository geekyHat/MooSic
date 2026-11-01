import AxeBuilder from '@axe-core/playwright';
import { expect,test } from './fixtures/browser';
import { song } from './fixtures/songs';
for(const width of [320,375,768,1280])for(const locale of ['it','en'])for(const theme of ['theme-default','theme-dark'])test(`matrix ${width}px ${locale} ${theme}, keyboard/200%/reduced motion`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'})
 await page.addInitScript(({fixture,locale,theme})=>{
  localStorage.setItem('mm:user-songs',JSON.stringify([fixture]));localStorage.setItem('mm:settings',JSON.stringify({locale,theme,enabled:['instrument-guitar',theme,'storage-local','parser-abc','renderer-tab','renderer-notation','transport-guitar','content-user'],config:{}}))
 },{fixture:song(),locale,theme})
 await page.goto('/');await expect(page.locator('.mm-artist')).toBeVisible()
 for(const index of [0,3,2]){
  await page.locator('nav button').nth(index).focus();await page.keyboard.press('Enter')
  await expect(page.locator('nav button').nth(index)).toHaveAttribute('aria-current','page')
  // Wait for the lazy page and its focus handoff, not just shell selection.
  await expect(page.locator('main h2').first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const result=await new AxeBuilder({page}).analyze();expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??'')).map(v=>v.id)).toEqual([])
 }
 await page.getByRole('button',{name:/Fixture/}).click();await page.getByRole('button',{name:locale==='it'?'Pratica':'Practice',exact:true}).last().click()
 await expect(page.locator('.mm-renderer-body svg')).toBeVisible()
 const practice=await new AxeBuilder({page}).analyze();expect(practice.violations.filter(v=>['serious','critical'].includes(v.impact??'')).map(v=>v.id)).toEqual([])
 await page.evaluate(()=>{document.documentElement.style.zoom='2'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await testInfo.attach(`matrix-${width}-${locale}-${theme}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'})
})
