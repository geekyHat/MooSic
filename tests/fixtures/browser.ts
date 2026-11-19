import { test as base,expect,type Page } from '@playwright/test'
export const test=base.extend<{runtimeErrors:string[]}>({
 runtimeErrors:[async({page},use)=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`))
  await use(errors)
  expect(errors,'Runtime errors and failed network requests').toEqual([])
 },{auto:true}],
})
export { expect }
export async function chooseArrangement(page:Page,kind:string){
 await expect(page.locator('.mm-version, [data-navigation-page="practice"]').first()).toBeVisible()
 if(await page.locator('.mm-version').count())await page.locator('.mm-version').getByRole('button',{name:kind,exact:true}).first().click()
}
export async function openUserSong(page:Page,artist='QA',kind='Lyrics + chords'){
 await page.goto('/#/library')
 await page.locator('.mm-artist').filter({hasText:artist}).getByRole('button',{name:'Open',exact:true}).click()
 await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
 await chooseArrangement(page,kind)
}
export async function chooseTunerPreset(page: Page, preset: 'guitar' | 'ukulele') {
  await page.getByRole('group', { name: 'Instrument', exact: true }).getByRole('button', { name: preset === 'guitar' ? 'Guitar' : 'Ukulele', exact: true }).click()
}
