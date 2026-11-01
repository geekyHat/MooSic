import { expect, test, type Page } from '@playwright/test'

async function openBella(page: Page) {
  await page.goto('/')
  await page.locator('.mm-artist').filter({ hasText: 'Traditional' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.locator('.mm-song').filter({ hasText: 'Bella Ciao' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.locator('.mm-version').first().getByRole('button', { name: 'Tabs', exact: true }).click()
}

test('changing arrangement stops autoscroll and retains a static readable score', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 650 })
  await openBella(page)
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await page.getByRole('button', { name: 'Lyrics + chords', exact: true }).click()
  await expect(page.getByRole('button', { name: '▶ Autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.mm-chord-sheet')).toBeVisible()
  await expect(page.locator('.mm-chord-sheet [aria-current]')).toHaveCount(0)
})

test('practice replaces playback, seek, tempo and loop controls with scroll controls', async ({ page }) => {
  await openBella(page)
  await expect(page.getByRole('button', { name: '▶ Play', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Loop bars', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Start from bar', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: 'Tempo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: 'Scroll speed', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to top', exact: true })).toBeVisible()
})

test('mobile practice keeps chord diagrams visible instead of collapsing their height', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await openBella(page)
  await page.getByRole('button', { name: 'Lyrics + chords', exact: true }).click()
  const box = await page.locator('.mm-chord-diagrams').boundingBox()
  expect(box!.height).toBeGreaterThan(96)
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('practice controls and tabs pass accessible names and keyboard activation', async ({ page }) => {
  await openBella(page)
  await expect(page.getByRole('slider', { name: 'Scroll speed', exact: true })).toBeVisible()
  const tab = page.getByRole('tab', { name: 'Tabs', exact: true })
  await tab.focus(); await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Standard notation', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toBeVisible()
})
