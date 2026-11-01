import catalogue from '../src/content/publicdomain/index.json' with {type:'json'}
import {test,expect} from './fixtures/browser'
import type {Page} from '@playwright/test'

const file=(name:string,text:string)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)})
async function start(page:Page){await page.goto('/');await page.getByRole('button',{name:'Import files',exact:true}).click()}

test('multiple files identify artists from metadata, file names and internal titles in one import',async({page})=>{
  await start(page)
  await expect(page.getByRole('button',{name:'Add files',exact:true})).toBeVisible()
  const opening=page.waitForEvent('filechooser')
  await page.getByRole('button',{name:'Add files',exact:true}).click()
  await (await opening).setFiles([
    file('Traditional - First song.cho','[C]First original line'),
    file('second.cho','{title: Second song}\n{singer: New Singer}\n[G]Second original line'),
    file('third.cho','{title: Third song - Traditional}\n[D]Third original line'),
  ])
  await expect(page.getByLabel('Artist — Traditional - First song.cho',{exact:true})).toHaveValue('Traditional')
  await expect(page.getByLabel('Title — Traditional - First song.cho',{exact:true})).toHaveValue('First song')
  await expect(page.getByLabel('Artist — second.cho',{exact:true})).toHaveValue('New Singer')
  await expect(page.getByLabel('Artist — third.cho',{exact:true})).toHaveValue('Traditional')
  await expect(page.getByLabel('Title — third.cho',{exact:true})).toHaveValue('Third song')
  await expect(page.getByText('3 files selected · 0 need information · 0 need review',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 3 added, 0 already present.',{exact:true})).toBeVisible()
  await expect(page.locator('.mm-artist').filter({hasText:'Traditional'})).toContainText(`${catalogue.artists.find(artist=>artist.meta.id==='traditional')!.songs.length+2} songs`)
  await expect(page.locator('.mm-artist').filter({hasText:'New Singer'})).toContainText('1 songs')
})

test('adding files preserves earlier edits and bulk artist fills only missing information',async({page})=>{
  await start(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(file('one.cho','[C]First line'))
  await page.getByLabel('Title — one.cho',{exact:true}).fill('My corrected title')
  await page.getByLabel('Artist for files without an artist',{exact:true}).fill('Fresh Singer')
  await page.getByRole('button',{name:'Apply to files without an artist',exact:true}).click()
  await page.getByLabel('Music files',{exact:true}).setInputFiles(file('two.cho','[G]Second line'))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Title — one.cho',{exact:true})).toHaveValue('My corrected title')
  await expect(page.getByLabel('Artist — one.cho',{exact:true})).toHaveValue('Fresh Singer')
  await expect(page.getByText('2 files selected · 1 need information · 0 need review',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled()
  await page.getByLabel('Artist for files without an artist',{exact:true}).fill('Traditional')
  await page.getByRole('button',{name:'Apply to files without an artist',exact:true}).click()
  await expect(page.getByLabel('Artist — one.cho',{exact:true})).toHaveValue('Fresh Singer')
  await expect(page.getByLabel('Artist — two.cho',{exact:true})).toHaveValue('Traditional')
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 2 added, 0 already present.',{exact:true})).toBeVisible()
  const songs=await page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')!))
  expect(songs.map((song:{name:string;artist:string})=>[song.name,song.artist])).toEqual([['My corrected title','Fresh Singer'],['two','Traditional']])
})

test('uncertain file-name orientation requires a choice and can be swapped on a small Italian screen',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:900})
  await page.goto('/')
  await page.getByLabel('Language',{exact:true}).selectOption('it')
  await page.getByRole('button',{name:'Importa file',exact:true}).click()
  await page.getByLabel('File musicali',{exact:true}).setInputFiles(file('Nuova canzone - Nuovo cantante.cho','[C]Un testo originale'))
  await expect(page.getByRole('button',{name:'Conferma importazione',exact:true})).toBeDisabled()
  await expect(page.getByText('1 file selezionati · 0 da completare · 1 da verificare',{exact:true})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('batch-review-it-320.png')})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole('button',{name:'Inverti artista e titolo',exact:true}).click()
  await expect(page.getByLabel('Artista — Nuova canzone - Nuovo cantante.cho',{exact:true})).toHaveValue('Nuovo cantante')
  await expect(page.getByLabel('Titolo — Nuova canzone - Nuovo cantante.cho',{exact:true})).toHaveValue('Nuova canzone')
  await page.getByRole('button',{name:'Conferma importazione',exact:true}).click()
  await expect(page.getByText('Importazione completata: 1 aggiunte, 0 già presenti.',{exact:true})).toBeVisible()
})

test('adding beyond the batch limit keeps the 25 selected files and their edits',async({page})=>{
  await start(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(Array.from({length:25},(_,index)=>file(`song${index}.cho`,`{title: Song ${index}}\n{artist: Traditional}\n[C]Original line ${index}`)))
  await expect(page.getByText('25 files selected · 0 need information · 0 need review',{exact:true})).toBeVisible()
  await page.getByLabel('Title — song0.cho',{exact:true}).fill('Keep this edit')
  await page.getByLabel('Music files',{exact:true}).setInputFiles(file('extra.cho','{artist: Traditional}\n[C]Extra'))
  await expect(page.getByRole('alert')).toContainText('at most 25 files')
  await expect(page.getByLabel('Title — song0.cho',{exact:true})).toHaveValue('Keep this edit')
  await expect(page.getByLabel('Title — extra.cho',{exact:true})).toHaveCount(0)
  await page.getByRole('alert').getByRole('button',{name:'Remove',exact:true}).click()
  await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeEnabled()
})
