import catalogue from '../src/content/publicdomain/index.json' with {type:'json'}
import {test,expect} from './fixtures/browser'
import type {Page} from '@playwright/test'
import type {UserSong,UserArrangement} from '../src/domain/songs/types'
import AxeBuilder from '@axe-core/playwright'
import {strToU8,zipSync} from 'fflate'

const song=(id:string,name:string,artist:string,arrangements:UserArrangement[]=[]):UserSong=>({id,name,artist,arrangements,genre:'QA',createdAt:1})
const base={name:'Original',tempo:120,bars:1,beatsPerBar:4}
const tab:UserArrangement={...base,id:'tab',kind:'tabs',tabNotes:[{row:0,beat:0,fret:0}]}
const chords:UserArrangement={...base,id:'chords',kind:'lyrics',chordBars:[{chord:'Am',lyric:'Original study'}]}
const sheet:UserArrangement={...base,id:'sheet',kind:'sheet',sheetNotes:[{beat:0,midi:64,durBeats:1}]}
async function seed(page:Page,songs:UserSong[]){
  await page.addInitScript(records=>{if(!localStorage.getItem('mm:user-songs'))localStorage.setItem('mm:user-songs',JSON.stringify(records))},songs)
  await page.goto('/')
}
const menu=(page:Page)=>page.getByRole('group',{name:'Library views',exact:true})
const alphabet=(page:Page)=>page.getByRole('navigation',{name:'Alphabetical index',exact:true})
const names=(page:Page,kind='song')=>page.locator(`.mm-${kind} h4`)

test('A–Z reaches unloaded artists, sorts songs and restores the selected letter on return',async({page})=>{
  await seed(page,[...Array.from({length:60},(_,i)=>song(`a${i}`,`Study ${i}`,`A Artist ${59-i}`)),
    song('z1','Zebra study','Zulu Artist'),song('z2','Èarly study','Zulu Artist'),song('z3','Alba (10)','Zulu Artist'),song('z4','Alba (2)','Zulu Artist')])
  await expect(page.locator('.mm-artist')).toHaveCount(48)
  await expect(names(page,'artist').first()).toHaveText('A Artist 0')
  await expect(page.locator('.mm-artist').filter({hasText:'Zulu Artist'})).toHaveCount(0)
  await alphabet(page).getByRole('button',{name:'Z',exact:true}).click()
  await expect(page.locator('.mm-artist')).toHaveCount(1)
  await expect(page.getByRole('heading',{name:'Artists',exact:true})).toBeFocused()
  await page.locator('.mm-artist').getByRole('button',{name:'Open',exact:true}).click()
  await expect(names(page)).toHaveText(['Alba (2)','Alba (10)','Èarly study','Zebra study'])
  await alphabet(page).getByRole('button',{name:'Z',exact:true}).click()
  await expect(names(page)).toHaveText(['Zebra study'])
  await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
  await page.getByRole('button',{name:'← Back',exact:true}).click()
  await expect(alphabet(page).getByRole('button',{name:'Z',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(names(page)).toHaveText(['Zebra study'])
  await page.getByRole('button',{name:'← Back',exact:true}).click()
  await expect(alphabet(page).getByRole('button',{name:'Z',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(names(page,'artist')).toHaveText(['Zulu Artist'])
  await alphabet(page).getByRole('button',{name:'All',exact:true}).click()
  await expect(page.locator('.mm-artist')).toHaveCount(48)
  await page.getByRole('button',{name:/Show more/}).click()
  await expect(page.locator('.mm-artist')).toHaveCount(61+catalogue.artists.length)
})

test('global songs and format menus combine filters and only open the selected arrangement type',async({page})=>{
  await seed(page,[song('z','Zebra chords','Alpha Fixture',[chords]),song('a','Afternoon notes','Alpha Fixture',[tab]),song('b','Beta mixed','Alpha Fixture',[tab,chords]),song('d','Delta notation','Alpha Fixture',[sheet]),song('e','Empty details','Alpha Fixture'),song('other','Afternoon notes','Zulu Fixture',[tab])])
  await menu(page).getByRole('button',{name:'Songs',exact:true}).click()
  await page.getByLabel('Composer',{exact:true}).selectOption('Alpha Fixture')
  await expect(names(page)).toHaveText(['Afternoon notes','Beta mixed','Delta notation','Empty details','Zebra chords'])
  await menu(page).getByRole('button',{name:'TAB',exact:true}).click()
  await expect(names(page)).toHaveText(['Afternoon notes','Beta mixed'])
  await page.locator('.mm-song').filter({hasText:'Beta mixed'}).getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.locator('.mm-version').getByRole('button',{name:'Lyrics + chords',exact:true})).toHaveCount(0)
  await expect(page.getByRole('tab',{name:'Tabs',exact:true})).toHaveAttribute('aria-selected','true')
  await expect(page.getByRole('heading',{name:'Beta mixed',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Library',exact:true}).click()
  await page.getByLabel('Composer',{exact:true}).selectOption('Alpha Fixture')
  await menu(page).getByRole('button',{name:'Chords',exact:true}).click()
  await expect(names(page)).toHaveText(['Beta mixed','Zebra chords'])
  await page.getByRole('searchbox').fill('Beta')
  await expect(names(page)).toHaveText(['Beta mixed'])
  await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.locator('.mm-version').getByRole('button',{name:'Tabs',exact:true})).toHaveCount(0)
  await expect(page.locator('.mm-chord-sheet')).toBeVisible()
  await page.getByRole('button',{name:'Library',exact:true}).click()
  await menu(page).getByRole('button',{name:'Sheet music',exact:true}).click()
  await expect(page.getByText('No songs match the filters.',{exact:true})).toBeVisible()
  await page.getByRole('searchbox').clear()
  await expect(names(page)).toHaveText(['Delta notation'])
  await menu(page).getByRole('button',{name:'Songs',exact:true}).click()
  await page.getByLabel('Composer',{exact:true}).selectOption('all')
  await alphabet(page).getByRole('button',{name:'A',exact:true}).click()
  await expect(names(page)).toHaveText(['Afternoon notes','Afternoon notes','Amazing Grace','Auld Lang Syne'])
  await page.locator('.mm-song').getByRole('button',{name:'Zulu Fixture',exact:true}).click()
  await expect(names(page)).toHaveText(['Afternoon notes'])
  await expect(page.getByRole('heading',{name:'Songs · Zulu Fixture',exact:true})).toBeVisible()
})

test('alphabet and modular menus fit a 320px Italian screen and support keyboard navigation',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:900})
  await seed(page,[song('a','Ària','Écho Artist',[chords]),song('z','Zebra','Zulu Artist',[tab])])
  await page.getByLabel('Language',{exact:true}).selectOption('it')
  const views=page.getByRole('group',{name:'Viste della libreria',exact:true})
  await views.getByRole('button',{name:'Canzoni',exact:true}).click()
  const index=page.getByRole('navigation',{name:'Indice alfabetico',exact:true})
  await index.getByRole('button',{name:'A',exact:true}).focus()
  await page.keyboard.press('Enter')
  await expect(names(page)).toHaveText(['Amazing Grace','Ària','Auld Lang Syne'])
  await expect(page.getByRole('heading',{name:'Canzoni',exact:true})).toBeFocused()
  await expect(index.getByRole('button',{name:'Q',exact:true})).toBeDisabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const result=await new AxeBuilder({page}).analyze()
  expect(result.violations.filter(item=>['serious','critical'].includes(item.impact??''))).toEqual([])
  await page.screenshot({path:testInfo.outputPath('alphabet-it-320.png'),fullPage:true})
})

test('OLGA documents appear in the TAB and chords indexes without losing their original source',async({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'import olga archive',exact:true}).click()
  const original='Title: Zeta acoustic\nArtist: Zebra Artist\ne|---5---|\nB|---3---|\nOriginal TAB instructions'
  await page.getByLabel('OLGA Archive.zip',{exact:true}).setInputFiles({name:'OLGA Archive.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync({
    'OLGA Archive/acoustic/z/zebra_artist/zeta.tab':strToU8(original),
    'OLGA Archive/chordpro/z/zebra_artist/alpha.pro':strToU8('{title: Alpha chords}\n{artist: Zebra Artist}\n[Am]Original line'),
  }))})
  await page.getByRole('button',{name:'Import into library',exact:true}).click()
  await expect(page.getByText('Import complete: 2 added, 0 duplicates skipped, 0 numbered titles.',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.getByLabel('Composer',{exact:true}).selectOption('Zebra Artist')
  await menu(page).getByRole('button',{name:'Chords',exact:true}).click()
  await expect(names(page)).toHaveText(['Alpha chords'])
  await menu(page).getByRole('button',{name:'TAB',exact:true}).click()
  await expect(names(page)).toHaveText(['Zeta acoustic'])
  await alphabet(page).getByRole('button',{name:'Z',exact:true}).click()
  await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.getByLabel('Original OLGA source',{exact:true})).toHaveText(original)
})

test('a 30000-document OLGA catalog stays paged while A–Z reaches artists, titles and originals',async({page},testInfo)=>{
  test.setTimeout(60000)
  await page.goto('/')
  await expect(page.locator('.mm-artist')).toHaveCount(catalogue.artists.length)
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('musicmaestro-olga',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['entries','sources'],'readwrite')
      for(let i=0;i<30000;i++){
        const artist=i<29970?`A Artist ${Math.floor(i/30)}`:'Zebra Artist',id=`large-olga-${i}`,title=`${i%30===29?'Z':'A'} study ${i}`
        tx.objectStore('entries').put({id,title,baseTitle:title,artist,artistFolder:artist.toLowerCase(),instrument:'Chitarra acustica',category:'acoustic',path:`OLGA Archive/acoustic/${artist}/${i}.tab`,format:'tab',digest:`original-${i}`,sourceKey:id})
        tx.objectStore('sources').put({key:id,batch:'committed',text:`Original large catalog fixture ${i}\ne|---0---|`})
      }
      tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)
    })
  })
  await page.reload()
  await expect(page.locator('.mm-artist')).toHaveCount(48)
  await alphabet(page).getByRole('button',{name:'Z',exact:true}).click()
  await expect(names(page,'artist')).toHaveText(['Zebra Artist'])
  await page.locator('.mm-artist').getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.locator('.mm-song')).toHaveCount(30)
  await expect(names(page).last()).toHaveText('Z study 29999')
  await menu(page).getByRole('button',{name:'Songs',exact:true}).click()
  await expect(page.locator('.mm-song')).toHaveCount(48)
  await alphabet(page).getByRole('button',{name:'Z',exact:true}).click()
  await expect(page.getByRole('status')).toHaveText('48 of 1000 results · Z')
  await expect(page.locator('.mm-song')).toHaveCount(48)
  await expect(names(page).first()).toHaveText('Z study 29')
  await page.screenshot({path:testInfo.outputPath('alphabet-large-catalog.png')})
  await page.locator('.mm-song').first().getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.getByLabel('OLGA document',{exact:true})).toHaveText('Original large catalog fixture 29\ne|---0---|')
})
