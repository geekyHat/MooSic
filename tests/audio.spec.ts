import { expect, test } from './fixtures/browser'

for (const kind of ['tabs', 'lyrics']) {
  test(`practice ${kind} autoscroll never creates an audio context or starts a sound`, async ({ page }) => {
    await page.addInitScript(kind => {
      const song = { id: 'audio-test', name: 'Audio regression', artist: 'QA', genre: '', createdAt: 1, arrangements: [{ id: 'a', kind, name: 'Test', tempo: 100, bars: 2, beatsPerBar: 4, ...(kind === 'tabs' ? { tabNotes: [{ row: 1, beat: 0, fret: 2 }] } : { chordBars: [{ chord: 'Dm', lyric: 'Test' }] }) }] }
      localStorage.setItem('mm:user-songs', JSON.stringify([song]))
      window.audioStarts = 0
      window.AudioContext = new Proxy(AudioContext, { construct(target, args) { window.audioStarts++; return Reflect.construct(target, args) } })
    }, kind)
    await page.goto('/')
    await page.locator('.mm-artist').filter({ hasText: 'QA' }).getByRole('button', { name: 'Open', exact: true }).click()
    await page.locator('.mm-song').getByRole('button', { name: 'Open', exact: true }).click()
    await expect(page.getByRole('button', { name: '▶ Play', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '▶ Autoscroll', exact: true }).click()
    await expect(page.locator('main')).toBeVisible()
    expect(await page.evaluate(() => window.audioStarts)).toBe(0)
    if (kind === 'lyrics') await expect(page.locator('.mm-chord-sheet [aria-current]')).toHaveCount(0)
    else await expect(page.locator('.mm-tab-note-active')).toHaveCount(0)
  })
}
