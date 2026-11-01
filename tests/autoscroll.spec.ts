import { expect, openUserSong, test } from './fixtures/browser'
import type { Page } from '@playwright/test'
import type { UserSong } from '../src/domain/songs/types'
import AxeBuilder from '@axe-core/playwright'

const fixture: UserSong = {
  id: 'scroll', name: 'Reading study', artist: 'QA', genre: '', createdAt: 1,
  arrangements: [
    { id: 'lyrics', name: 'Lyrics', kind: 'lyrics', tempo: 120, bars: 64, beatsPerBar: 4, chordBars: [], lyricSheet: { version: 1, rows: Array.from({ length: 64 }, (_, i) => ({ kind: 'line', id: `line-${i}`, text: `Original study line ${i + 1}`, chords: [{ name: i % 2 ? 'G' : 'Am', offset: 0 }], startBeat: i * 4, endBeat: (i + 1) * 4 })) } },
    { id: 'tabs', name: 'Tabs', kind: 'tabs', tempo: 120, bars: 32, beatsPerBar: 4, tabNotes: Array.from({ length: 32 }, (_, i) => ({ row: 0, beat: i * 4, fret: i % 4 })) },
  ],
}
async function open(page: Page) {
  await page.addInitScript(song => {
    localStorage.setItem('mm:user-songs', JSON.stringify([song]))
    window.audioStarts = 0
    window.AudioContext = new Proxy(AudioContext, { construct(target, args) { window.audioStarts++; return Reflect.construct(target, args) } })
  }, fixture)
  await page.goto('/')
  await openUserSong(page)
  await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-31T12:01:00Z'))
}
const position = (page: Page) => page.locator('main').evaluate(element => element.scrollTop)

for (const width of [320, 1280]) test(`autoscroll advances with elapsed time, changes speed, pauses and resets at ${width}px without audio`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 850 })
  await open(page)
  const toggle = page.getByRole('button', { name: '▶ Autoscroll', exact: true })
  await expect(page.locator('.mm-chord-sheet [aria-current]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '▶ Play', exact: true })).toHaveCount(0)
  await toggle.click()
  await expect(page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const start = await position(page)
  await page.clock.runFor(2000)
  expect((await position(page)) - start).toBeGreaterThan(37)
  expect((await position(page)) - start).toBeLessThan(42)
  const slider = page.getByRole('slider', { name: 'Scroll speed', exact: true })
  await slider.focus(); await page.keyboard.press('End')
  await expect(slider).toHaveValue('100')
  const faster = await position(page)
  await page.clock.runFor(2000)
  expect((await position(page)) - faster).toBeGreaterThan(195)
  expect((await position(page)) - faster).toBeLessThan(203)
  await page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true }).click()
  const paused = await position(page)
  await page.clock.runFor(1000)
  expect(await position(page)).toBe(paused)
  await toggle.click(); await page.clock.runFor(1000)
  expect(await position(page)).toBeGreaterThan(paused + 95)
  await page.getByRole('button', { name: 'Back to top', exact: true }).click()
  expect(await position(page)).toBe(0)
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.audioStarts)).toBe(0)
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('autoscroll.png') })
})

test('autoscroll preserves fractional progress at its slowest speed and pauses for manual navigation or a hidden tab', async ({ page }) => {
  await open(page)
  const toggle = page.getByRole('button', { name: '▶ Autoscroll', exact: true })
  await page.getByRole('slider', { name: 'Scroll speed', exact: true }).focus(); await page.keyboard.press('Home')
  await toggle.click(); await page.clock.runFor(4000)
  expect(await position(page)).toBeGreaterThan(18)
  expect(await position(page)).toBeLessThan(22)
  await page.locator('main').dispatchEvent('wheel', { deltaY: 30 })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click(); await page.clock.runFor(100)
  await page.locator('main').dispatchEvent('touchstart')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click(); await page.clock.runFor(100)
  await page.locator('main').focus(); await page.keyboard.press('ArrowDown')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click(); await page.clock.runFor(100)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  const paused = await position(page)
  await page.clock.runFor(60000)
  expect(await position(page)).toBe(paused)
  await page.evaluate(() => { delete (document as unknown as { hidden?: boolean }).hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

test('autoscroll stops at the end, resets on display changes and is disposed when leaving practice', async ({ page }) => {
  await open(page)
  await page.getByRole('slider', { name: 'Scroll speed', exact: true }).focus(); await page.keyboard.press('End')
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await page.clock.runFor(60000)
  await expect(page.getByRole('button', { name: '▶ Autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('group', { name: 'Autoscroll controls', exact: true })).toBeInViewport()
  expect(await page.locator('main').evaluate(element => Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight)))).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Back to top', exact: true }).click()
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await page.getByRole('tab', { name: 'Tabs', exact: true }).click()
  await expect(page.getByRole('button', { name: '▶ Autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await page.clock.runFor(1000)
  expect(await position(page)).toBeGreaterThan(15)
  await page.getByRole('button', { name: 'Library', exact: true }).click()
  await page.clock.runFor(2000)
  expect(await position(page)).toBe(0)
  await page.getByRole('button', { name: 'Practice', exact: true }).click()
  await expect(page.getByRole('button', { name: '▶ Autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.audioStarts)).toBe(0)
})

test('autoscroll controls and static lyrics have no serious or critical accessibility violations', async ({ page }) => {
  await page.addInitScript(song => localStorage.setItem('mm:user-songs', JSON.stringify([song])), fixture)
  await page.goto('/'); await openUserSong(page)
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('Italian autoscroll controls fit a 320px phone while running', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.addInitScript(song => localStorage.setItem('mm:user-songs', JSON.stringify([song])), fixture)
  await page.goto('/'); await openUserSong(page)
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('it')
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await expect(page.getByRole('button', { name: '⏸ Pausa autoscroll', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Velocità scorrimento', exact: true })).toBeVisible()
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect((await page.getByRole('group', { name: 'Controlli scorrimento automatico', exact: true }).boundingBox())!.height).toBeLessThan(135)
  await page.screenshot({ path: testInfo.outputPath('autoscroll-it-320.png') })
})
