import { expect, test } from './fixtures/browser'
import { strToU8, zipSync } from 'fflate'

const chords = ['A', 'Amaj9', 'B7', 'Bm7', 'C#', 'C#m7', 'D', 'E', 'Esus4', 'F#m7']
const source = [
  '{t: Defined chord study}',
  '{st: Ada Example}',
  '{define AMaj9 base-fret 1 frets x 0 2 1 0 0}',
  '{define B7 base-fret 1 frets x 2 4 2 4 2}',
  '{define Bm7 base-fret 1 frets x 2 4 4 3 2}',
  '{define F#m7 base-fret 1 frets 2 4 2 2 2 2}',
  '{define C# base-fret 3 frets x 2 4 4 4 2}',
  '',
  ...Array.from({ length: 48 }, (_, index) => `[${chords[index % chords.length]}]Original synthetic study line ${index + 1}`),
  'e|' + '-'.repeat(120) + '|',
].join('\n')

for (const width of [1440, 320]) test(`OLGA uses source definitions and catalogue fallbacks in a centered reading column at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'import olga archive', exact: true }).click()
  await page.getByLabel('OLGA Archive.zip', { exact: true }).setInputFiles({
    name: 'OLGA Archive.zip', mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'OLGA Archive/chordpro/e/example_ada/study.chopro': strToU8(source) })),
  })
  await page.getByRole('button', { name: 'Import into library', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.locator('.mm-artist').filter({ hasText: 'Ada Example' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.locator('.mm-song').getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.locator('.mm-chord-diag')).toHaveCount(10)
  await expect(page.locator('.mm-chord-diag svg')).toHaveCount(10)
  await expect(page.locator('.mm-chord-diagrams')).not.toContainText('Diagram unavailable')
  await expect(page.getByRole('img', { name: 'C#', exact: true })).toHaveAttribute('data-base-fret', '3')
  await expect(page.getByRole('img', { name: 'C#', exact: true })).toHaveAttribute('data-frets', 'x 4 6 6 6 4')
  // The source's Bm7 voicing differs from the catalogue's preferred x 2 4 2 3 2.
  await expect(page.getByRole('img', { name: 'Bm7', exact: true })).toHaveAttribute('data-frets', 'x 2 4 4 3 2')
  await expect(page.getByRole('img', { name: 'Amaj9', exact: true })).toHaveAttribute('data-frets', 'x 0 2 1 0 0')
  const document = page.getByLabel('OLGA document', { exact: true })
  expect(await document.textContent()).toBe(source)
  const layout = await page.locator('.mm-reading-column').evaluate(element => {
    const main = element.closest('main')!, parent = main.getBoundingClientRect(), rect = element.getBoundingClientRect()
    return { width: rect.width, centerDelta: Math.abs(rect.left + rect.width / 2 - parent.left - main.clientWidth / 2) }
  })
  expect(layout.width).toBeLessThanOrEqual(896)
  expect(layout.centerDelta).toBeLessThanOrEqual(1)
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await document.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`defined-chords-${width}.png`) })
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await expect.poll(() => page.locator('main').evaluate(element => element.scrollTop)).toBeGreaterThan(10)
  await page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true }).click()
  expect(await document.textContent()).toBe(source)
})
