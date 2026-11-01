import { expect,test,type Page } from '@playwright/test'

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('main').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
}

for (const width of [320, 375, 768, 1280]) {
  for (const locale of ['it', 'en']) {
    test(`responsive ${width}px ${locale}: navigation, library, settings and editors`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await page.getByLabel('Language', { exact: true }).selectOption(locale)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await noOverflow(page)
      const nav = page.locator('nav button')
      for (const button of await nav.all()) {
        const box = await button.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      await nav.nth(3).click()
      await noOverflow(page)
      await nav.nth(2).click()
      await page.getByRole('button', { name: locale === 'it' ? '+ Nuova canzone' : '+ New song', exact: true }).click()
      await page.getByLabel(locale === 'it' ? 'Nome canzone' : 'Song name', { exact: true }).fill('Responsive')
      await page.getByRole('button', { name: locale === 'it' ? 'Crea' : 'Create', exact: true }).click()
      for (const name of locale === 'it' ? ['Tabs', 'Accordi + testo', 'Notazione standard'] : ['Tabs', 'Chords + lyrics', 'Standard notation']) {
        await page.getByRole('button', { name: new RegExp(name.replace('+', '\\+')) }).click()
      }
      await noOverflow(page)
      await expect(page.locator('table tbody button').last()).toHaveAccessibleName(/E2/)
    })
  }
}
