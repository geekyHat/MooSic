import catalogue from '../src/content/publicdomain/index.json' with {type:'json'}
import { test, expect, chooseArrangement } from './fixtures/browser'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const downloaded=(name:string)=>fileURLToPath(new URL(`./fixtures/imports/${name}`,import.meta.url))
const downloadedBuffer=(name:string)=>({name,mimeType:'text/plain',buffer:readFileSync(downloaded(name))})
const songFile=(name:string,artist:string,words:string)=>({name,mimeType:'text/plain',buffer:Buffer.from(`{title: Study}\n{artist: ${artist}}\n[C]${words}`)})
async function openImport(page:Page){await page.getByRole('button',{name:'Import files',exact:true}).click()}
async function openSong(page:Page,artist:string,title:string,kind='Lyrics + chords'){
  await page.goto('/#/library')
  await page.locator('.mm-artist').filter({has:page.getByRole('heading',{name:artist,exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
  await page.locator('.mm-song').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
  await chooseArrangement(page,kind)
}

test('downloaded ChordPro imports locally on mobile, persists and opens in practice and editor',async({page,context},testInfo)=>{
  await page.setViewportSize({width:375,height:900})
  await page.goto('/')
  await openImport(page)
  // This dev test isolates offline file imports. Supply browser chrome icons from disk;
  // the production worker's real offline asset caching is verified by the PWA suite.
  for(const size of [16,32])await page.route(`**/icons/favicon-${size}x${size}.png`,route=>route.fulfill({path:fileURLToPath(new URL(`../public/icons/favicon-${size}x${size}.png`,import.meta.url)),contentType:'image/png'}))
  await context.setOffline(true)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(downloaded('swinglow.cho'))
  await page.getByLabel('Artist — swinglow.cho',{exact:true}).fill('Traditional')
  await expect(page.getByRole('region',{name:'Import preview'})).toContainText('no vocal timing')
  await page.screenshot({path:testInfo.outputPath('import-mobile.png')})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const accessibility=await new AxeBuilder({page}).analyze()
  expect(accessibility.violations.filter(violation=>['serious','critical'].includes(violation.impact??''))).toEqual([])
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 1 added, 0 already present.',{exact:true})).toBeVisible()
  await context.setOffline(false)
  await page.reload()
  await expect(page.locator('.mm-artist').filter({hasText:'Traditional'})).toContainText(`${catalogue.artists.find(artist=>artist.meta.id==='traditional')!.songs.length+1} songs`)
  await openSong(page,'Traditional','Swing Low Sweet Chariot')
  await expect(page.getByRole('heading',{name:'Swing Low Sweet Chariot',exact:true})).toBeVisible()
  expect(await page.locator('.mm-chord-sheet .line-lyrics').first().locator('[data-lyric-fragment]').evaluateAll(elements=>elements.map(element=>element.textContent).join(''))).toContain('sweet chariot')
  await page.getByText('Original imported file',{exact:true}).click()
  await expect(page.locator('.mm-piece-title pre')).toContainText('{chorus}')
  await page.getByRole('button',{name:'Library',exact:true}).click()
  await page.goto('/#/library')
  await page.locator('.mm-artist').filter({hasText:'Traditional'}).getByRole('button',{name:'Open',exact:true}).click()
  await page.locator('.mm-song').filter({hasText:'Swing Low Sweet Chariot'}).getByRole('button',{name:'Edit in editor',exact:true}).click()
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await expect(page.getByRole('textbox',{name:'Song text with inline chords',exact:true})).toHaveValue(/Swing/)
})

test('batch asks about abbreviated artist, numbers different songs and skips an identical reimport',async({page})=>{
  await page.goto('/')
  await openImport(page)
  const a=songFile('first.cho','Beetoven','First words'),b=songFile('second.cho','Beetoven','Different words')
  await page.getByLabel('Music files',{exact:true}).setInputFiles([a,b])
  await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Yes, use: L. van Beethoven',exact:true}).first().click()
  await expect(page.getByRole('region',{name:'Import preview'})).toContainText('Study (1)')
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 2 added, 0 already present.',{exact:true})).toBeVisible()
  await expect(page.locator('.mm-artist')).toHaveCount(catalogue.artists.length)
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')!))
  expect(saved.map((song:{name:string})=>song.name)).toEqual(['Study','Study (1)'])
  expect(saved.map((song:{artist:string})=>song.artist)).toEqual(['L. van Beethoven','L. van Beethoven'])
  await page.reload()
  await openImport(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(a)
  await expect(page.getByText('Identical copy already exists: it will not be duplicated',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 0 added, 1 already present.',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mm:user-songs')!).length)).toBe(2)
})

test('user may keep a similar artist separate, while exact names always reuse the existing artist',async({page})=>{
  await page.goto('/')
  await openImport(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(songFile('ensemble.cho','Beethoven Ensemble','Original'))
  await page.getByRole('button',{name:'Different artist: create new',exact:true}).click()
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.locator('.mm-artist')).toHaveCount(catalogue.artists.length+1)
  await openImport(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles(songFile('another.cho',' BEETHOVEN   ENSEMBLE ','Another'))
  await expect(page.getByRole('group',{name:'Is this the same artist already in your library?'})).toHaveCount(0)
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.locator('.mm-artist')).toHaveCount(catalogue.artists.length+1)
  await expect(page.locator('.mm-artist').filter({hasText:'Beethoven Ensemble'})).toContainText('2 songs')
})

test('text TAB and downloaded TAB blocks import and retain original instructions in practice',async({page})=>{
  await page.goto('/')
  await openImport(page)
  const tab='Title: Local riff\nArtist: Riff band\ne|--10h12--|\nB|--10----|\nG|--------|\nD|--------|\nA|--------|\nE|--------|'
  await page.getByLabel('Music files',{exact:true}).setInputFiles([{name:'riff.tab',mimeType:'text/plain',buffer:Buffer.from(tab)},downloadedBuffer('tab-example.cho')])
  await page.getByLabel('Artist — tab-example.cho',{exact:true}).fill('Riff band')
  await expect(page.getByRole('region',{name:'Import preview'})).toContainText('Approximate TAB rhythm')
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 2 added, 0 already present.',{exact:true})).toBeVisible()
  await openSong(page,'Riff band','Local riff','Tabs')
  await expect(page.getByRole('heading',{name:'Local riff',exact:true})).toBeVisible()
  await page.getByText('Original imported file',{exact:true}).click()
  await expect(page.locator('.mm-piece-title pre')).toContainText('10h12')
  await expect(page.locator('.mm-renderer-body')).toContainText('12')
})

test('unsupported downloaded file and failed storage preserve the selected batch without partial imports',async({page})=>{
  await page.goto('/')
  await openImport(page)
  await page.getByLabel('Music files',{exact:true}).setInputFiles([downloadedBuffer('unsupported-abc.cho'),songFile('valid.cho','Traditional','Original')])
  await expect(page.getByRole('alert')).toContainText('unsupported section')
  await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled()
  expect(await page.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
  await page.getByRole('alert').getByRole('button',{name:'Remove',exact:true}).click()
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem
    Object.assign(window,{restoreImportStorage:()=>{Storage.prototype.setItem=original}})
    Storage.prototype.setItem=function(key,value){if(key==='mm:user-songs')throw new DOMException('Full','QuotaExceededError');original.call(this,key,value)}
  })
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('Local storage is full')
  await expect(page.getByLabel('Title — valid.cho',{exact:true})).toHaveValue('Study')
  expect(await page.evaluate(()=>localStorage.getItem('mm:user-songs'))).toBeNull()
  await page.evaluate(()=>{(window as unknown as {restoreImportStorage:()=>void}).restoreImportStorage()})
  await page.getByRole('alert').getByRole('button',{name:'Remove',exact:true}).click()
  await page.getByRole('button',{name:'Confirm import',exact:true}).click()
  await expect(page.getByText('Import complete: 1 added, 0 already present.',{exact:true})).toBeVisible()
})

test('existing duplicate artist names can be merged and Beethoven metadata stays consistent after reload',async({page})=>{
  await page.addInitScript(()=>{
    if(localStorage.getItem('mm:user-songs'))return
    localStorage.setItem('mm:user-songs',JSON.stringify(['Beetoven','Ludwig van Beethoven'].map((artist,index)=>({id:'legacy'+index,name:'Ode to Joy',artist,genre:'',createdAt:1,arrangements:[]}))))
  })
  await page.goto('/')
  for(const from of ['Beetoven','Ludwig van Beethoven']){
    await page.getByRole('button',{name:'Merge artists',exact:true}).click()
    await page.getByRole('combobox',{name:'Local artist to merge',exact:true}).selectOption(from)
    await page.getByRole('combobox',{name:'Artist to keep',exact:true}).selectOption('L. van Beethoven')
    await page.getByRole('button',{name:'Confirm merge',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Merge artists',exact:true})).toHaveCount(0)
  }
  await page.reload()
  await expect(page.locator('.mm-artist')).toHaveCount(catalogue.artists.length)
  await expect(page.locator('.mm-artist').filter({hasText:'L. van Beethoven'})).toContainText('4 songs')
  const options=await page.getByLabel('Composer',{exact:true}).locator('option').allTextContents()
  expect(options.filter(name=>/beethoven/i.test(name))).toEqual(['L. van Beethoven'])
  await openSong(page,'L. van Beethoven','Ode to Joy','Tabs')
  await expect(page.locator('.mm-piece-title')).toContainText('L. van Beethoven')
  await expect(page.locator('.mm-piece-title')).not.toContainText('1824')
})

for(const [locale,width] of [['it',320],['en',768]] as const){
  test(`import layout and labels at ${width}px in ${locale}`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:900})
    await page.goto('/')
    await page.getByLabel('Language',{exact:true}).selectOption(locale)
    await page.getByRole('button',{name:locale==='it'?'Importa file':'Import files',exact:true}).click()
    await page.getByLabel(locale==='it'?'File musicali':'Music files',{exact:true}).setInputFiles(songFile('responsive.cho','Traditional','Local import'))
    await expect(page.getByRole('region',{name:locale==='it'?'Anteprima importazione':'Import preview'})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    expect(await page.locator('main').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
    await page.screenshot({path:testInfo.outputPath(`import-${locale}-${width}.png`)})
    await page.getByRole('button',{name:locale==='it'?'Conferma importazione':'Confirm import',exact:true}).click()
    await expect(page.getByText(locale==='it'?'Importazione completata: 1 aggiunte, 0 già presenti.':'Import complete: 1 added, 0 already present.',{exact:true})).toBeVisible()
  })
}
