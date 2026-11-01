import '@/app.css'
import type { AppCore } from '@/core/plugin/context-impl'
import type { ArrangementKind } from '@/core/plugin/types'
import type { AppView, LibraryLocation } from '@/domain/navigation/location'
import { BrowserNavigation } from '@/infrastructure/navigation/BrowserNavigation'
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot'
import { NavigationGuard } from '@/shared/navigation/NavigationGuard'
import { Button } from '@/shared/ui/Button'
import { lazy,Suspense,useContext,useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react'
import { AppHeader } from './layout/AppHeader'
import { ChunkBoundary } from './layout/ChunkBoundary'
import { NotificationRegion } from './layout/NotificationRegion'
import { AppProvider } from './providers/AppProvider'
import { PwaNotice } from './layout/PwaNotice'
const Library=lazy(()=>import('@/features/library/LibraryPage').then(m=>({default:m.LibraryView})))
const Practice=lazy(()=>import('@/features/practice/PracticePage').then(m=>({default:m.PracticeView})))
const Editor=lazy(()=>import('@/features/editor/EditorPage').then(m=>({default:m.EditorView})))
const Settings=lazy(()=>import('@/features/settings/SettingsPage').then(m=>({default:m.SettingsView})))
export type View=AppView
export default function App({core}:{core:AppCore}){
 const store=useMemo(()=>({subscribe:core.subscribe.bind(core),getSnapshot:core.getSnapshot}),[core]);useAppSnapshot(store)
 useEffect(()=>{document.documentElement.lang=core.locale},[core.locale])
 return <AppProvider locale={core.locale}><AppShell core={core}/></AppProvider>
}
function AppShell({core}:{core:AppCore}){
 const guard=useContext(NavigationGuard),main=useRef<HTMLElement>(null)
 const [navigation]=useState(()=>new BrowserNavigation(window,guard))
 const entry=useSyncExternalStore(navigation.subscribe,navigation.getSnapshot)
 const route=entry.route,view=route.view
 useEffect(()=>navigation.start(),[navigation])
 useEffect(()=>{void core.ensureLibrary()},[core,core.pluginVersion])
 const rememberScroll=()=>navigation.captureScroll(main.current?.scrollTop??0)
 const changeLibrary=(patch:Partial<LibraryLocation>,replace=false)=>{rememberScroll();const latest=navigation.getSnapshot().route;navigation.navigate({...latest,library:{...latest.library,...patch}},{replace,preserveScroll:replace})}
 const currentPractice=()=>({songId:core.currentSongId,versionId:core.currentVersionId,kind:core.currentSongId?core.currentArrangement:null,display:core.currentSongId===route.practice.songId&&core.currentArrangement===route.practice.kind?route.practice.display:null})
 const navigate=(next:View)=>guard.request(()=>{rememberScroll();navigation.navigate({...route,view:next,editorSongId:next==='editor'?null:route.editorSongId,practice:next==='practice'?currentPractice():route.practice})})
 const openSong=(songId:string,versionId:string,kind:ArrangementKind)=>{
   rememberScroll();navigation.navigate({...route,view:'practice',practice:{songId,versionId,kind,display:null}})
 }
 const editSong=(editorSongId:string)=>guard.request(()=>{rememberScroll();navigation.navigate({...route,view:'editor',editorSongId})})
 const changePractice=(patch:Partial<typeof route.practice>)=>{rememberScroll();navigation.navigate({...route,practice:{...route.practice,...patch}},{preserveScroll:true})}
 const targetSong=route.practice.songId?core.artists.flatMap(artist=>artist.songs).find(song=>song.meta.id===route.practice.songId):null
 const targetVersion=targetSong?.versions.find(version=>version.id===route.practice.versionId)??(!route.practice.versionId?targetSong?.versions[0]:undefined)
 const targetArrangement=targetVersion?.arrangements.find(arrangement=>arrangement.kind===route.practice.kind)??(!route.practice.kind?targetVersion?.arrangements[0]:undefined)
 const catalog=core.library.getSnapshot()
 const loadingCatalog=catalog.status==='idle'||catalog.status==='loading'&&catalog.revision===0
 useEffect(()=>{
   if(view!=='practice' || !targetSong || !targetVersion || !targetArrangement)return
   if(core.currentSongId!==targetSong.meta.id || core.currentVersionId!==targetVersion.id || core.currentArrangement!==targetArrangement.kind || !core.score)core.openSong(targetSong.meta.id,targetVersion.id,targetArrangement.kind)
 },[core,view,targetSong,targetVersion,targetArrangement])
 useEffect(()=>{
   const el=main.current;if(!el||entry.action==='replace')return
   const restore=()=>{
     if(!el.querySelector('[data-navigation-page]'))return false
     if(entry.restore && entry.scrollTop>el.scrollHeight-el.clientHeight+1)return false
     el.scrollTop=entry.restore?entry.scrollTop:0
     if(view==='practice' && entry.action==='push' && el.contains(document.activeElement) && document.activeElement?.getAttribute('role')==='tab')return true
     if(view==='editor' && entry.action==='push' && el.contains(document.activeElement) && document.activeElement?.matches('input,textarea,select'))return true
     const title=el.querySelector<HTMLElement>(view==='library'?'#library-results-title':'h2')
     if(title){title.tabIndex=-1;title.focus({preventScroll:true})}
     return true
   }
   if(restore())return
   const observer=new MutationObserver(()=>{if(restore())observer.disconnect()})
   observer.observe(el,{childList:true,subtree:true})
   return ()=>observer.disconnect()
 },[entry.revision,view])
 const readyPractice=!route.practice.songId || !!targetSong && !!targetVersion && !!targetArrangement && core.currentSongId===targetSong.meta.id && core.currentVersionId===targetVersion.id && core.currentArrangement===targetArrangement.kind
 const loading=<p role="status">{core.locale==='it'?'Caricamento…':'Loading…'}</p>
 return <><div className="mm-shell flex h-full min-w-0 flex-col">
   <a className="mm-skip-link" href="#main-content" onClick={event=>{event.preventDefault();main.current?.focus()}}>{core.t('nav.skip')}</a>
   <AppHeader core={core} view={view} onNavigate={navigate}/>
   <main ref={main} onScroll={rememberScroll} id="main-content" tabIndex={-1} className="mm-main min-h-0 min-w-0 flex-1 overflow-auto p-5 max-narrow:p-3">
     <ChunkBoundary key={view} locale={core.locale}><Suspense fallback={loading}><div data-navigation-page={view}>
       {view==='library'&&<Library core={core} location={route.library} onLocationChange={changeLibrary} onOpen={openSong} onEdit={editSong}/>}
       {view==='practice'&&(loadingCatalog?loading:!route.practice.songId?<p className="text-muted">{core.t('practice.select')}</p>:!targetArrangement?<section><h2>{core.locale==='it'?'Brano non disponibile':'Song unavailable'}</h2><p>{core.locale==='it'?'Il brano o l’arrangiamento non è presente nella libreria di questo dispositivo.':'This song or arrangement is not in this device’s library.'}</p><Button onClick={()=>navigate('library')}>{core.t('nav.library')}</Button></section>:!readyPractice?loading:<Practice core={core} scrollContainer={main} display={route.practice.display} onDisplayChange={display=>changePractice({display})} onArrangementChange={kind=>changePractice({kind,display:null})}/>)}
       {view==='editor'&&<Editor key={route.editorSongId??'index'} core={core} initialSongId={route.editorSongId} onSelectionChange={editorSongId=>{rememberScroll();navigation.navigate({...route,editorSongId})}} onOpenPractice={()=>{rememberScroll();navigation.navigate({...route,view:'practice',practice:currentPractice()})}}/>}
       {view==='settings'&&<Settings core={core}/>}
     </div></Suspense></ChunkBoundary>
   </main><NotificationRegion core={core}/>
 </div>{core.pwa&&<PwaNotice core={core}/>}</>
}
