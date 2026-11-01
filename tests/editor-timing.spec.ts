import { expect,openUserSong,test } from './fixtures/browser'
import { song } from './fixtures/songs'
test('explicit lyric timing can be imported, validated, saved, reopened and edited with stable IDs',async({page})=>{
 const fixture={...song(),arrangements:[]}
 await page.addInitScript(s=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify([s]))},fixture)
 await page.goto('/');await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('button',{name:/Fixture/}).click();await page.getByRole('button',{name:/Chords \+ lyrics/}).click()
 await page.getByLabel('Lyric line, Bar 1',{exact:true}).fill('one two')
 await page.getByText('Word timing (beats, editable), Bar 1',{exact:true}).first().click()
 const timing=page.getByRole('textbox',{name:'Word timing (beats, editable), Bar 1',exact:true})
 await timing.fill('[{"text":"one","startBeat":0,"endBeat":1},{"text":"two","startBeat":2,"endBeat":4}]')
 await page.getByRole('button',{name:'+ Save',exact:true}).click();await expect(page.getByText('1 arrangement(s) saved',{exact:true})).toBeVisible()
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')!)[0].arrangements[0].id as string)
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByText('Word timing (beats, editable), Bar 1',{exact:true}).first().click()
 const original=await page.evaluate(()=>localStorage.getItem('mm:user-songs'))
 await page.getByRole('textbox',{name:'Word timing (beats, editable), Bar 1',exact:true}).fill('[{"text":"one","startBeat":0,"endBeat":9}]')
 await page.getByRole('button',{name:'+ Save',exact:true}).click()
 await expect(page.getByRole('alert').first()).toBeVisible()
 expect(await page.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBe(original)
 await page.getByRole('textbox',{name:'Word timing (beats, editable), Bar 1',exact:true}).fill('[{"text":"one","startBeat":0,"endBeat":0.5},{"text":"two","startBeat":1,"endBeat":4}]')
 await page.getByRole('button',{name:'+ Save',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')!)[0].arrangements[0].id)).toBe(id)
 await page.reload();await openUserSong(page);await expect(page.locator('.mm-chord-sheet')).not.toContainText('Approximate provisional timing')
})
