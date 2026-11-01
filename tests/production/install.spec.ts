import {test,expect} from '../fixtures/browser'

test('installation offered during data recovery remains available until an explicit click',async({page})=>{
 await page.addInitScript(()=>{
  const open=IDBFactory.prototype.open
  let offered=false
  IDBFactory.prototype.open=function(name:string,version?:number){
   if(!offered){
    offered=true
    const event=new Event('beforeinstallprompt')
    Object.assign(event,{prompt:async()=>{document.documentElement.dataset.prompted='yes'},userChoice:Promise.resolve({outcome:'accepted'})})
    window.dispatchEvent(event)
   }
   return open.call(this,name,version)
  }
 })
 await page.goto('/#/settings')
 const install=page.getByRole('button',{name:'Install MooSic',exact:true})
 await expect(install).toBeEnabled()
 await expect(page.locator('html')).not.toHaveAttribute('data-prompted','yes')
 await install.click()
 await expect(page.locator('html')).toHaveAttribute('data-prompted','yes')
 await expect(install).toBeDisabled()
 await expect(page.getByText('App installed',{exact:true})).toHaveCount(0)
 await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')))
 await expect(page.getByText('App installed',{exact:true})).toBeVisible()
})
