import { expect,openUserSong,test } from './fixtures/browser';
import { song } from './fixtures/songs';
test('renderer reflows 1280→320→1280 and mounts once after tab changes while paused',async({page})=>{
 await page.addInitScript(s=>localStorage.setItem('mm:user-songs',JSON.stringify([s])),song())
 await page.setViewportSize({width:1280,height:900});await page.goto('/');await openUserSong(page,'QA','Tabs')
 const score=page.locator('.mm-renderer-body svg');await expect(score).toHaveCount(1)
 const initial=await score.boundingBox();await page.setViewportSize({width:320,height:900});await expect.poll(async()=> (await score.boundingBox())?.width).toBeLessThan(initial!.width)
 await page.setViewportSize({width:1280,height:900});await expect.poll(async()=> (await score.boundingBox())?.width).toBe(initial!.width)
 await expect(page.getByRole('button',{name:'▶ Autoscroll',exact:true})).toBeVisible()
 for(let i=0;i<3;i++){
  await page.getByRole('tab',{name:'Standard notation',exact:true}).click();await expect(score).toHaveCount(1)
  await page.getByRole('tab',{name:'Tabs',exact:true}).click();await expect(score).toHaveCount(1)
 }
 await page.getByRole('button',{name:'Library',exact:true}).click();await expect(score).toHaveCount(0)
})
