import { test,expect } from '../fixtures/browser'

test('static site opens a single choice directly and restores hash history after reload',async({page})=>{
  await page.addInitScript(()=>{
    if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([{id:'production-history',name:'History study',artist:'Production Artist',createdAt:1,genre:'',arrangements:[{id:'arr',name:'Lyrics',kind:'lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord:'Am',lyric:'Original production words'}]}]}]))
  })
  await page.goto('/')
  await page.locator('.mm-artist').filter({hasText:'Production Artist'}).getByRole('button',{name:'Open',exact:true}).click()
  await page.getByRole('searchbox').fill('History')
  const list=page.url()
  await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.locator('.mm-chord-sheet')).toContainText('Original production words')
  await page.reload()
  await expect(page.getByRole('heading',{name:'History study',exact:true})).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(list)
  await expect(page.getByRole('searchbox')).toHaveValue('History')
  await page.goForward()
  await expect(page.locator('.mm-chord-sheet')).toContainText('Original production words')
})
