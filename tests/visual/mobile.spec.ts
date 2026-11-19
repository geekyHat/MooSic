import { chooseTunerPreset, expect, test } from '../fixtures/browser'
import { zipSync, strToU8 } from 'fflate'

for (const { name, width, height, preset } of [
  { name: 'tuner-guitar-portrait', width: 320, height: 568, preset: 'guitar' },
  { name: 'tuner-ukulele-portrait', width: 375, height: 667, preset: 'ukulele' },
  { name: 'tuner-ukulele-landscape', width: 667, height: 375, preset: 'ukulele' },
] as const) test(`visual mobile ${name}`, async ({ page }) => {
  await page.setViewportSize({ width, height })
  await page.goto('/#/tuner')
  await chooseTunerPreset(page, preset)
  await expect(page.locator('.mm-tuner-string')).toHaveCount(preset === 'guitar' ? 6 : 4)
  await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled', maxDiffPixelRatio: .002 })
})

test('visual mobile imported responsive reader', async ({ page }) => {
  const source = 'Title: Reading study\nArtist: Ada Example\nAm       G\nWords and chords wrap together across the screen\n[Am]A long line of [G]inline chords and words to read on a phone\n'+
    ['e', 'B', 'G', 'D', 'A', 'E'].map(label => `${label}|${'--10h12--|--0---|'.repeat(3)}`).join('\n')
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.goto('/')
  await page.getByRole('button', { name: 'import olga archive', exact: true }).click()
  await page.getByLabel('OLGA Archive.zip', { exact: true }).setInputFiles({ name: 'OLGA Archive.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'OLGA Archive/main/e/example_ada/reading.crd': strToU8(source) })) })
  await page.getByRole('button', { name: 'Import into library', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.locator('.mm-artist').filter({ hasText: 'Ada Example' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.locator('.mm-song').getByRole('button', { name: 'Open', exact: true }).click()
  const reader = page.getByRole('region', { name: 'OLGA document', exact: true })
  await expect(reader.locator('.mm-tab-segment')).toHaveCount(2)
  await reader.evaluate(element => element.scrollIntoView({ block: 'end' }))
  await expect(reader).toHaveScreenshot('imported-responsive-reader.png', { animations: 'disabled', maxDiffPixelRatio: .002 })
})
