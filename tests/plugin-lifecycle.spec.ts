import { expect,test } from '@playwright/test'

test('metronome schedules clicks again after a backward sync', async ({ page }) => {
  await page.goto('/')
  const count = await page.evaluate(async () => {
    const modulePath = '/src/transports/metronome/index.ts'
    const { default: plugin } = await import(modulePath)
    const handlers: Record<string, Function> = {}
    let starts = 0
    const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }
    const audio = { currentTime: 0, destination: {}, createOscillator: () => ({type:'', frequency: {...param}, connect() {}, start() { starts++ }, stop() {}, disconnect() {}}), createGain: () => ({gain:{...param}, connect() {}, disconnect() {}}) }
    const piece = {secondsPerBeat:0.5,timeSignature:{numerator:4},duration:8}
    const scheduler = {tempoFactor:1,audioContext:audio,on: (event: string, fn: Function) => { handlers[event]=fn;return () => delete handlers[event] }}
    await plugin.transport.start({score:{get:()=>piece}, scheduler})
    handlers['schedule-window']({from:2,to:2.1,toAudioTime:(t:number)=>t})
    handlers.sync?.(0)
    handlers['schedule-window']({from:0,to:0.1,toAudioTime:(t:number)=>t})
    plugin.transport.stop()
    return starts
  })
  expect(count).toBe(2)
})

test('disabling and re-enabling a parser removes and restores its registrations', async ({ page }) => {
  await page.goto('/')
  const counts = await page.evaluate(async () => {
    const modulePath = '/src/core/plugin/context-impl.ts'
    const { AppCore } = await import(modulePath)
    const core = new AppCore()
    const parser = {id:'payload-id',formats:['test'],detect:()=>true,parse:async()=>{throw new Error('unused parser')}}
    core.registry.register({manifest:{id:'parser-owner',type:'parser',name:{en:'Test',it:'Test'},version:'1.0.0',apiVersion:1,permissions:[]},setup: (ctx: import('../src/core/plugin/context').PluginContext)=>ctx.registerParser(parser)})
    await core.enablePlugin('parser-owner')
    const enabled = core.parsers.length
    await core.disablePlugin('parser-owner')
    const disabled = core.parsers.length
    await core.enablePlugin('parser-owner')
    return [enabled, disabled, core.parsers.length]
  })
  expect(counts).toEqual([1, 0, 1])
})
