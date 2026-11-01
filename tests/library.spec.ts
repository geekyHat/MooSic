import catalogue from '../src/content/publicdomain/index.json' with {type:'json'}
import { expect,test } from '@playwright/test'

test('artist search remains consistent when entering the artist', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('Traditional')
  const card = page.locator('.mm-artist').filter({ hasText: 'Traditional' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.locator('.mm-song')).toHaveCount(catalogue.artists.find(artist=>artist.meta.id==='traditional')!.songs.length)
})

test('all active filters must match the same song', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('Ode')
  await page.getByLabel('Composer', { exact: true }).selectOption('Traditional (English folk)')
  await expect(page.locator('.mm-artist')).toHaveCount(0)
  await expect(page.getByText('No songs match the filters.')).toBeVisible()
})

test('song-level filters show an empty state', async ({ page }) => {
  await page.goto('/')
  await page.locator('.mm-artist').filter({ hasText: 'Traditional' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByRole('searchbox').fill('not-a-song')
  await expect(page.getByText('No songs match the filters.')).toBeVisible()
})
