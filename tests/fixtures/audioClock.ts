import type {Page} from '@playwright/test'
declare global {interface Window {mmAudioClock:number}}

/** Keep source/decode APIs; fake elapsed time and activation. Real activation is tested in audio.spec.ts. */
export async function installControlledAudioClock(page:Page) {
  await page.addInitScript(()=>{
    window.mmAudioClock=10
    Object.defineProperty(AudioContext.prototype,'currentTime',{configurable:true,get:()=>window.mmAudioClock})
    AudioContext.prototype.resume=async()=>{}
  })
}
export async function advanceAudioClock(page:Page,seconds:number) {
  await page.evaluate(delta=>{window.mmAudioClock+=delta},seconds)
  // Let actual browser frames/ticks consume the chosen, frozen clock position.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
}
