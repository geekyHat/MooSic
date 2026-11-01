import { ObservableStore } from '../ObservableStore'
import { activeSync,initialSync,type PeerSyncService,type PeerSyncSnapshot } from './PeerSyncService'
export class LazyPeerSyncService extends ObservableStore<PeerSyncSnapshot> implements PeerSyncService {
 private service:PeerSyncService|null=null
 private loading:Promise<PeerSyncService>|null=null
 private generation=0
 private loader:()=>Promise<PeerSyncService>
 private clearInvitation:()=>void
 constructor(supported:boolean,code:string,loader:()=>Promise<PeerSyncService>,clearInvitation:()=>void){super(initialSync(supported,code));this.loader=loader;this.clearInvitation=clearInvitation}
 get busy(){return activeSync(this.getSnapshot().phase)}
 receiveInvitation=(code:string)=>{if(!this.busy&&this.getSnapshot().phase!=='done')this.publish({...this.getSnapshot(),phase:'idle',incomingCode:code,error:''})}
 private async run(action:(service:PeerSyncService)=>Promise<void>){
   const generation=this.generation
   try{
     if(!this.service){
       this.publish({...this.getSnapshot(),phase:'creating'})
       this.loading??=this.loader().then(service=>{this.service=service;service.subscribe(()=>this.publish(service.getSnapshot()));return service}).catch(error=>{this.loading=null;throw error})
       await this.loading
     }
     if(generation!==this.generation)return
     await action(this.service!)
   }catch{if(generation===this.generation)this.publish({...this.getSnapshot(),phase:'error',error:'unavailable'})}
 }
 createOffer=()=>this.run(service=>{this.clearInvitation();return service.createOffer()})
 acceptCode=(code:string)=>this.run(service=>{this.clearInvitation();return service.acceptCode(code)})
 confirm=()=>this.run(service=>service.confirm())
 restore=()=>this.run(service=>service.restore())
 cancel=()=>{this.generation++;this.service?.cancel();this.clearInvitation();this.publish(initialSync(this.getSnapshot().supported))}
}
