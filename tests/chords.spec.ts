import { expect,test } from '@playwright/test'

for (const chord of ['E', 'G', 'Unrecognized', 'toString', '__proto__', 'constructor']) {
  test(`chord diagram ${chord} shows an accurate shape or an explicit unavailable state`, async ({ page }) => {
    await page.addInitScript(chord => localStorage.setItem('mm:user-songs', JSON.stringify([
      {id:'chords',name:'Chord QA',artist:'QA',genre:'',createdAt:1,arrangements:[{id:'a',kind:'lyrics',name:'Lyrics',tempo:100,bars:1,beatsPerBar:4,chordBars:[{chord,lyric:'Test'}]}]},
    ])), chord)
    await page.goto('/')
    await page.locator('.mm-artist').filter({ hasText: 'QA' }).getByRole('button', { name: 'Open', exact: true }).click()
    await page.locator('.mm-song').getByRole('button', { name: 'Open', exact: true }).click()
    const diagram = page.locator('.mm-chord-diag')
    await expect(diagram).toBeVisible()
    if (chord === 'E') {
      expect(await diagram.locator('circle[r="4.5"]').evaluateAll(els => els.map(e => Number(e.getAttribute('cx'))))).toEqual([64, 52, 4])
    } else if (chord === 'G') {
      await expect(diagram.locator('circle[r="8"]')).toHaveCount(0)
    } else {
      await expect(diagram.locator('svg')).toHaveCount(0)
      await expect(diagram).toContainText('Diagram unavailable')
    }
  })
}
