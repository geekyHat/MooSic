import {expect,type Page} from '@playwright/test'
export async function openLegacySync(page:Page){
 const details=page.locator('#legacy-peer-sync'),summary=details.locator('summary').first()
 await expect(summary).toBeVisible()
 if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await summary.click()
}
