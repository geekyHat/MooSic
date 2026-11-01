import { test,expect } from '../fixtures/browser'
import { correctedScan, scanImage, textPdf } from '../fixtures/scans'

test('static build serves local OCR assets and saves a corrected camera-style image import',async({page})=>{
  test.setTimeout(90000)
  const external:string[]=[]
  page.on('request',request=>{if(/^https?:/.test(request.url()) && new URL(request.url()).hostname!=='127.0.0.1')external.push(request.url())})
  await page.goto('/')
  const image=await scanImage(page)
  await page.getByRole('button',{name:'Scan photo / PDF',exact:true}).click()
  await page.getByLabel('Camera photo',{exact:true}).setInputFiles({name:'production-photo.png',mimeType:'image/png',buffer:Buffer.from(image.png,'base64')})
  const editor=page.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true})
  await expect(editor).toHaveValue(/Morning light across the sea/,{timeout:60000})
  await editor.fill(correctedScan)
  await page.getByRole('button',{name:'Review import',exact:true}).click()
  await page.getByRole('button',{name:'Confirm artist and title',exact:true}).click()
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 1 added, 0 already present.',{exact:true})).toBeVisible()
  expect(external).toEqual([])
})

test('static PDF worker and packaged fonts extract a text PDF without OCR',async({page})=>{
  const ocr:string[]=[]
  page.on('request',request=>{if(request.url().includes('/scan-assets/ocr/'))ocr.push(request.url())})
  await page.goto('/')
  await page.getByRole('button',{name:'Scan photo / PDF',exact:true}).click()
  await page.getByLabel('Photo or PDF',{exact:true}).setInputFiles({name:'production.pdf',mimeType:'application/pdf',buffer:textPdf()})
  await expect(page.getByRole('textbox',{name:'Recognized text — edit before importing',exact:true})).toHaveValue(/Morning light across the sea/)
  await expect(page.getByText('Text read directly from PDF',{exact:true})).toBeVisible()
  expect(ocr).toEqual([])
})
