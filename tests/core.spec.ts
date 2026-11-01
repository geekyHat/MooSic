import { expect,test } from '@playwright/test'

test('opening a version without playable arrangements does not crash', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/core/plugin/context-impl.ts'
    const { AppCore } = await import(modulePath)
    const core = new AppCore()
    core.artists = [{ meta: {id:'a',name:'A'}, songs: [{meta:{id:'s',title:'S'},versions:[{id:'v',name:'V',arrangements:[]}]}] }]
    try { core.openSong('s', 'v'); return core.score } catch(e) { return String(e) }
  })
  expect(result).toBeNull()
})

test('malformed user-song records do not crash the editor or get overwritten', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('mm:user-songs', '[null,{"id":"broken"}]'))
  await page.reload()
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Song editor' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('mm:user-songs'))).toBe('[null,{"id":"broken"}]')
})

test('tab notes are sorted chronologically in the score model', async ({ page }) => {
  await page.goto('/')
  const times = await page.evaluate(async () => {
    const modulePath = '/src/content/user/piece.ts'
    const { buildUserPiece } = await import(modulePath)
    return buildUserPiece({id:'s',name:'Test',artist:'',genre:'',createdAt:1},{id:'a',name:'Tabs',kind:'tabs',tempo:120,bars:4,beatsPerBar:4,tabNotes:[{row:0,beat:3,fret:0},{row:1,beat:0,fret:1}]}).notes.map((n: {time:number})=>n.time)
  })
  expect(times).toEqual([0, 1.5])
})
