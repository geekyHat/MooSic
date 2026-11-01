import { ObservableStore } from '@/application/ObservableStore'
import type { PwaService, PwaSnapshot } from '@/application/pwa/PwaService'

interface InstallPrompt extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
interface Reply {ok:boolean;error?:string;version?:string;coreReady?:boolean;ocrReady?:boolean;ocrBytes?:number}
export class BrowserPwaService extends ObservableStore<PwaSnapshot> implements PwaService {
  private registration:ServiceWorkerRegistration|null=null
  private registrationTask:Promise<ServiceWorkerRegistration>|null=null
  private prompt:InstallPrompt|null=null
  private canUpdate=()=>true
  private reloadApproved=false
  private started=false
  private installPrompt=(event:Event)=>{event.preventDefault();this.prompt=event as InstallPrompt;this.patch({canInstall:true})}
  private installed=()=>{this.prompt=null;this.patch({installed:true,canInstall:false})}
  constructor(){
    super({supported:import.meta.env.PROD&&'serviceWorker' in navigator&&isSecureContext,installed:matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone,canInstall:false,coreReady:false,ocrReady:false,updateReady:false,updating:false,downloading:false,completed:0,total:0,ocrBytes:0,version:'',error:'',persistent:null})
    // The core owns one service for the page lifetime. Capture installation events
    // before asynchronous data recovery and keep them across React effect restarts.
    window.addEventListener('beforeinstallprompt',this.installPrompt)
    window.addEventListener('appinstalled',this.installed)
  }
  private patch(value:Partial<PwaSnapshot>){this.publish({...this.getSnapshot(),...value})}
  private message(worker:ServiceWorker,type:string,timeout=10000):Promise<Reply>{
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(new Error('timeout'))},timeout)
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data as Reply)}
      worker.postMessage({type},[channel.port2])
    })
  }
  private async status(){
    const worker=this.registration?.active
    if(!worker)return
    const value=await this.message(worker,'STATUS')
    if(value.ok)this.patch({coreReady:!!value.coreReady,ocrReady:!!value.ocrReady,version:value.version??'',ocrBytes:value.ocrBytes??0})
  }
  private incoming=(event:MessageEvent)=>{
    if(!(event.source instanceof ServiceWorker)||event.source.scriptURL!==new URL(`${import.meta.env.BASE_URL}sw.js`,location.href).href)return
    if(event.data?.type==='CAN_UPDATE') {
      const ready=this.canUpdate()&&!this.getSnapshot().downloading
      if(ready)this.patch({updating:true})
      event.ports[0]?.postMessage({ready})
    }
    if(event.data?.type==='UPDATE_CANCELLED'){this.reloadApproved=false;this.patch({updating:false,error:'busy-tabs'})}
    if(event.data?.type==='RELOAD_ON_ACTIVATE'){this.reloadApproved=true;this.patch({updating:true})}
    if(event.data?.type==='APP_VERSION')event.ports[0]?.postMessage({version:import.meta.env.PROD?__APP_BUILD__:'development'})
    if(event.data?.type==='OCR_PROGRESS')this.patch({completed:Number(event.data.completed)||0,total:Number(event.data.total)||0})
  }
  private controllerChanged=()=>{
    if(this.reloadApproved){location.reload();return}
    void this.status().catch(()=>{})
  }
  start=(canUpdate:()=>boolean)=>{
    this.canUpdate=canUpdate
    if(this.started)return ()=>{}
    this.started=true
    let interval:ReturnType<typeof setInterval>|undefined
    const check=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void this.checkUpdate()}
    if(this.getSnapshot().supported){
      navigator.serviceWorker.addEventListener('message',this.incoming)
      navigator.serviceWorker.addEventListener('controllerchange',this.controllerChanged)
      this.registrationTask??=navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).catch(error=>{this.registrationTask=null;throw error})
      void this.registrationTask.then(async registration=>{
        this.registration=registration
        const waitingUpdate=()=>!!registration.waiting&&!!registration.active&&registration.waiting!==registration.active
        const watch=()=>{
          if(waitingUpdate())this.patch({updateReady:true})
          const worker=registration.installing
          if(worker)worker.addEventListener('statechange',()=>{
            if(worker.state==='installed'&&waitingUpdate())this.patch({updateReady:true})
            if(worker.state==='activated'){this.patch({updateReady:waitingUpdate()});void this.status().catch(()=>{});void this.message(worker,'CLEAN_OLD_CACHES').catch(()=>{})}
            if(worker.state==='redundant')this.patch({error:'offline-failed'})
          })
        }
        registration.addEventListener('updatefound',watch);watch()
        await navigator.serviceWorker.ready
        this.patch({updateReady:waitingUpdate()})
        await this.status()
        void this.message(registration.active!,'CLEAN_OLD_CACHES').catch(()=>{})
      }).catch(()=>this.patch({error:'offline-failed'}))
      window.addEventListener('online',check);document.addEventListener('visibilitychange',check)
      interval=setInterval(check,60*60*1000)
      void navigator.storage?.persisted?.().then(value=>this.patch({persistent:value})).catch(()=>{})
    }
    return ()=>{
      this.started=false
      navigator.serviceWorker?.removeEventListener('message',this.incoming);navigator.serviceWorker?.removeEventListener('controllerchange',this.controllerChanged)
      window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);if(interval)clearInterval(interval)
    }
  }
  install=async()=>{
    const prompt=this.prompt;if(!prompt)return
    // A browser prompt can be consumed once. Acceptance alone is not proof of installation.
    this.prompt=null;this.patch({canInstall:false,error:''})
    try{await prompt.prompt();await prompt.userChoice}catch{this.patch({error:'install-failed'})}
  }
  checkUpdate=async()=>{try{await this.registration?.update();this.patch({updateReady:!!this.registration?.waiting,...(this.getSnapshot().error==='check-failed'?{error:''}:{})});await this.status()}catch{this.patch({error:'check-failed'})}}
  prepareOffline=async()=>{
    if(!this.registration?.active||this.getSnapshot().downloading)return
    this.patch({downloading:true,error:'',completed:0})
    try{const value=await this.message(this.registration.active,'DOWNLOAD_OCR',300000);if(!value.ok)throw new Error();await this.status()}catch{this.patch({error:'offline-failed'})}
    finally{this.patch({downloading:false})}
  }
  applyUpdate=async()=>{
    if(!this.canUpdate()){this.patch({error:'busy-tabs'});return}
    try{
      // Obtain current registration state: updatefound and installed notifications can
      // precede waiting-state propagation to another registration wrapper.
      const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
      const worker=registration?.waiting
      if(!worker){this.patch({updateReady:false});return}
      this.registration=registration;this.patch({error:''})
      const value=await this.message(worker,'ACTIVATE_UPDATE',15000)
      if(!value.ok)this.patch({updating:false,error:'busy-tabs'})
    }catch{this.patch({updating:false,error:'check-failed'})}
  }
  protectStorage=async()=>{try{this.patch({persistent:await navigator.storage?.persist?.()??false})}catch{this.patch({persistent:false})}}
}
