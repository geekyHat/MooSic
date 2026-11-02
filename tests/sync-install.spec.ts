import {openLegacySync} from './fixtures/legacySync'
import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {encodePairing,PAIRING_LIFETIME} from '../src/infrastructure/sync/pairingCode'
const offer=()=>encodePairing({version:1,kind:'offer',id:crypto.randomUUID(),expires:Date.now()+PAIRING_LIFETIME,sdp:'v=0\r\na=fingerprint:sha-256 AA:BB:CC:DD\r\n'})
const welcome='Bring your library to this device'

test('QR first access offers installation, never prompts without a click, and handles dismissal and failed prompts',async({page})=>{
 const code=offer();await page.goto('/#/settings?sync='+code)
 const onboarding=page.getByRole('region',{name:welcome,exact:true});await expect(onboarding).toBeVisible()
 await page.evaluate(()=>{
  const event=new Event('beforeinstallprompt');Object.assign(window,{installCalls:0})
  Object.assign(event,{prompt:async()=>{Object.assign(window,{installCalls:1})},userChoice:Promise.resolve({outcome:'dismissed'})});window.dispatchEvent(event)
 })
 expect(await page.evaluate(()=>Reflect.get(window,'installCalls'))).toBe(0)
 await onboarding.getByRole('button',{name:'Install MooSic',exact:true}).click()
 expect(await page.evaluate(()=>Reflect.get(window,'installCalls'))).toBe(1)
 await expect(onboarding.getByRole('heading',{name:'Installation confirmed',exact:true})).toHaveCount(0)
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt');Object.assign(event,{prompt:async()=>{throw new Error('Denied')},userChoice:Promise.resolve({outcome:'dismissed'})});window.dispatchEvent(event)})
 await onboarding.getByRole('button',{name:'Install MooSic',exact:true}).click();await expect(onboarding.getByRole('alert')).toContainText('Could not open the installation prompt')
 await onboarding.getByRole('button',{name:'Continue in browser',exact:true}).click();await expect(onboarding).toHaveCount(0)
 await expect(page.getByLabel('Received code or link',{exact:true})).toHaveValue(code)
 expect(await page.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
})

test('iPhone guidance and manual handoff work at 320px when clipboard or installation APIs are unavailable',async({browser},testInfo)=>{
 const context=await browser.newContext({viewport:{width:320,height:900},locale:'it-IT',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1'}),page=await context.newPage()
 try{
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied')}}}))
  const code=offer();await page.goto('/#/settings?sync='+code)
  const onboarding=page.getByRole('region',{name:'Porta la tua libreria su questo dispositivo',exact:true})
  await expect(onboarding.getByRole('heading',{name:'Su iPhone o iPad',exact:true})).toBeVisible();await expect(onboarding).toContainText('Aggiungi alla schermata Home')
  await onboarding.getByRole('button',{name:'Copia invito per riprendere',exact:true}).click()
  await expect(onboarding.getByLabel('Invito da conservare',{exact:true})).toBeVisible();await expect(onboarding.getByLabel('Invito da conservare',{exact:true})).toHaveValue(new URL('/#/settings?sync='+code,page.url()).href)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(item=>['serious','critical'].includes(item.impact??''))).toEqual([])
  await onboarding.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('first-install-it-320.png')})
 }finally{await context.close()}
})

test('a new standalone window resumes a pending invitation and consumed invitations do not reappear',async({page,context})=>{
 const code=offer();await page.goto('/#/settings?sync='+code)
 const app=await context.newPage();await app.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}))
 await app.goto('/');await expect(app).toHaveURL(/#\/settings$/)
 await expect(app.getByRole('region',{name:welcome,exact:true})).toHaveCount(0);await openLegacySync(app);await expect(app.getByLabel('Received code or link',{exact:true})).toHaveValue(code)
 // Explicit cancellation of a new pairing also discards an earlier invitation.
 await app.getByRole('button',{name:'1. Create pairing code',exact:true}).click();await expect(app.getByLabel('Code to share',{exact:true})).not.toHaveValue('',{timeout:20000})
 await app.getByRole('button',{name:'Cancel pairing',exact:true}).click()
 const next=await context.newPage();await next.goto('/');await expect(next).toHaveURL(/#\/library$/)
 expect(await next.evaluate(()=>localStorage.getItem('mm:pending-sync'))).toBeNull()
})
