import { test, expect, openUserSong } from './fixtures/browser'
import { zipSync, strToU8 } from 'fflate'

const tabBodies = ['--10h12--|--14/16--|--0---|', '--0------|---------|------|', '---------|--2------|------|', '---------|---------|--3---|', '---------|---------|------|', '---------|---------|------|'].map(body => body.repeat(5))
const original = 'Title: Responsive imported study\nArtist: Ada Example\n\n'+
  'Am        G/B                  Cadd9\nOriginal lyrics with enough words to wrap across several lines on a small phone\n'+
  '[Am]Inline text with [G/B]chords and averylongunbrokenword'.repeat(3)+'\n'+
  tabBodies.map((body, index) => `${'eBGDAE'[index]}|${body}`).join('\n')+'\n'+
  '🎵 Prosa con Unicode e parole leggibili '.repeat(10)+'\n'+Array.from({ length: 30 }, (_, index) => `Line ${index} [Am]Reading vertically`).join('\n')

test('real OLGA import reflows text, aligned chords and every TAB source column without horizontal scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'import olga archive', exact: true }).click()
  await page.getByLabel('OLGA Archive.zip', { exact: true }).setInputFiles({ name: 'OLGA Archive.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'OLGA Archive/main/e/example_ada/mobile.crd': strToU8(original) })) })
  await page.getByRole('button', { name: 'Import into library', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 duplicates skipped, 0 numbered titles.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.locator('.mm-artist').filter({ hasText: 'Ada Example' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.locator('.mm-song').getByRole('button', { name: 'Open', exact: true }).click()
  const reader = page.getByLabel('OLGA document', { exact: true })
  await expect(reader.locator('.mm-anchored-lyrics')).toBeVisible()
  expect(await reader.locator('[data-lyric-fragment]').evaluateAll(elements => elements.map(element => element.textContent).join(''))).toContain('Original lyrics')
  const source = page.getByLabel('Original OLGA source', { exact: true })
  expect(await source.textContent()).toBe(original)
  for (const [width, height] of [[320,568], [360,700], [375,667], [390,844], [430,932], [667,375], [768,900], [1280,800], [320,568]]) {
    await page.setViewportSize({ width, height })
    // Wait for ResizeObserver-driven segmentation, checking nested readers, not only main.
    await expect.poll(() => reader.locator('.mm-tab-segment').evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, font: getComputedStyle(element).fontFamily }))), { message: `TAB overflow at ${width}px` }).toEqual([])
    for (const target of [page.locator('html'), page.locator('main'), reader, reader.locator('.mm-document-line'), reader.locator('.mm-tab-segment')]) {
      expect(await target.evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ tag: element.tagName, className: element.className, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, text: element.textContent?.slice(0, 80) }))), `Overflow at ${width}px`).toEqual([])
    }
    const reconstructed = await reader.locator('.mm-tab-segment').evaluateAll(elements => {
      const rows = Array.from({ length: 6 }, () => '')
      for (const element of elements) {
        const text = element.childNodes[0].textContent!
        text.split('\n').forEach((line, index) => { rows[index] += line.slice(2) })
      }
      return rows
    })
    expect(reconstructed).toEqual(tabBodies)
  }
  await page.getByRole('button', { name: 'Up one semitone', exact: true }).click()
  await expect(reader.locator('.mm-anchored-lyrics .chord-mark').first()).toHaveText('A#m')
  expect(await source.textContent()).toBe(original)
  await page.locator('main').evaluate(element => { element.scrollTop = element.querySelector('.mm-responsive-document')!.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - element.querySelector('.mm-practice-toolbar')!.clientHeight - 12 })
  await page.screenshot({ path: testInfo.outputPath('imported-reader-320.png'), fullPage: true })
  await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
  await expect.poll(() => page.locator('main').evaluate(element => element.scrollTop)).toBeGreaterThan(10)
  await page.getByRole('button', { name: '⏸ Pause autoscroll', exact: true }).click()
})

test('dense generated TAB continues vertically at readable size and keeps every note through rotation', async ({ page }) => {
  const song = { id: 'dense', name: 'Dense imported TAB', artist: 'QA', genre: '', createdAt: 1, arrangements: [{ id: 'tabs', kind: 'tabs', name: 'TAB', tempo: 100, bars: 1, beatsPerBar: 4, tabNotes: Array.from({ length: 64 }, (_, index) => ({ row: index % 6, fret: 10 + index % 5, beat: index / 24 })) }] }
  await page.addInitScript(song => localStorage.setItem('mm:user-songs', JSON.stringify([song])), song)
  await page.setViewportSize({ width: 320, height: 568 })
  await openUserSong(page, 'QA', 'Tabs')
  const body = page.locator('.mm-renderer-body')
  for (const width of [320, 667, 1280, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(body.locator('.mm-tab-note-circle')).toHaveCount(64)
    await expect.poll(() => body.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    const circles = await body.locator('.mm-tab-note-circle').evaluateAll(elements => elements.map(element => ({ x: Number(element.getAttribute('cx')), y: Number(element.getAttribute('cy')), radius: Number(element.getAttribute('r')) })))
    expect(circles.every(circle => circle.radius === 13)).toBe(true)
    expect(new Set(circles.map(circle => `${circle.x}:${circle.y}`)).size).toBe(64)
  }
  await page.getByRole('tab', { name: 'Standard notation', exact: true }).click()
  await expect(body.locator('svg')).toHaveCount(1)
  expect(await body.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
})

test('direct ChordPro imports wrap long words and anchored chords in both themes, locales and enlarged text', async ({ page }) => {
  const lyric = 'A very long line with chords inside words and averylongunbrokenword'.repeat(4)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Import files', exact: true }).click()
  await page.getByLabel('Music files', { exact: true }).setInputFiles({ name: 'responsive.cho', mimeType: 'text/plain', buffer: Buffer.from(`{title: Responsive ChordPro}\n{artist: QA}\n[C]${lyric}[G/B]end`) })
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click()
  await expect(page.getByText('Import complete: 1 added, 0 already present.', { exact: true })).toBeVisible()
  await page.reload()
  await openUserSong(page, 'QA')
  const sheet = page.locator('.mm-chord-sheet')
  await expect(sheet).toBeVisible()
  expect(await sheet.locator('[data-lyric-fragment]').evaluateAll(elements => elements.map(element => element.textContent).join(''))).toBe(lyric + 'end')
  for (const theme of ['theme-default', 'theme-dark']) for (const locale of ['en', 'it']) {
    await page.evaluate(({ theme, locale }) => {
      const settings = JSON.parse(localStorage.getItem('mm:settings')!)
      settings.theme = theme; settings.locale = locale
      settings.enabled = settings.enabled.filter((id: string) => !id.startsWith('theme-')).concat(theme)
      localStorage.setItem('mm:settings', JSON.stringify(settings))
    }, { theme, locale })
    await page.reload(); await expect(sheet).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    for (const zoom of ['1', '2']) {
      await page.evaluate(zoom => { document.documentElement.style.zoom = zoom }, zoom)
      expect(await sheet.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
      expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    }
  }
})
