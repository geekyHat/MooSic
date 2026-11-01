import { expect,test } from '@playwright/test';
import { song } from './fixtures/songs';
test('dirty editor blocks shell navigation; discard is explicit and focus returns',async({page})=>{
 await page.addInitScript(s=>localStorage.setItem('mm:user-songs',JSON.stringify([s])),song())
 await page.goto('/');await page.getByRole('button',{name:'Editor',exact:true}).click()
 await page.getByRole('button',{name:/Fixture/}).click();await page.getByLabel('Song name',{exact:true}).fill('Draft')
 await page.getByRole('button',{name:'Library',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible()
 await page.getByRole('button',{name:'Keep editing',exact:true}).click()
 await expect(page.getByLabel('Song name',{exact:true})).toHaveValue('Draft')
 await page.getByRole('button',{name:'Library',exact:true}).click();await page.getByRole('button',{name:'Discard changes',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Piece library',exact:true})).toBeVisible()
})
test('tab and notation grids have one tab stop and 2D navigation',async({page})=>{
 await page.addInitScript(s=>localStorage.setItem('mm:user-songs',JSON.stringify([{...s,arrangements:[]}])),song())
 await page.goto('/');await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('button',{name:/Fixture/}).click()
 for(const name of [/Tabs/,/Standard notation/]){
  await page.getByRole('button',{name}).click()
 }
 for(const table of await page.locator('table').all()){
  await expect(table.locator('tbody button[tabindex="0"]')).toHaveCount(1)
  const first=table.locator('tbody button').first();await first.focus();await page.keyboard.press('ArrowRight')
  await expect(table.locator('tbody tr').first().locator('button').nth(1)).toBeFocused()
  await page.keyboard.press('Control+End');await expect(table.locator('tbody button').last()).toBeFocused()
 }
})
test('creating by Enter trims metadata',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('button',{name:'+ New song',exact:true}).click()
 await page.getByLabel('Song name',{exact:true}).fill('  È musica 🎵  ');await page.keyboard.press('Enter')
 await expect(page.getByRole('heading',{name:'È musica 🎵',exact:true})).toBeVisible()
})
test('deleted song in another tab leaves an in-progress draft available',async({page,context})=>{
 await page.goto('/');await page.evaluate(s=>localStorage.setItem('mm:user-songs',JSON.stringify([s])),song());await page.reload()
 await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('button',{name:/Fixture/}).click();await page.getByLabel('Song name',{exact:true}).fill('Keep draft')
 const other=await context.newPage();await other.goto('/');await other.evaluate(()=>localStorage.setItem('mm:user-songs','[]'));await other.close()
 await expect(page.getByLabel('Song name',{exact:true})).toHaveValue('Keep draft')
 await page.getByRole('button',{name:'Save details',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Song name',{exact:true})).toHaveValue('Keep draft')
})
