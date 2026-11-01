import AxeBuilder from '@axe-core/playwright'
import { expect,test } from '@playwright/test'

for (const section of ['library', 'settings', 'editor']) {
  test(`accessibility: ${section} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto('/')
    if (section !== 'library') await page.locator('nav button').nth(section === 'settings' ? 3 : 2).click()
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => ({ id: v.id, nodes: v.nodes.map(n => ({target: n.target, reason: n.failureSummary})) }))).toEqual([])
  })
}
