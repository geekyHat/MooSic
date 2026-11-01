import {expect,test} from '../fixtures/browser'
const fixture={id:'visual',name:'Studio sul mare',artist:'QA',genre:'Studio',createdAt:1,arrangements:[{id:'visual-arr',kind:'lyrics',name:'Lyrics',tempo:100,bars:4,beatsPerBar:4,chordBars:[],lyricSheet:{version:1,rows:[
 {kind:'section',id:'verse',title:'Verse 1'},
 {kind:'line',id:'line',text:'Ricordo il mare',chords:[{name:'C',offset:0},{name:'Am',offset:2},{name:'G',offset:'Ricordo il mare'.length}],startBeat:0,endBeat:4},
 {kind:'spacer',id:'gap'},
 {kind:'line',id:'chords',text:' ',chords:[{name:'Dm',offset:0},{name:'G',offset:1}],startBeat:4,endBeat:8},
]}}]}
for(const scenario of [
 {name:'lyrics-mobile',width:375,theme:'theme-default',editor:false},
 {name:'lyrics-dark-desktop',width:1280,theme:'theme-dark',editor:false},
 {name:'editor-mobile',width:375,theme:'theme-default',editor:true},
])test(`visual ${scenario.name}`,async({page})=>{
 await page.setViewportSize({width:scenario.width,height:1000})
 await page.addInitScript(({fixture,theme})=>{
  localStorage.setItem('mm:user-songs',JSON.stringify([fixture]));localStorage.setItem('mm:settings',JSON.stringify({locale:'en',theme,enabled:['instrument-guitar',theme,'storage-local','parser-abc','renderer-tab','renderer-notation','transport-guitar','content-user'],config:{}}))
 },{fixture,theme:scenario.theme})
 await page.goto('/')
 if(scenario.editor){
  await page.getByRole('button',{name:'Editor',exact:true}).click();await page.getByRole('button',{name:/Studio sul mare/}).click();await page.getByRole('button',{name:'Edit',exact:true}).click()
 }else{
  await page.locator('.mm-artist').getByRole('button',{name:'Open',exact:true}).click();await page.locator('.mm-song').getByRole('button',{name:'Open',exact:true}).click();await expect(page.locator('.mm-chord-sheet .chord-mark').first()).toBeVisible()
 }
 if(process.env.MM_VISUAL_NEGATIVE==='1')await page.addStyleTag({content:'.mm-anchored-lyrics{font-size:2rem!important;color:red!important}'})
 const target=page.locator(scenario.editor?'.mm-lyrics-preview':'.mm-chord-sheet')
 await expect(target).toHaveScreenshot(`${scenario.name}.png`,{animations:'disabled',caret:'hide',maxDiffPixelRatio:0.002})
})
