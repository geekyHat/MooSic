import { OlgaService } from '@/application/olga/OlgaService'
import { olgaContent } from '@/content/olga'
import { IndexedOlgaRepository } from '@/infrastructure/persistence/IndexedOlgaRepository'
import { SettingsService } from '@/application/settings/SettingsService'
import { SongService } from '@/application/songs/SongService'
import { configureSongService } from '@/content/user/store'
import { AppCore } from '@/core/plugin/context-impl'
import { LocalSettingsRepository } from '@/infrastructure/persistence/LocalSettingsRepository'
import { LocalSongRepository } from '@/infrastructure/persistence/LocalSongRepository'
import { composeCore } from './composeCore'
import { BrowserPwaService } from '@/infrastructure/pwa/BrowserPwaService'
import { recoverInterruptedRestore } from '@/infrastructure/backup/restoreJournal'
import { LazyBackupService } from '@/application/backup/LazyBackupService'
import { LazyPeerSyncService } from '@/application/sync/LazyPeerSyncService'
import { syncInvitation } from '@/infrastructure/sync/invitation'

// Built-in plugins — the "discovery" list for this build (manual §2).
// External plugins will be imported dynamically by the loader (end of Phase 0).
import publicDomainContent from '@/content/publicdomain'
import userContent from '@/content/user'
import guitarPlugin from '@/instruments/guitar'
import ukuleleReserved from '@/instruments/ukulele'
import abcParser from '@/parsers/abc'
import notationRenderer from '@/renderers/notation'
import tabRenderer from '@/renderers/tab'
import localStorePlugin from '@/storage/local'
import darkTheme from '@/themes/dark'
import defaultTheme from '@/themes/default'
import guitarTransport from '@/transports/guitar'
import metronomeTransport from '@/transports/metronome'

export async function bootstrap():Promise<AppCore>{
  const pwa=new BrowserPwaService()
  const invitation=await syncInvitation(window)
  if(invitation.resume)history.replaceState(history.state,'',`${import.meta.env.BASE_URL}#/settings`)
  const repository=new IndexedOlgaRepository()
  await recoverInterruptedRestore(repository,localStorage)
  const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)}
  const songs=new SongService(new LocalSongRepository(storage,window))
  configureSongService(songs)
  const olga=new OlgaService(repository,async function* (...args){
    const {readOlgaZip}=await import('@/infrastructure/olga/readOlgaZip')
    yield* readOlgaZip(...args)
  })
  try{await olga.initialize()}catch(error){console.warn('OLGA local storage unavailable',error)}
  const scan = {read: async (...args: Parameters<import('@/application/scan/ScanReader').ScanReader['read']>) => {
    const {browserScanReader} = await import('@/infrastructure/scan/browserScanReader')
    return browserScanReader.read(...args)
  }}
  let core:AppCore
  const backup=new LazyBackupService(async()=>{
    const {BrowserBackupService}=await import('@/infrastructure/backup/BrowserBackupService')
    return new BrowserBackupService({songs,olga:repository,preferences:()=>({...core.settings.getSnapshot(),enabled:[...core.enabled]}),afterRestore:async preferencesRestored=>{
      await olga.initialize()
      if(!preferencesRestored&&olga.entries.length&&core.registry.get('content-olga'))await core.enablePlugin('content-olga')
      if(!preferencesRestored&&songs.list().length&&core.registry.get('content-user'))await core.enablePlugin('content-user')
      await core.reloadLibrary()
    }})
  })
  const sync=new LazyPeerSyncService(isSecureContext&&'RTCPeerConnection'in window,invitation.code,async()=>{
    const {BrowserPeerSyncService}=await import('@/infrastructure/sync/BrowserPeerSyncService')
    return new BrowserPeerSyncService(backup,new URL(import.meta.env.BASE_URL,location.href).href)
  },invitation.clear)
  let invitationRequest=0
  const receiveInvitation=()=>{if(new URLSearchParams(location.hash.split('?')[1]??'').has('sync')){const request=++invitationRequest;void syncInvitation(window).then(value=>{if(request===invitationRequest)sync.receiveInvitation(value.code)})}}
  window.addEventListener('popstate',receiveInvitation)
  window.addEventListener('hashchange',receiveInvitation)
  receiveInvitation()
  core=await composeCore([guitarPlugin,ukuleleReserved,abcParser,tabRenderer,notationRenderer,metronomeTransport,guitarTransport,publicDomainContent,userContent,olgaContent(olga),localStorePlugin,defaultTheme,darkTheme],{songs,olga,scan,pwa,backup,sync,settings:new SettingsService(new LocalSettingsRepository()),language:navigator.language??'en'})
  return core
}
