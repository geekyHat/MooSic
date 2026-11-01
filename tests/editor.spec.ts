import { expect,test,type Page } from '@playwright/test'

async function newSong(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByRole('button', { name: '+ New song', exact: true }).click()
  await page.getByPlaceholder('e.g. Autumn Leaves').fill('Regression song')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Regression song', exact: true })).toBeVisible()
}

test('empty notation cells have a usable size and a pitch/beat accessible name', async ({ page }) => {
  await newSong(page)
  await page.getByRole('button', { name: /Standard notation/ }).click()
  const cell = page.locator('table tbody button').first()
  const size = await cell.boundingBox()
  expect(size!.height).toBeGreaterThanOrEqual(32)
  await expect(cell).toHaveAccessibleName(/E4.*1/)
  await cell.click()
  await expect(cell).toHaveAttribute('aria-pressed', 'true')
})

test('song metadata is saved explicitly and survives leaving the editor', async ({ page }) => {
  await newSong(page)
  await page.getByLabel('Song name', { exact: true }).fill('Renamed song')
  await page.getByRole('button', { name: 'Save details', exact: true }).click()
  await expect(page.getByText('Song saved.', {exact:true})).toBeVisible()
  await page.getByRole('button', { name: /Back/, exact: true }).click()
  await expect(page.getByRole('button', { name: /Renamed song/ })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await expect(page.getByRole('button', { name: /Renamed song/ })).toBeVisible()
})

for (const field of ['Chord', 'Lyric line']) {
  test(`a ${field}-only arrangement saves and opens in practice`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await newSong(page)
    await page.getByRole('button', { name: /Chords \+ lyrics/ }).click()
    await page.getByLabel(`${field}, Bar 1`, { exact: true }).fill(field === 'Chord' ? 'Am' : 'Only lyrics')
    await page.getByRole('button', { name: '+ Save', exact: true }).click()
    await expect(page.getByText('1 arrangement(s) saved', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Practice', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Regression song' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('user standard notation is actually rendered in practice', async ({ page }) => {
  await newSong(page)
  await page.getByRole('button', { name: /Standard notation/ }).click()
  await page.locator('table tbody button').first().click()
  await page.getByRole('button', { name: '+ Save', exact: true }).click()
  await page.getByRole('button', { name: 'Practice', exact: true }).last().click()
  await page.getByRole('tab', { name: 'Standard notation', exact: true }).click()
  await expect(page.locator('.mm-renderer-body svg')).toBeVisible()
})
