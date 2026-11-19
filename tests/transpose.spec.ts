import { expect, openUserSong, test } from './fixtures/browser'
import type { Page } from '@playwright/test'
import type { UserSong } from '../src/domain/songs/types'
import { zipSync, strToU8 } from 'fflate'

const original = [
  '{t: Synthetic C study}', '{st: Ada Example}',
  '{define C base-fret 3 frets x 1 3 3 3 1}',
  '{define C/E frets 0 3 2 0 1 0}',
  '{define Bm7b5 frets x 2 3 2 3 x}',
  '[Verse 1]', 'Am     G', '[Unknown]',
  ...Array.from({ length: 24 }, () => '[C]One [Am]two [C/E]three [Bm7b5]four'),
  '{sot}', 'e|--0--2--|', 'B|--1--3--|', 'G|--0--2--|', 'D|--2--0--|', 'A|--3-----|', 'E|--------|', '{eot}',
].join('\n')

async function openOlga(page: Page) {
  await page.addInitScript(() => {
    window.audioStarts = 0
    window.AudioContext = new Proxy(AudioContext, { construct(target, args) { window.audioStarts++; return Reflect.construct(target, args) } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'import olga archive', exact: true }).click()
  await page.getByLabel('OLGA Archive.zip', { exact: true }).setInputFiles({
    name: 'OLGA Archive.zip', mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'OLGA Archive/chordpro/e/example_ada/transpose.chopro': strToU8(original) })),
  })
  await page.getByRole('button', { name: 'Import into library', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await openUserSong(page, 'Ada Example')
}

for (const width of [1440, 320]) test(`OLGA transpose changes every chord and slash bass, updates shapes and resets without changing original TAB at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 })
  await openOlga(page)
  const doc = page.getByLabel('OLGA document', { exact: true })
  const amount = page.getByLabel('Transposition in semitones', { exact: true })
  const up = page.getByRole('button', { name: 'Up one semitone', exact: true })
  const reset = page.getByRole('button', { name: 'Restore original chords', exact: true })
  await expect(reset).toBeDisabled()
  await expect(page.getByRole('img', { name: 'C', exact: true })).toHaveAttribute('data-frets', 'x 3 5 5 5 3')
  await up.click()
  await expect(amount).toHaveText('+1')
  await expect(doc.locator('[data-chord="C#"]')).toHaveCount(24)
  await expect(doc.locator('[data-chord="C#/F"]')).toHaveCount(24)
  await expect(doc.locator('[data-chord="Cm7b5"]')).toHaveCount(24)
  await up.click()
  await expect(amount).toHaveText('+2')
  await expect(doc.locator('[data-chord="D"]')).toHaveCount(24)
  await expect(doc.locator('[data-chord="Bm"]')).toHaveCount(24)
  await expect(doc.locator('[data-chord="D/F#"]')).toHaveCount(24)
  await expect(page.getByRole('img', { name: 'D', exact: true })).toHaveAttribute('data-frets', 'x x 0 2 3 2')
  await expect(page.getByRole('img', { name: 'D/F#', exact: true })).toHaveAttribute('data-frets', '2 5 4 2 3 2')
  await expect(page.getByRole('img', { name: 'C#m7b5', exact: true })).toHaveAttribute('data-frets', 'x 4 5 4 5 x')
  expect(await doc.locator('.mm-document-line').allTextContents()).toEqual(original.split('\n').filter(line => !/^[eBGDAE]\|/.test(line)).map(line => line.replaceAll('[C]', '[D]').replaceAll('[Am]', '[Bm]').replaceAll('[C/E]', '[D/F#]').replaceAll('[Bm7b5]', '[C#m7b5]') + (line === '{eot}' ? '' : '\n')))
  expect(await page.getByLabel('Original OLGA source', { exact: true }).textContent()).toBe(original)
  await expect(page.getByText('Only recognized chords are transposed.', { exact: false })).toBeVisible()
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`transpose-${width}.png`) })
  await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-31T12:01:00Z'))
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await page.clock.runFor(1000)
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeGreaterThan(15)
  await up.dispatchEvent('touchstart')
  await up.click()
  await expect(page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const position = await page.locator('main').evaluate(element => element.scrollTop)
  await page.clock.runFor(1000)
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeGreaterThan(position + 15)
  await page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true }).click()
  await page.getByRole('button', { name: 'Down one semitone', exact: true }).click()
  await expect(amount).toHaveText('+2')
  await reset.click()
  await expect(amount).toHaveText('0')
  expect(await page.getByLabel('Original OLGA source', { exact: true }).textContent()).toBe(original)
  await expect(page.getByRole('img', { name: 'C', exact: true })).toHaveAttribute('data-frets', 'x 3 5 5 5 3')
  expect(await page.evaluate(() => window.audioStarts)).toBe(0)
  await up.click()
  await page.clock.resume()
  await page.reload()
  await openUserSong(page, 'Ada Example')
  await expect(amount).toHaveText('0')
  expect(await page.getByLabel('Original OLGA source', { exact: true }).textContent()).toBe(original)
})

for (const free of [false, true]) test(`transpose updates ${free ? 'free-sheet anchors' : 'legacy chord rows'} and resets on arrangement changes`, async ({ page }) => {
  const fixture: UserSong = { id: 'transpose', name: 'Transpose study', artist: 'QA', genre: '', createdAt: 1, arrangements: [
    { id: 'lyrics', kind: 'lyrics', name: 'Lyrics', tempo: 120, bars: 2, beatsPerBar: 4,
      chordBars: free ? [] : [{ chord: 'C', lyric: 'Original words' }, { chord: 'Am', lyric: 'Second line' }],
      ...(free ? { lyricSheet: { version: 1 as const, rows: [{ kind: 'line' as const, id: 'line', text: 'Original words', chords: [{ name: 'C', offset: 0 }, { name: 'Am', offset: 9 }], startBeat: 0, endBeat: 4 }] } } : {}),
    },
    { id: 'tabs', kind: 'tabs', name: 'Tabs', tempo: 120, bars: 2, beatsPerBar: 4, tabNotes: [{ row: 0, fret: 0, beat: 0 }] },
  ] }
  await page.addInitScript(song => localStorage.setItem('mm:user-songs', JSON.stringify([song])), fixture)
  await page.goto('/'); await openUserSong(page)
  const before = await page.evaluate(() => localStorage.getItem('mm:user-songs'))
  await page.getByRole('button', { name: 'Up one semitone', exact: true }).click()
  await page.getByRole('button', { name: 'Up one semitone', exact: true }).click()
  await expect(page.locator('.mm-chord-sheet .chord-mark')).toHaveText(['D', 'Bm'])
  if (free) {
    expect(await page.locator('.mm-chord-sheet [data-lyric-fragment]').evaluateAll(elements => elements.map(element => element.textContent).join(''))).toBe('Original words')
    await expect(page.locator('.mm-chord-sheet [data-offset="9"]')).toHaveText('Bm')
  } else await expect(page.locator('.mm-chord-sheet')).toContainText('Original words')
  await page.getByRole('tab', { name: 'Tabs', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Transpose', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Chords + lyrics', exact: true }).click()
  await expect(page.getByLabel('Transposition in semitones', { exact: true })).toHaveText('+2')
  await page.getByRole('button', { name: 'Tabs', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Transpose', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Lyrics + chords', exact: true }).click()
  await expect(page.getByLabel('Transposition in semitones', { exact: true })).toHaveText('0')
  await expect(page.locator('.mm-chord-sheet .chord-mark')).toHaveText(['C', 'Am'])
  expect(await page.evaluate(() => localStorage.getItem('mm:user-songs'))).toBe(before)
})

test('transpose bounds, negative shifts and Italian controls are accessible on a 320px screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await openOlga(page)
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('it')
  const down = page.getByRole('button', { name: 'Scendi di un semitono', exact: true })
  const up = page.getByRole('button', { name: 'Sali di un semitono', exact: true })
  const offset = page.getByLabel('Trasposizione in semitoni', { exact: true })
  await down.focus(); await page.keyboard.press('Enter')
  await expect(offset).toHaveText('-1')
  await expect(page.getByLabel('Documento OLGA', { exact: true }).locator('[data-chord="Abm"]')).toHaveCount(24)
  for (let i = 1; i < 11; i++) await down.click()
  await expect(offset).toHaveText('-11'); await expect(down).toBeDisabled()
  await page.getByRole('button', { name: 'Ripristina accordi originali', exact: true }).click()
  for (let i = 0; i < 11; i++) await up.click()
  await expect(offset).toHaveText('+11'); await expect(up).toBeDisabled()
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('transpose-it-320.png') })
})
