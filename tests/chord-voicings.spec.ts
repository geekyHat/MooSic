import { expect, openUserSong, test } from './fixtures/browser'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { strToU8, zipSync } from 'fflate'

async function open(page: Page, chord = 'A') {
  await page.addInitScript(chord => {
    localStorage.setItem('mm:user-songs', JSON.stringify([{ id: 'positions', name: 'Position study', artist: 'QA', genre: '', createdAt: 1, arrangements: [{ id: 'lyrics', name: 'Lyrics', kind: 'lyrics', tempo: 120, bars: 2, beatsPerBar: 4, chordBars: [{ chord, lyric: 'Original study line' }, { chord: 'G', lyric: 'Second original line' }] }] }]))
    window.audioStarts = 0
    window.AudioContext = new Proxy(AudioContext, { construct(target, args) { window.audioStarts++; return Reflect.construct(target, args) } })
  }, chord)
  await page.goto('/'); await openUserSong(page)
}

test('hover reveals the actual count, both arrows wrap and each chord retains its own selection', async ({ page }, testInfo) => {
  await open(page)
  const card = page.getByRole('group', { name: 'Chord positions for A', exact: true })
  const controls = card.locator('.mm-voicing-controls')
  const next = card.getByRole('button', { name: 'Next position for A', exact: true })
  const previous = card.getByRole('button', { name: 'Previous position for A', exact: true })
  const count = Number(await card.getAttribute('data-voicing-count'))
  expect(count).toBeGreaterThan(2)
  const beforeSong = await page.evaluate(() => localStorage.getItem('mm:user-songs'))
  const beforeText = await page.locator('.mm-chord-sheet').textContent()
  const original = await card.getByRole('img', { name: 'A', exact: true }).getAttribute('data-frets')
  await page.mouse.move(0, 0)
  await expect(controls).toHaveCSS('opacity', '0')
  const height = (await card.boundingBox())!.height
  const sheetTop = (await page.locator('.mm-chord-sheet').boundingBox())!.y
  await card.hover()
  await expect(controls).toHaveCSS('opacity', '1')
  await expect(card.locator('output')).toHaveText(`1 of ${count}`)
  await previous.click()
  await expect(card).toHaveAttribute('data-voicing-index', String(count - 1))
  await expect(card.getByRole('img', { name: 'A', exact: true })).not.toHaveAttribute('data-frets', original!)
  await next.click()
  await expect(card).toHaveAttribute('data-voicing-index', '0')
  const seen = new Set<string>()
  for (let i = 0; i < count; i++) {
    seen.add((await card.getByRole('img', { name: 'A', exact: true }).getAttribute('data-frets'))!)
    await next.click()
  }
  expect(seen.size).toBe(count)
  await expect(card).toHaveAttribute('data-voicing-index', '0')
  await next.click()
  const chosen = await card.getByRole('img', { name: 'A', exact: true }).getAttribute('data-frets')
  expect((await card.boundingBox())!.height).toBe(height)
  expect((await page.locator('.mm-chord-sheet').boundingBox())!.y).toBe(sheetTop)
  const other = page.getByRole('group', { name: 'Chord positions for G', exact: true })
  await other.hover(); await other.getByRole('button', { name: 'Next position for G', exact: true }).click()
  await expect(card.getByRole('img', { name: 'A', exact: true })).toHaveAttribute('data-frets', chosen!)
  await page.mouse.move(0, 0); await page.locator('main').focus()
  await expect(controls).toHaveCSS('opacity', '0')
  expect(await page.locator('.mm-chord-sheet').textContent()).toBe(beforeText)
  expect(await page.evaluate(() => localStorage.getItem('mm:user-songs'))).toBe(beforeSong)
  expect(await page.evaluate(() => window.audioStarts)).toBe(0)
  await card.hover()
  await page.screenshot({ path: testInfo.outputPath('voicing-hover.png') })
})

test('keyboard left/right cycles positions, focus reveals controls and transpose resets to the correct chord', async ({ page }) => {
  await open(page)
  const card = page.getByRole('group', { name: 'Chord positions for A', exact: true })
  const count = Number(await card.getAttribute('data-voicing-count'))
  await card.focus()
  await expect(card.locator('.mm-voicing-controls')).toHaveCSS('opacity', '1')
  await page.keyboard.press('ArrowLeft')
  await expect(card).toHaveAttribute('data-voicing-index', String(count - 1))
  await page.keyboard.press('ArrowRight')
  await expect(card).toHaveAttribute('data-voicing-index', '0')
  await page.keyboard.press('ArrowRight')
  await expect(card).toHaveAttribute('data-voicing-index', '1')
  await page.getByRole('button', { name: 'Up one semitone', exact: true }).click()
  const shifted = page.getByRole('group', { name: 'Chord positions for A#', exact: true })
  await expect(shifted).toHaveAttribute('data-voicing-index', '0')
  await expect(shifted.getByRole('img', { name: 'A#', exact: true })).toHaveAttribute('data-frets', 'x 1 3 3 3 1')
  await page.getByRole('button', { name: 'Restore original chords', exact: true }).click()
  await expect(card).toHaveAttribute('data-voicing-index', '0')
  await expect(card.getByRole('img', { name: 'A', exact: true })).toHaveAttribute('data-frets', 'x 0 2 2 2 0')
})

test('OLGA starts with its custom voicing, offers catalogue alternatives and leaves single/unknown positions without arrows', async ({ page }) => {
  const source = '{t: Custom positions}\n{st: Ada Example}\n{define A base-fret 5 frets 1 3 3 2 1 1}\n{define Bm7b5 frets x 2 3 2 3 x}\n[A]Original [Bm7b5]study [Cadd9]'
  await page.goto('/'); await page.getByRole('button', { name: 'import olga archive', exact: true }).click()
  await page.getByLabel('OLGA Archive.zip', { exact: true }).setInputFiles({ name: 'OLGA Archive.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'OLGA Archive/chordpro/e/example_ada/positions.chopro': strToU8(source) })) })
  await page.getByRole('button', { name: 'Import into library', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await openUserSong(page, 'Ada Example')
  const card = page.getByRole('group', { name: 'Chord positions for A', exact: true })
  await expect(card.getByRole('img', { name: 'A', exact: true })).toHaveAttribute('data-frets', '5 7 7 6 5 5')
  await card.hover(); await card.getByRole('button', { name: 'Next position for A', exact: true }).click()
  await expect(card.getByRole('img', { name: 'A', exact: true })).toHaveAttribute('data-frets', 'x 0 2 2 2 0')
  await expect(page.getByRole('group', { name: 'Chord positions for Bm7b5', exact: true }).getByRole('button')).toHaveCount(0)
  await expect(page.locator('.mm-chord-diag').filter({ hasText: 'Cadd9' }).getByRole('button')).toHaveCount(0)
  expect(await page.getByLabel('OLGA document', { exact: true }).textContent()).toBe(source)
})

test('the interactive diagrams have no serious or critical accessibility violations', async ({ page }) => {
  await open(page)
  await page.getByRole('group', { name: 'Chord positions for A', exact: true }).focus()
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test.describe('touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 900 } })
  test('arrows are always visible and tap cycles both ways without changing the song', async ({ page }, testInfo) => {
    await open(page)
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('it')
    const card = page.getByRole('group', { name: 'Posizioni dell’accordo A', exact: true })
    await expect(card.locator('.mm-voicing-controls')).toHaveCSS('opacity', '1')
    const count = Number(await card.getAttribute('data-voicing-count'))
    await expect(card.locator('output')).toHaveText(`1 di ${count}`)
    await card.getByRole('button', { name: 'Posizione precedente di A', exact: true }).tap()
    await expect(card.locator('output')).toHaveText(`${count} di ${count}`)
    await card.getByRole('button', { name: 'Posizione successiva di A', exact: true }).tap()
    await expect(card.locator('output')).toHaveText(`1 di ${count}`)
    expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await expect(page.locator('.mm-chord-sheet')).toContainText('Original study line')
    await page.screenshot({ path: testInfo.outputPath('voicing-touch-320.png') })
  })
})
