import { expect,test } from '@playwright/test'

test('storage write failure is reported and does not pretend to create a song', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'mm:user-songs') throw new DOMException('Storage full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByRole('button', { name: '+ New song', exact: true }).click()
  await page.getByLabel('Song name', { exact: true }).fill('Must not be lost')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not be saved')
  await expect(page.getByLabel('Song name', { exact: true })).toHaveValue('Must not be lost')
  expect(await page.evaluate(() => localStorage.getItem('mm:user-songs'))).toBeNull()
})

test('settings preserve chosen transport and plugin configuration after reload', async ({ page }) => {
  await page.goto('/')
  await page.locator('nav button').nth(3).click()
  await page.getByRole('button', { name: 'Metronome: Disabled', exact: true }).click()
  const range = page.getByRole('slider').first()
  await range.fill('18')
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('mm:settings')!))
  await page.reload()
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('mm:settings')!))
  expect(restored.enabled).toContain('transport-metronome')
  expect(restored.enabled).not.toContain('transport-guitar')
  expect(restored.config).toEqual(snapshot.config)
})
