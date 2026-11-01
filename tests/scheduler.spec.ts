import { expect,test } from '@playwright/test'

// Import the production clock in a real browser; fake only wall-clock/audio time.
// Advancing one delayed tick exercises background-tab throttling deterministically.
for (const scenario of ['duplicate', 'pause']) {
  test(`pending audio resume is safe after ${scenario}`, async ({ page }) => {
    await page.goto('/')
    const result = await page.evaluate(async scenario => {
      const modulePath = '/src/core/scheduler/index.ts'
      const { Scheduler } = await import(modulePath)
      const resumes: (() => void)[] = []
      let intervals = 0
      const active = new Set<number>()
      Object.assign(window, {
        AudioContext: class {
          state = 'suspended'
          currentTime = 10
          resume() { return new Promise<void>(resolve => resumes.push(() => { this.state = 'running'; resolve() })) }
        },
        setInterval: () => { active.add(++intervals); return intervals },
        clearInterval: (id: number) => active.delete(id),
      })
      const s = new Scheduler()
      s.setPiece({id:'test',title:'Test',instrumentId:'guitar',tempo:120,secondsPerBeat:0.5,barLength:2,bars:8,duration:16,timeSignature:{numerator:4,denominator:4},notes:[]})
      const first = s.play()
      const second = scenario === 'duplicate' ? s.play() : Promise.resolve()
      if (scenario === 'pause') s.pause()
      resumes.forEach(resolve => resolve())
      await Promise.all([first, second])
      const playing = s.isPlaying
      s.pause()
      return { playing, remainingTimers: active.size }
    }, scenario)
    expect(result.playing).toBe(scenario === 'duplicate')
    expect(result.remainingTimers).toBe(0)
  })
}

for (const factor of [0.25, 0.5, 1, 2]) {
  test(`tempo ${factor}x maps piece time and scheduling to the same audio clock`, async ({ page }) => {
    await page.goto('/')
    const result = await page.evaluate(async (rate) => {
      const modulePath = '/src/core/scheduler/index.ts'
      const { Scheduler } = await import(modulePath)
      let clock = 10
      class FakeAudioContext {
        state = 'running'
        get currentTime() { return clock }
      }
      Object.assign(window, { AudioContext: FakeAudioContext })
      const s = new Scheduler()
      s.setPiece({ id:'test', title:'Test', instrumentId:'guitar', tempo:120, secondsPerBeat:0.5, barLength:2, bars:8, duration:16, timeSignature:{numerator:4,denominator:4}, notes:[] })
      s.setTempoFactor(rate)
      let win!: import('../src/core/scheduler').ScheduleWindow
      s.on('schedule-window', (w: import('../src/core/scheduler').ScheduleWindow) => { win = w })
      await s.play()
      const mapped = win.toAudioTime(win.to)
      clock = 11.05
      const time = s.currentTime
      s.pause()
      return { time, mapped }
    }, factor)
    expect(result.time).toBeCloseTo(factor, 5)
    expect(result.mapped).toBeCloseTo(10.15, 5)
  })
}

test('a delayed scheduler tick skips old beats without hanging', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/core/scheduler/index.ts'
      const { Scheduler } = await import(modulePath)
    let clock = 10
    let tick: () => void = () => {}
    Object.assign(window, { AudioContext: class { state='running'; get currentTime() { return clock } }, setInterval: (cb: () => void) => { tick = cb; return 1 }, clearInterval: () => {} })
    const s = new Scheduler()
    s.setPiece({id:'test',title:'Test',instrumentId:'guitar',tempo:120,secondsPerBeat:0.5,barLength:2,bars:8,duration:16,timeSignature:{numerator:4,denominator:4},notes:[]})
    const beats: number[] = []
    s.on('beat', (b: import('../src/core/scheduler').BeatInfo) => beats.push(b.beat))
    await s.play()
    clock = 12.05
    tick()
    s.pause()
    return beats
  })
  expect(result).toEqual([5])
})
