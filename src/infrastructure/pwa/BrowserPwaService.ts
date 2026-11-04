import { ObservableStore } from '@/application/ObservableStore'
import type { PwaService, PwaSnapshot } from '@/application/pwa/PwaService'

interface InstallPrompt extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
interface Reply {ok:boolean;error?:string;version?:string;appVersion?:string;appBuild?:string;alreadyActive?:boolean;coreReady?:boolean;ocrReady?:boolean;ocrBytes?:number}
const updateKey='mm:pwa-update'
export class BrowserPwaService extends ObservableStore<PwaSnapshot> implements PwaService {
  private registration:ServiceWorkerRegistration|null=null
  private registrationTask:Promise<ServiceWorkerRegistration>|null=null
  private prompt:InstallPrompt|null=null
  private canUpdate=()=>false
  private reloadApproved=false
  private reloading=false
  private started=false
  private updateTask:Promise<void>|null=null
  private updateTimer:ReturnType<typeof setTimeout>|null=null
  private activationPoll:ReturnType<typeof setInterval>|null=null
  private reconciling=false
  private installPrompt=(event:Event)=>{event.preventDefault();this.prompt=event as InstallPrompt;this.patch({canInstall:true})}
  private installed=()=>{this.prompt=null;this.patch({installed:true,canInstall:false})}
  constructor(){
    super({supported:import.meta.env.PROD&&'serviceWorker' in navigator&&isSecureContext,installed:matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone,canInstall:false,coreReady:false,ocrReady:false,updateReady:false,updating:false,downloading:false,completed:0,total:0,ocrBytes:0,version:'',appVersion:__APP_VERSION__,appBuild:__APP_BUILD__,availableVersion:'',availableBuild:'',reloadRequired:false,updated:false,checking:false,error:'',persistent:null})
    window.addEventListener('beforeinstallprompt',this.installPrompt)
    window.addEventListener('appinstalled',this.installed)
    // Keep handoff listeners for this page's lifetime, including async bootstrap
    // and React effect restarts. An unmounted UI cannot approve an update.
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('message',this.incoming)
      navigator.serviceWorker.addEventListener('controllerchange',this.controllerChanged)
    }
  }
  private patch(value:Partial<PwaSnapshot>){this.publish({...this.getSnapshot(),...value})}
  private message(worker:ServiceWorker,type:string,timeout=10000):Promise<Reply>{
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel()
      const finish=(error?:unknown,value?:Reply)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();if(error)reject(error);else resolve(value!)}
      const timer=setTimeout(()=>finish(new Error('timeout')),timeout)
      channel.port1.onmessage=event=>finish(undefined,event.data as Reply)
      try{worker.postMessage({type},[channel.port2])}catch(error){finish(error)}
    })
  }
  private endHandoff(){
    if(this.updateTimer)clearTimeout(this.updateTimer)
    if(this.activationPoll)clearInterval(this.activationPoll)
    this.updateTimer=null;this.activationPoll=null;this.reloadApproved=false
  }
  private beginHandoff(){
    if(this.updateTimer)return
    this.patch({updating:true,error:''})
    this.activationPoll=setInterval(()=>{void this.activationStatus()},500)
    this.updateTimer=setTimeout(()=>{
      this.endHandoff();this.patch({updating:false,error:'update-timeout'})
      void this.refresh().catch(()=>{})
    },20000)
  }
  private async controllerStatus(){
    const worker=navigator.serviceWorker.controller??this.registration?.active
    return worker?this.message(worker,'STATUS'):null
  }
  private async activationStatus(){
    // Poll registration state without messaging the old worker. Repeated STATUS
    // events keep it alive and can prevent the waiting worker from activating.
    const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    if(registration)this.registration=registration
    if(registration?.waiting||registration?.installing)return
    await this.reconcileController()
  }
  private async reconcileController(){
    if(this.reconciling||this.reloading)return
    this.reconciling=true
    try{
      const value=await this.controllerStatus()
      if(!value?.ok)return
      const different=!!value.appBuild&&(value.appBuild!==__APP_BUILD__||!!value.appVersion&&value.appVersion!==__APP_VERSION__)
      if(different&&this.reloadApproved){
        this.reloading=true;this.endHandoff()
        try{sessionStorage.setItem(updateKey,JSON.stringify({build:value.appBuild,version:value.appVersion}))}catch{/* Version labels still verify the loaded release. */}
        location.reload();return
      }
      this.patch({reloadRequired:different,coreReady:!!value.coreReady,ocrReady:!!value.ocrReady,version:value.version??'',ocrBytes:value.ocrBytes??0})
      if(different)this.patch({availableVersion:value.appVersion??'',availableBuild:value.appBuild??''})
      if(!different&&value.appBuild===__APP_BUILD__){
        try{const expected=JSON.parse(sessionStorage.getItem(updateKey)??'null');if(expected?.build===__APP_BUILD__&&expected?.version===__APP_VERSION__){sessionStorage.removeItem(updateKey);this.patch({updated:true,error:''})}}catch{/* Invalid session metadata does not affect the library. */}
      }
    }catch{/* A temporarily restarting worker is retried until the handoff deadline. */}
    finally{this.reconciling=false}
  }
  private async refresh(){
    const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    if(registration)this.registration=registration
    const waiting=this.registration?.waiting
    const ready=!!waiting&&waiting.state==='installed'
    this.patch({updateReady:ready})
    if(ready){
      const value=await this.message(waiting,'STATUS')
      if(value.ok)this.patch({availableVersion:value.appVersion??'',availableBuild:value.appBuild??''})
    }else if(!this.getSnapshot().reloadRequired)this.patch({availableVersion:'',availableBuild:''})
    await this.reconcileController()
  }
  private incoming=(event:MessageEvent)=>{
    if(!(event.source instanceof ServiceWorker)||event.source.scriptURL!==new URL(`${import.meta.env.BASE_URL}sw.js`,location.href).href)return
    if(event.data?.type==='CAN_UPDATE') {
      const ready=this.started&&this.canUpdate()&&!this.getSnapshot().downloading
      if(ready)this.beginHandoff()
      event.ports[0]?.postMessage({ready})
    }
    if(event.data?.type==='UPDATE_CANCELLED'){this.endHandoff();this.patch({updating:false,error:'busy-tabs'})}
    if(event.data?.type==='RELOAD_ON_ACTIVATE'){
      this.reloadApproved=true;this.beginHandoff()
      if(event.data.appVersion)this.patch({availableVersion:event.data.appVersion,availableBuild:event.data.appBuild??''})
      // controllerchange may have been dispatched before this message.
      void this.activationStatus().catch(()=>{})
    }
    if(event.data?.type==='APP_VERSION')event.ports[0]?.postMessage({version:__APP_BUILD__+'/'+__APP_VERSION__})
    if(event.data?.type==='OCR_PROGRESS')this.patch({completed:Number(event.data.completed)||0,total:Number(event.data.total)||0})
  }
  private controllerChanged=()=>{void this.refresh().catch(()=>{})}
  start=(canUpdate:()=>boolean)=>{
    this.canUpdate=canUpdate
    if(this.started)return ()=>{}
    this.started=true
    let interval:ReturnType<typeof setInterval>|undefined
    const check=()=>{if(document.visibilityState==='visible'&&navigator.onLine&&!this.getSnapshot().updating)void this.checkUpdate()}
    if(this.getSnapshot().supported){
      this.registrationTask??=navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).catch(error=>{this.registrationTask=null;throw error})
      void this.registrationTask.then(async registration=>{
        this.registration=registration
        const watch=()=>{
          const worker=registration.installing
          if(worker)worker.addEventListener('statechange',()=>{
            if(worker.state==='installed'||worker.state==='activated')void this.refresh().catch(()=>{})
            if(worker.state==='activated')void this.message(worker,'CLEAN_OLD_CACHES').catch(()=>{})
            if(worker.state==='redundant')this.patch({error:'offline-failed'})
          })
          void this.refresh().catch(()=>{})
        }
        registration.addEventListener('updatefound',watch);watch()
        await navigator.serviceWorker.ready
        await this.refresh()
        if(registration.active)void this.message(registration.active,'CLEAN_OLD_CACHES').catch(()=>{})
      }).catch(()=>this.patch({error:'offline-failed'}))
      window.addEventListener('online',check);document.addEventListener('visibilitychange',check)
      interval=setInterval(check,60*60*1000)
      void navigator.storage?.persisted?.().then(value=>this.patch({persistent:value})).catch(()=>{})
    }
    return ()=>{
      this.started=false;this.canUpdate=()=>false
      window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);if(interval)clearInterval(interval)
    }
  }
  install=async()=>{
    const prompt=this.prompt;if(!prompt)return
    this.prompt=null;this.patch({canInstall:false,error:''})
    try{await prompt.prompt();await prompt.userChoice}catch{this.patch({error:'install-failed'})}
  }
  checkUpdate=async()=>{
    if(this.getSnapshot().checking||this.getSnapshot().updating)return
    this.patch({checking:true})
    try{await this.registration?.update();await this.refresh();if(this.getSnapshot().error==='check-failed')this.patch({error:''})}
    catch{this.patch({error:'check-failed'})}finally{this.patch({checking:false})}
  }
  prepareOffline=async()=>{
    if(!this.registration?.active||this.getSnapshot().downloading)return
    this.patch({downloading:true,error:'',completed:0})
    try{const value=await this.message(this.registration.active,'DOWNLOAD_OCR',300000);if(!value.ok)throw new Error();await this.refresh()}catch{this.patch({error:'offline-failed'})}
    finally{this.patch({downloading:false})}
  }
  applyUpdate=()=>{
    if(this.updateTask)return this.updateTask
    this.updateTask=this.activate().finally(()=>{this.updateTask=null})
    return this.updateTask
  }
  private async activate(){
    if(!this.canUpdate()||this.getSnapshot().downloading){this.patch({error:'busy-tabs'});return}
    try{
      await this.refresh()
      const worker=this.registration?.waiting
      if(!worker){
        this.endHandoff();this.patch({updating:false,updateReady:false})
        if(this.getSnapshot().reloadRequired){this.reloadApproved=true;await this.reconcileController()}
        return
      }
      this.patch({error:''});this.beginHandoff()
      const value=await this.message(worker,'ACTIVATE_UPDATE',15000)
      if(!value.ok){this.endHandoff();this.patch({updating:false,error:value.error==='busy-tabs'?'busy-tabs':'update-failed'});return}
      this.reloadApproved=true
      await this.activationStatus()
      if(value.alreadyActive&&!this.reloading){this.endHandoff();this.patch({updating:false,updateReady:false});await this.refresh()}
    }catch{this.endHandoff();this.patch({updating:false,error:'update-failed'});void this.refresh().catch(()=>{})}
  }
  protectStorage=async()=>{try{this.patch({persistent:await navigator.storage?.persist?.()??false})}catch{this.patch({persistent:false})}}
}
