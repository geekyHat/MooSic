import {test,expect} from './fixtures/browser'
test('fresh installation contains only shipped repertoire and starts with an empty editor library',async({page})=>{
 await page.goto('/#/library?mode=songs')
 await expect(page.locator('.mm-song')).toHaveCount(10)
 await expect(page.locator('main')).not.toContainText(/canzone del sole|battisti/i)
 expect(await page.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
 await page.locator('nav button').nth(2).click();await expect(page.getByText('No songs yet. Create your first one.',{exact:true})).toBeVisible()
})
test('bundled chord sheets recognize chords, preserve full words, transpose and scroll',async({page})=>{
 await page.goto('/#/library?mode=chords&q=Amazing%20Grace')
 await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
 const words=await page.locator('.mm-chord-sheet').evaluate(el=>{const copy=el.cloneNode(true) as HTMLElement;copy.querySelectorAll('.chord-mark').forEach(chord=>chord.remove());return copy.textContent});expect(words).toContain('Amazing grace! how sweet the sound,');expect(words).toContain('And grace will lead me home.')
 await expect(page.locator('.mm-chord-diagrams')).toBeVisible();await page.getByRole('button',{name:'Up one semitone',exact:true}).click();await expect(page.locator('.mm-chord-sheet')).toContainText('G#')
 await page.getByRole('button',{name:'▶ Autoscroll',exact:true}).click();await expect(page.getByRole('button',{name:'⏸ Pause autoscroll',exact:true})).toBeVisible()
})
for(const title of ['Minuet in G major','Bourrée in E minor'])test(`classical theme renders TAB and notation: ${title}`,async({page})=>{
 await page.goto('/#/library?mode=tabs&q='+encodeURIComponent(title));await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
 await expect(page.locator('.mm-renderer-body svg')).toBeVisible();await page.getByRole('tab',{name:'Standard notation',exact:true}).click();await expect(page.locator('.mm-renderer-body svg')).toBeVisible()
})
