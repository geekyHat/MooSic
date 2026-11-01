import {ObservableStore} from '@/application/ObservableStore'
import type {BackupService} from '@/application/backup/BackupService'
import {activeSync,initialSync,type PeerSyncSnapshot,type PeerSyncService} from '@/application/sync/PeerSyncService'
import {BACKUP_LIMITS,BackupError} from '@/domain/backup/backup'
import {decodePairing,descriptionHash,digest,encodePairing,PAIRING_LIFETIME,SyncError,type PairingCode} from './pairingCode'

const CHUNK=16384
export class BrowserPeerSyncService extends ObservableStore<PeerSyncSnapshot> implements PeerSyncService {
 private backup:BackupService
 private appURL:string
 private peer:RTCPeerConnection|null=null
 private channel:RTCDataChannel|null=null
 private offer:PairingCode|null=null
 private answer:PairingCode|null=null
 private abort=new AbortController()
 private timer:ReturnType<typeof setTimeout>|null=null
 private connectionTimer:ReturnType<typeof setTimeout>|null=null
 private incoming:{size:number;sha:string;parts:ArrayBuffer[];received:number}|null=null
 private sending=false
 private sent=false
 private received=false
 private remoteReceived=false
 private messageQueue:Promise<void>=Promise.resolve()
 constructor(backup:BackupService,appURL:string){super(initialSync(isSecureContext&&'RTCPeerConnection'in window));this.backup=backup;this.appURL=appURL}
 get busy(){return activeSync(this.getSnapshot().phase)}
 private patch(value:Partial<PeerSyncSnapshot>){this.publish({...this.getSnapshot(),...value})}
 private close(){this.abort.abort();if(this.timer)clearTimeout(this.timer);if(this.connectionTimer)clearTimeout(this.connectionTimer);this.timer=null;this.connectionTimer=null;this.channel?.close();this.peer?.close();this.channel=null;this.peer=null;this.incoming=null;this.receivedFile=null}
 cancel=()=>{this.patch({phase:'idle'});this.close();this.backup.discard();this.publish(initialSync(this.getSnapshot().supported))}
 private fail(error:unknown){
   if(this.abort.signal.aborted)return
   const code=error instanceof SyncError?error.code:error instanceof BackupError?'backup-'+error.code:'connection'
   this.patch({phase:'error',error:code,outgoingCode:'',shareLink:'',comparison:'',preview:null});this.close();this.backup.discard()
 }
 private async perform(action:()=>Promise<void>){if(this.abort.signal.aborted)this.abort=new AbortController();let signal:AbortSignal|undefined;try{const pending=action();signal=this.abort.signal;await pending}catch(error){if(!signal||signal===this.abort.signal)this.fail(error)}}
 private setup(expires:number){
   this.close();this.abort=new AbortController();this.incoming=null;this.sending=false;this.sent=false;this.received=false;this.remoteReceived=false;this.finishing=false;this.messageQueue=Promise.resolve()
   this.publish({...initialSync(this.getSnapshot().supported),phase:'creating'})
   if(!this.getSnapshot().supported)throw new SyncError('unavailable')
   this.peer=new RTCPeerConnection({iceServers:[]})
   this.peer.onconnectionstatechange=()=>{if(this.peer?.connectionState==='failed'&&!this.complete())this.fail(new SyncError('connection'))}
   this.timer=setTimeout(()=>this.fail(new SyncError('expired')),Math.max(1,expires-Date.now()))
 }
 private async gather(){
   const peer=this.peer!,signal=this.abort.signal
   if(peer.iceGatheringState==='complete')return
   await new Promise<void>((resolve,reject)=>{
     const finish=(error?:Error)=>{clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',check);signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve()}
     const check=()=>{if(peer.iceGatheringState==='complete')finish()}
     const cancel=()=>finish(new SyncError('cancelled'))
     const timer=setTimeout(()=>finish(new SyncError('connection')),15000)
     peer.addEventListener('icegatheringstatechange',check);signal.addEventListener('abort',cancel,{once:true});check()
   })
   signal.throwIfAborted()
 }
 private expose(code:PairingCode){const outgoingCode=encodePairing(code);this.patch({outgoingCode,shareLink:this.appURL+'#/settings?sync='+outgoingCode})}
 createOffer=()=>this.perform(async()=>{
   if(this.backup.busy)throw new SyncError('busy')
   const expires=Date.now()+PAIRING_LIFETIME;this.setup(expires);this.answer=null;this.offer=null
   const peer=this.peer!,signal=this.abort.signal
   this.attach(peer.createDataChannel('musicmaestro-library-v1',{ordered:true}))
   const description=await peer.createOffer();signal.throwIfAborted();await peer.setLocalDescription(description);signal.throwIfAborted();await this.gather();signal.throwIfAborted()
   this.offer={version:1,kind:'offer',id:crypto.randomUUID(),expires,sdp:peer.localDescription!.sdp}
   this.expose(this.offer);this.patch({phase:'offer'})
 })
 acceptCode=(input:string)=>this.perform(async()=>{
   const code=decodePairing(input)
   if(code.kind==='offer'){
     if(this.busy||this.backup.busy)throw new SyncError('busy')
     this.setup(code.expires);this.offer=code;this.answer=null
     const peer=this.peer!,signal=this.abort.signal
     peer.ondatachannel=event=>{if(signal===this.abort.signal)this.attach(event.channel);else event.channel.close()}
     await peer.setRemoteDescription({type:'offer',sdp:code.sdp});signal.throwIfAborted()
     const description=await peer.createAnswer();signal.throwIfAborted();await peer.setLocalDescription(description);signal.throwIfAborted();await this.gather();signal.throwIfAborted()
     const offerHash=await descriptionHash(code.sdp);signal.throwIfAborted()
     this.answer={version:1,kind:'answer',id:code.id,expires:code.expires,sdp:peer.localDescription!.sdp,offerHash}
     this.expose(this.answer);this.patch({phase:'answer'});this.waitForConnection();await this.opened()
   }else{
     const offer=this.offer,peer=this.peer,signal=this.abort.signal
     if(!offer||!peer||this.getSnapshot().phase!=='offer'||code.id!==offer.id||code.offerHash!==await descriptionHash(offer.sdp))throw new SyncError('pair')
     signal.throwIfAborted()
     this.answer=code;this.patch({phase:'connecting'});this.waitForConnection()
     await peer.setRemoteDescription({type:'answer',sdp:code.sdp});signal.throwIfAborted();await this.opened()
   }
 })
 private waitForConnection(){this.connectionTimer=setTimeout(()=>this.fail(new SyncError('connection')),60000)}
 private attach(channel:RTCDataChannel){
   if(this.channel&&this.channel!==channel){channel.close();return}
   const signal=this.abort.signal
   this.channel=channel;channel.binaryType='arraybuffer';channel.bufferedAmountLowThreshold=65536
   channel.onopen=()=>{void this.perform(()=>this.opened())}
   channel.onerror=()=>{if(!signal.aborted&&!this.complete())this.fail(new SyncError('connection'))}
   channel.onclose=()=>{if(!signal.aborted&&!(this.sent&&this.received&&this.remoteReceived)&&!['review','done','restoring','idle','error'].includes(this.getSnapshot().phase))this.fail(new SyncError('closed'))}
   channel.onmessage=event=>{this.messageQueue=this.messageQueue.then(()=>signal===this.abort.signal?this.message(event.data):undefined).catch(error=>{if(signal===this.abort.signal)this.fail(error)})}
 }
 private async opened(){
   if(this.channel?.readyState!=='open'||!this.offer||!this.answer||!['creating','offer','answer','connecting'].includes(this.getSnapshot().phase))return
   const signal=this.abort.signal,hash=await descriptionHash(JSON.stringify([this.offer.id,this.offer.sdp,this.answer.sdp]));signal.throwIfAborted()
   if(this.connectionTimer)clearTimeout(this.connectionTimer)
   this.patch({phase:'verify',comparison:hash.slice(0,4).toUpperCase()+' '+hash.slice(4,8).toUpperCase(),outgoingCode:'',shareLink:''})
 }
 private send(message:object){if(this.channel?.readyState!=='open')throw new SyncError('closed');this.channel.send(JSON.stringify(message))}
 confirm=()=>this.perform(async()=>{
   if(this.getSnapshot().phase!=='verify'||this.getSnapshot().confirmed)return
   this.send({type:'consent'});this.patch({confirmed:true});await this.exchange()
 })
 private async writable(){
   const channel=this.channel!,signal=this.abort.signal
   if(channel.readyState!=='open')throw new SyncError('closed')
   if(channel.bufferedAmount<=131072)return
   await new Promise<void>((resolve,reject)=>{
     const done=(error?:Error)=>{clearTimeout(timer);channel.removeEventListener('bufferedamountlow',ok);channel.removeEventListener('close',closed);signal.removeEventListener('abort',closed);if(error)reject(error);else resolve()}
     const ok=()=>done(),closed=()=>done(new SyncError('closed')),timer=setTimeout(closed,30000)
     channel.addEventListener('bufferedamountlow',ok,{once:true});channel.addEventListener('close',closed,{once:true});signal.addEventListener('abort',closed,{once:true})
     if(channel.bufferedAmount<=65536)ok()
   })
 }
 private async exchange(){
   if(!this.getSnapshot().confirmed||!this.getSnapshot().peerConfirmed||this.sending)return
   this.sending=true;this.patch({phase:'transfer'})
   const signal=this.abort.signal,blob=await this.backup.export({signal,progress:()=>{}})
   const sha=await digest(new Uint8Array(await blob.arrayBuffer()));signal.throwIfAborted()
   this.patch({sendTotal:blob.size});this.send({type:'library',size:blob.size,sha})
   for(let offset=0;offset<blob.size;offset+=CHUNK){
     await this.writable();signal.throwIfAborted();const bytes=await blob.slice(offset,offset+CHUNK).arrayBuffer();signal.throwIfAborted();this.channel!.send(bytes);this.patch({sent:Math.min(blob.size,offset+CHUNK)})
   }
   this.send({type:'end'});this.sent=true;await this.finish()
 }
 private async message(value:unknown){
   if(this.abort.signal.aborted)return
   const signal=this.abort.signal
   if(value instanceof ArrayBuffer){
     const incoming=this.incoming;if(!incoming||value.byteLength!==Math.min(CHUNK,incoming.size-incoming.received)||!value.byteLength)throw new SyncError('protocol')
     incoming.parts.push(value);incoming.received+=value.byteLength;this.patch({received:incoming.received});return
   }
   if(typeof value!=='string'||value.length>1000)throw new SyncError('protocol')
   let message:Record<string,unknown>;try{message=JSON.parse(value)}catch{throw new SyncError('protocol')}
   if(!message||typeof message!=='object')throw new SyncError('protocol')
   if(message.type==='consent'){
     if(!['verify','transfer'].includes(this.getSnapshot().phase))throw new SyncError('protocol')
     this.patch({peerConfirmed:true});void this.perform(()=>this.exchange());return
   }
   if(!this.getSnapshot().confirmed||!this.getSnapshot().peerConfirmed)throw new SyncError('protocol')
   if(message.type==='received'){this.remoteReceived=true;await this.finish();return}
   if(message.type==='library'){
     if(this.incoming||this.received||typeof message.size!=='number'||!Number.isSafeInteger(message.size)||message.size<22||message.size>BACKUP_LIMITS.compressed||typeof message.sha!=='string'||!/^[a-f0-9]{64}$/.test(message.sha))throw new SyncError('protocol')
     this.incoming={size:message.size,sha:message.sha,parts:[],received:0};this.patch({receiveTotal:message.size});return
   }
   if(message.type==='end'){
     const incoming=this.incoming;if(!incoming||incoming.size!==incoming.received)throw new SyncError('protocol')
     const blob=new Blob(incoming.parts,{type:'application/zip'});incoming.parts=[]
     if(await digest(new Uint8Array(await blob.arrayBuffer()))!==incoming.sha)throw new SyncError('integrity')
     signal.throwIfAborted()
     this.incoming=null;this.received=true
     // The local export finishes before verification uses the shared backup adapter.
     this.receivedFile=new File([blob],'MusicMaestro-peer.zip',{type:'application/zip'});this.send({type:'received'});await this.finish();return
   }
   if(message.type!=='restored')throw new SyncError('protocol')
 }
 private receivedFile:File|null=null
 private finishing=false
 private complete(){return this.sent&&this.received&&this.remoteReceived}
 private async finish(){
   if(!this.sent||!this.received||!this.remoteReceived||this.finishing)return
   this.finishing=true
   const signal=this.abort.signal,preview=await this.backup.prepare(this.receivedFile!,{signal,progress:()=>{}})
   signal.throwIfAborted()
   this.receivedFile=null;this.patch({phase:'review',preview})
   if(this.timer)clearTimeout(this.timer)
 }
 restore=()=>this.perform(async()=>{
   const preview=this.getSnapshot().preview;if(this.getSnapshot().phase!=='review'||!preview)return
   this.patch({phase:'restoring'})
   const signal=this.abort.signal,result=await this.backup.restore(preview.token,false,{signal,progress:()=>{}})
   signal.throwIfAborted()
   this.patch({phase:'done',result,preview:null});this.close()
 })
}
