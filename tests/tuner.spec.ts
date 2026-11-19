import AxeBuilder from '@axe-core/playwright'
import { chooseTunerPreset, expect, test } from './fixtures/browser'
import type { Page } from '@playwright/test'

declare global {
  interface Window {
    tunerTest: { calls: number; contexts: AudioContext[]; stream: MediaStream | null; frequency: (hz: number) => void; silence: () => void; grant: () => void }
  }
}

async function microphone(page: Page, mode: 'normal' | 'denied' | 'deferred' | 'missing' | 'unsupported' | 'suspended' | 'blocked-audio' | 'quiet' = 'normal') {
  await page.addInitScript(mode => {
    const NativeContext = window.AudioContext
    const state = window.tunerTest = { calls: 0, contexts: [] as AudioContext[], stream: null as MediaStream | null, frequency: (_hz: number) => {}, silence: () => {}, grant: () => {} }
    window.AudioContext = new Proxy(NativeContext, { construct(target, args) {
      const context = Reflect.construct(target, args) as AudioContext
      state.contexts.push(context)
      if (mode === 'blocked-audio' && state.contexts.length === 1) context.resume = () => new Promise<void>(() => {})
      return context
    } })
    if (mode === 'unsupported') { Object.defineProperty(navigator, 'mediaDevices', { value: undefined }); return }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      state.calls++
      if (mode === 'denied') throw new DOMException('Denied', 'NotAllowedError')
      if (mode === 'missing') throw new DOMException('Missing', 'NotFoundError')
      const context = new NativeContext(), oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination()
      const amplitude = mode === 'quiet' ? .002 : .2
      oscillator.frequency.value = 110; gain.gain.value = amplitude
      oscillator.connect(gain); gain.connect(destination); oscillator.start()
      await context.resume()
      state.frequency = hz => { oscillator.frequency.value = hz; gain.gain.value = amplitude }
      state.silence = () => { gain.gain.value = 0 }
      state.stream = destination.stream
      if (mode === 'deferred') await new Promise<void>(resolve => { state.grant = resolve })
      if (mode === 'suspended') await state.contexts[0].suspend()
      return destination.stream
    } })
  }, mode)
}

test('audio suspended while granting microphone permission resumes after capture starts', async ({ page }) => {
  await microphone(page, 'suspended')
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  expect(await page.evaluate(() => window.tunerTest.calls)).toBe(1)
  await page.getByRole('button', { name: 'Stop listening' }).click()
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
})

test('blocked audio startup releases the microphone and offers a retry', async ({ page }) => {
  await microphone(page, 'blocked-audio')
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!window.tunerTest.stream)).toBe(true)
  await expect(page.getByRole('alert')).toContainText('Audio could not start', { timeout: 7000 })
  await expect(page.getByRole('button', { name: 'Tap to tune', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await expect.poll(() => page.evaluate(() => window.tunerTest.contexts.every(context => context.state === 'closed'))).toBe(true)
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('a quiet phone-level input is recognized in a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await microphone(page, 'quiet')
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await expect(page.locator('.mm-tuner-signal')).toHaveText('Audio signal detected')
  await expect(page.getByRole('button', { name: /^String 5 A2/ })).toHaveAttribute('data-tuned', 'true')
})

test('permission alone does not claim a signal; silence and muted input give recoverable guidance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await microphone(page)
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await page.evaluate(() => window.tunerTest.silence())
  await expect(page.locator('.mm-tuner-signal')).toContainText('No usable microphone signal', { timeout: 7000 })
  await expect(page.getByRole('button', { name: 'Stop listening' })).toBeVisible()
  await page.getByText('Tuning help and microphone support', { exact: true }).click()
  await page.getByText('No microphone signal on Android?', { exact: true }).click()
  await expect(page.getByText('Enable “Microphone access”', { exact: false })).toBeVisible()
  await page.screenshot({ path: `/tmp/moosic-android-input-help-${test.info().project.name}.png`, fullPage: true })
  await page.evaluate(() => Object.defineProperty(window.tunerTest.stream!.getAudioTracks()[0], 'muted', { configurable: true, value: true }))
  await expect(page.locator('.mm-tuner-mic')).toHaveText('Microphone muted')
  await expect(page.locator('.mm-tuner-signal')).toContainText('The device muted the input')
  await expect(page.locator('.mm-tuner-readings')).toHaveText('— Hz— cent')
  await page.evaluate(() => {
    Object.defineProperty(window.tunerTest.stream!.getAudioTracks()[0], 'muted', { configurable: true, value: false })
    window.tunerTest.frequency(110)
  })
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await expect(page.locator('.mm-tuner-signal')).toHaveText('Audio signal detected')
  expect(await page.evaluate(() => window.tunerTest.calls)).toBe(1)
})

test('live audio indicates flat, sharp and tuned; manual string selection and silence reset work', async ({ page }) => {
  await microphone(page)
  await page.goto('/#/tuner')
  await expect(page.getByRole('heading', { name: 'Guitar tuner' })).toBeVisible()
  expect(await page.evaluate(() => window.tunerTest.calls)).toBe(0)
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await expect(page.getByRole('button', { name: /^String 5 A2/ })).toHaveAttribute('data-tuned', 'true')
  await page.evaluate(() => window.tunerTest.frequency(107.5))
  await expect(page.locator('.mm-tuner-feedback')).toContainText('Too low')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', /-\d+/)
  await page.evaluate(() => window.tunerTest.frequency(112.5))
  await expect(page.locator('.mm-tuner-feedback')).toContainText('Too high')
  await page.getByRole('button', { name: /^String 6 E2/ }).click()
  await expect(page.getByRole('button', { name: 'Manual', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.tunerTest.frequency(82.406889))
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await page.getByRole('button', { name: 'Automatic', exact: true }).click()
  await page.evaluate(() => window.tunerTest.frequency(329.627557))
  await expect(page.getByRole('button', { name: /^String 1 E4/ })).toHaveAttribute('data-tuned', 'true')
  await page.evaluate(() => window.tunerTest.silence())
  await expect(page.locator('.mm-tuner-feedback')).toContainText('Pluck a string')
  await expect(page.locator('.mm-tuner-readings')).toHaveText('— Hz— cent')
  await page.getByRole('button', { name: 'Stop listening' }).click()
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await expect.poll(() => page.evaluate(() => window.tunerTest.contexts.every(context => context.state === 'closed'))).toBe(true)
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Library', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await expect.poll(() => page.evaluate(() => window.tunerTest.contexts.every(context => context.state === 'closed'))).toBe(true)
})

test('wide meter follows manual tuning across the 250-cent range and keeps the selected string after stopping', async ({ page }) => {
  await microphone(page)
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: /^String 6 E2/ }).click()
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  const meter = page.getByRole('meter')
  await expect(meter).toHaveAttribute('aria-valuemin', '-250')
  await expect(meter).toHaveAttribute('aria-valuemax', '250')
  for (const cents of [-240, -125, 0, 125, 240]) {
    await page.evaluate(cents => window.tunerTest.frequency(82.406889 * 2 ** (cents / 1200)), cents)
    await expect.poll(async () => Math.abs(Number(await meter.getAttribute('aria-valuenow')) - cents)).toBeLessThanOrEqual(2)
    await expect(page.getByRole('button', { name: /^String 6 E2/ })).toHaveAttribute('data-active', 'true')
  }
  await page.evaluate(() => window.tunerTest.frequency(60))
  await expect(meter).toHaveAttribute('aria-valuenow', '-250')
  await expect(page.locator('.mm-tuner-feedback')).toContainText('Too low')
  await page.getByRole('button', { name: 'Stop listening' }).click()
  await expect(page.locator('.mm-tuner-reference')).toHaveText('Target E2 · 82.41 Hz')
  await expect(page.getByRole('button', { name: /^String 6 E2/ })).toHaveAttribute('aria-pressed', 'true')
})

for (const mode of ['denied', 'missing', 'unsupported'] as const) {
  test(`microphone ${mode} gives actionable feedback`, async ({ page }) => {
    await microphone(page, mode)
    await page.goto('/#/tuner')
    await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(mode === 'denied' ? 'Microphone access denied' : mode === 'missing' ? 'No microphone found' : 'does not support')
    await expect(page.getByRole('button', { name: 'Tap to tune', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.tunerTest.contexts.every(context => context.state === 'closed'))).toBe(true)
  })
}

for (const action of ['cancel', 'navigate'] as const) {
  test(`a late microphone permission is released after ${action}`, async ({ page }) => {
    await microphone(page, 'deferred')
    await page.goto('/#/tuner')
    await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
    await expect.poll(() => page.evaluate(() => !!window.tunerTest.stream)).toBe(true)
    if (action === 'cancel') await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    else await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Library', exact: true }).click()
    await page.evaluate(() => window.tunerTest.grant())
    await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
    await expect.poll(() => page.evaluate(() => window.tunerTest.contexts.every(context => context.state === 'closed'))).toBe(true)
    if (action === 'cancel') await expect(page.getByRole('button', { name: 'Tap to tune', exact: true })).toBeVisible()
  })
}

test('hiding the page stops listening and a disconnected microphone reports an interruption', async ({ page }) => {
  await microphone(page)
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByRole('button', { name: 'Tap to tune', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }) })
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect(page.locator('.mm-tuner-feedback')).toContainText('In tune!')
  await page.evaluate(() => window.tunerTest.stream?.getTracks()[0].dispatchEvent(new Event('ended')))
  await expect(page.getByRole('alert')).toContainText('Listening was interrupted')
})

for (const width of [320, 390, 768, 1280]) {
  test(`tuner layout and keyboard controls at ${width}px in Italian`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.getByLabel('Language', { exact: true }).selectOption('it')
    await page.getByRole('button', { name: 'Accordatore', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Accordatore' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    const string = page.getByRole('button', { name: 'Corda 6 E2 Mi', exact: true })
    await string.focus(); await page.keyboard.press('Enter')
    await expect(string).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.mm-tuner-reference')).toHaveText('Obiettivo E2 · 82.41 Hz')
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? '')).map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([])
    await page.screenshot({ path: `/tmp/moosic-tuner-${width}.png`, fullPage: true })
  })
}

for (const preset of ['ukulele'] as const) {
  test(`${preset}: all strings tune automatically and manually without reopening the microphone`, async ({ page }) => {
    await microphone(page)
    await page.goto('/#/tuner')
    await page.getByRole('button', { name: /^String 6 E2/ }).click()
    await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
    await chooseTunerPreset(page, preset)
    await expect(page.getByRole('button', { name: 'Automatic', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.mm-tuner-string')).toHaveCount(4)
    for (const [number, note, hz] of [[4, 'G4', 391.995436], [3, 'C4', 261.625565], [2, 'E4', 329.627557], [1, 'A4', 440]] as const) {
      await page.evaluate(hz => window.tunerTest.frequency(hz), hz)
      await expect(page.getByRole('button', { name: new RegExp(`^String ${number} ${note}`) })).toHaveAttribute('data-tuned', 'true')
    }
    await page.getByRole('button', { name: /^String 3 C4/ }).click()
    await page.evaluate(() => window.tunerTest.frequency(440))
    await expect(page.locator('.mm-tuner-reference')).toHaveText('Target C4 · 261.63 Hz')
    await expect(page.locator('.mm-tuner-feedback')).toContainText('Too high')
    expect(await page.evaluate(() => window.tunerTest.calls)).toBe(1)
    expect(await page.evaluate(() => window.tunerTest.contexts.length)).toBe(1)
    await page.reload()
    await expect(page.getByRole('group', { name: 'Instrument', exact: true }).getByRole('button', { name: 'Ukulele', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Automatic', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => window.tunerTest.calls)).toBe(0)
  })
}

test('switching preset during a pending permission request uses the new targets and releases a late grant on exit', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await microphone(page, 'deferred')
  await page.goto('/#/tuner')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!window.tunerTest.stream)).toBe(true)
  await chooseTunerPreset(page, 'ukulele')
  await page.evaluate(() => { window.tunerTest.frequency(440); window.tunerTest.grant() })
  await expect(page.getByRole('button', { name: /^String 1 A4/ })).toHaveAttribute('data-tuned', 'true')
  await page.setViewportSize({ width: 667, height: 375 })
  expect(await page.evaluate(() => window.tunerTest.calls)).toBe(1)
  await page.getByRole('button', { name: '← Back', exact: true }).click()
  await expect(page).toHaveURL(/#\/library/)
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await page.getByRole('button', { name: 'Tuner', exact: true }).click()
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.tunerTest.calls)).toBe(2)
  await page.getByRole('button', { name: '← Back', exact: true }).click()
  await expect(page).toHaveURL(/#\/library/)
  await page.evaluate(() => window.tunerTest.grant())
  await expect.poll(() => page.evaluate(() => window.tunerTest.stream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
})

for (const [width, height] of [[320,568], [375,667], [390,844], [430,932], [667,375], [700,800], [720,800]] as const) {
  test(`mobile tuner fills ${width}×${height} with reachable controls`, async ({ page }, testInfo) => {
    await microphone(page)
    await page.setViewportSize({ width, height })
    await page.goto('/#/tuner')
    await expect(page.getByRole('heading', { name: 'Guitar tuner' })).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden()
    const shell = await page.locator('.mm-shell').boundingBox()
    expect(shell!.height).toBe(height)
    for (const preset of ['guitar', 'ukulele'] as const) {
      await chooseTunerPreset(page, preset)
      await expect(page.locator('.mm-tuner-neck-drawing')).toBeVisible()
      await expect(page.locator('.mm-tuner select')).toHaveCount(0)
      for (const selector of ['.mm-tuner-close', '.mm-tuner-presets button', '.mm-tuner-start', '.mm-tuner-string', '.mm-tuner-meter']) {
        for (const element of await page.locator(selector).all()) {
          const box = await element.boundingBox()
          expect(box!.x).toBeGreaterThanOrEqual(0)
          expect(box!.x + box!.width).toBeLessThanOrEqual(width)
          if (height >= 568) expect(box!.y + box!.height).toBeLessThanOrEqual(height)
          if (selector === '.mm-tuner-string') { expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44) }
        }
      }
      expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    }
    expect(await page.evaluate(() => window.tunerTest.calls)).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`tuner-${width}-${height}.png`), fullPage: true })
    await page.getByRole('button', { name: '← Back', exact: true }).click()
    await expect(page).toHaveURL(/#\/library/)
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  })
}

test('only Guitar and Ukulele remain; a saved Low-G preference migrates to standard ukulele', async ({ page }) => {
  await microphone(page)
  await page.addInitScript(() => localStorage.setItem('mm:tuner-preset', 'ukulele-low-g'))
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/#/tuner')
  const instruments = page.getByRole('group', { name: 'Instrument', exact: true })
  await expect(instruments.getByRole('button')).toHaveText(['Guitar', 'Ukulele'])
  await expect(instruments.getByRole('button', { name: 'Ukulele', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^(High G|Low G)$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^String 4 G4/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mm:tuner-preset'))).toBe('ukulele')
  await page.getByRole('button', { name: 'Tap to tune', exact: true }).click()
  await page.evaluate(() => window.tunerTest.frequency(391.995436))
  await expect(page.getByRole('button', { name: /^String 4 G4/ })).toHaveAttribute('data-tuned', 'true')
  await chooseTunerPreset(page, 'guitar')
  await expect(page.locator('.mm-tuner-string')).toHaveCount(6)
  await chooseTunerPreset(page, 'ukulele')
  await expect(page.locator('.mm-tuner-string')).toHaveCount(4)
  expect(await page.evaluate(() => window.tunerTest.calls)).toBe(1)
})
