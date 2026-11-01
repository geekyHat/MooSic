import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appLocation, formatLocation, parseLocation } from '../../src/domain/navigation/location.ts'
import { BrowserNavigation } from '../../src/infrastructure/navigation/BrowserNavigation.ts'
import { singleArrangement } from '../../src/features/library/model/browseLibrary.ts'
import type { ContentSong } from '../../src/core/plugin/types.ts'

test('hash locations roundtrip selections and filters without containing musical or draft content',()=>{
  const route=appLocation()
  route.view='practice';route.library={...route.library,mode:'chords',artistId:'a/b #è',songId:'chosen',rootLetter:'Z',artistLetter:'A',limit:96,filters:{search:'l’acqua & il sole',genre:'folk',composer:'Composer'},panel:'import'}
  route.practice={songId:'song & / #',versionId:'v2',kind:'lyrics',display:'chords'};route.editorSongId='edit'
  assert.deepEqual(parseLocation(formatLocation(route)),route)
  const invalid=parseLocation('#/unknown?mode=bad&letter=oops&kind=bad&display=bad&limit=-1&panel=bad')
  assert.deepEqual(invalid,appLocation())
  assert.deepEqual(parseLocation('#main-content'),appLocation())
  assert.deepEqual(parseLocation('#/'+ 'x'.repeat(9000)),appLocation())
})

test('auto-open requires one version and one arrangement; empty and ambiguous choices stay explicit',()=>{
  const song:ContentSong={meta:{id:'a',title:'A'},versions:[{id:'v1',name:'Original',arrangements:[{kind:'lyrics',piece:{id:'p'} as ContentSong['versions'][number]['arrangements'][number]['piece']}]}]}
  assert.deepEqual(singleArrangement(song),{versionId:'v1',kind:'lyrics'})
  assert.equal(singleArrangement({...song,versions:[]}),null)
  assert.equal(singleArrangement({...song,versions:[{...song.versions[0],arrangements:[]}]}),null)
  assert.equal(singleArrangement({...song,versions:[song.versions[0],{...song.versions[0],id:'v2'}]}),null)
  assert.equal(singleArrangement({...song,versions:[{...song.versions[0],arrangements:[...song.versions[0].arrangements,{...song.versions[0].arrangements[0],kind:'tabs'}]}]}),null)
})

function browserFixture() {
  const events=new EventTarget()
  const entries:{hash:string;state:unknown}[]=[{hash:'',state:null}]
  let position=0,writes=0
  const history={
    get state(){return entries[position].state},scrollRestoration:'auto',
    pushState(state:unknown,_title:string,hash:string){entries.splice(++position);entries.push({state,hash})},
    replaceState(state:unknown,_title:string,hash:string){writes++;entries[position]={state,hash}},
    go(delta:number){if(position+delta<0||position+delta>=entries.length)return;position+=delta;queueMicrotask(()=>events.dispatchEvent(new Event('popstate')))},
  }
  const browser={history,location:{get hash(){return entries[position].hash}},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)} as unknown as Window
  return {browser,history,entries,get position(){return position},get writes(){return writes}}
}
const settle=()=>new Promise<void>(resolve=>setImmediate(resolve))
test('native back and forward restore entries and scroll, replace avoids duplicate entries, StrictMode start is idempotent',async()=>{
  const fixture=browserFixture()
  const nav=new BrowserNavigation(fixture.browser,{isDirty:()=>false,request:action=>action()})
  nav.start()();const stop=nav.start()
  assert.equal(fixture.entries.length,1)
  const route=appLocation();route.library.artistId='artist'
  nav.navigate(route);nav.captureScroll(900)
  nav.navigate({...route,library:{...route.library,filters:{...route.library.filters,search:'words'}}},{replace:true,preserveScroll:true})
  nav.navigate({...route,view:'settings'})
  assert.equal(fixture.entries.length,3)
  fixture.history.go(-1);await settle()
  assert.equal(nav.getSnapshot().route.library.filters.search,'words');assert.equal(nav.getSnapshot().scrollTop,900)
  fixture.history.go(1);await settle();assert.equal(nav.getSnapshot().route.view,'settings')
  stop()
})
test('blocked Back restores the current URL, cancel keeps the draft and confirm traverses without new entries',async()=>{
  const fixture=browserFixture()
  let dirty=false,approve:(()=>void)|undefined,cancel:(()=>void)|undefined
  const nav=new BrowserNavigation(fixture.browser,{isDirty:()=>dirty,request:(action,onCancel)=>{approve=action;cancel=onCancel}})
  nav.start()
  const editor={...appLocation(),view:'editor' as const,editorSongId:'draft'}
  nav.navigate(editor);dirty=true
  fixture.history.go(-1);await settle()
  assert.equal(fixture.position,1);assert.equal(nav.getSnapshot().route.editorSongId,'draft')
  cancel!();assert.equal(fixture.position,1)
  fixture.history.go(-1);await settle();approve!();await settle()
  assert.equal(nav.getSnapshot().route.view,'library');assert.equal(fixture.position,0);assert.equal(fixture.entries.length,2)
})

test('scrolling records the latest position without issuing a History API write for every animation frame',async()=>{
  const fixture=browserFixture(),nav=new BrowserNavigation(fixture.browser,{isDirty:()=>false,request:action=>action()})
  const stop=nav.start(),before=fixture.writes
  for(let top=0;top<1000;top++)nav.captureScroll(top)
  assert.equal(fixture.writes,before)
  nav.navigate({...appLocation(),view:'settings'})
  fixture.history.go(-1);await settle()
  assert.equal(nav.getSnapshot().scrollTop,999)
  stop()
})
