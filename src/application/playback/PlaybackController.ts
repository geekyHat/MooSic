import type { Scheduler } from '@/core/scheduler';
import { ObservableStore } from '../ObservableStore';
export interface PlaybackSnapshot {status:'idle'|'starting'|'playing'|'paused'|'ended'|'error';silent:boolean;tempoFactor?:number;error?:string}
export interface PlaybackTransport {start():void|Promise<void>;stop():void}
export class PlaybackController extends ObservableStore<PlaybackSnapshot>{
 private generation=0
 private transportQueue:Promise<void>=Promise.resolve()
 private owned:PlaybackTransport|null=null
 private scheduler:Scheduler
 private transport:()=>PlaybackTransport|null
 constructor(scheduler:Scheduler,transport:()=>PlaybackTransport|null){
  super({status:'idle',silent:false});this.scheduler=scheduler;this.transport=transport
  scheduler.on('end',()=>{this.pause();this.publish({...this.getSnapshot(),status:'ended'})})
 }
 async play(silent=false,from?:number){
  if(this.getSnapshot().status==='starting')return
  this.pause();const currentGeneration=++this.generation
  this.publish({status:'starting',silent})
  try{
   if(!silent){
    await this.scheduler.prepareAudio()
    if(from!==undefined)this.scheduler.seek(from)
    const attach=this.transportQueue.then(async()=>{
     if(currentGeneration!==this.generation)return
     const transport=this.transport();this.owned=transport;await transport?.start()
     if(currentGeneration!==this.generation)transport?.stop()
    })
    this.transportQueue=attach.catch(()=>{})
    await attach
    if(currentGeneration!==this.generation)return
   }
   await this.scheduler.play(silent?from:undefined)
   if(currentGeneration!==this.generation)return
   if(!this.scheduler.isPlaying){this.publish({status:this.scheduler.piece?'ended':'idle',silent});return}
   this.publish({status:'playing',silent})
  }catch(e){if(currentGeneration===this.generation){this.pause();this.publish({status:'error',silent,error:String(e)})}}
 }
 pause(){
  this.generation++;this.scheduler.pause();const transport=this.owned;this.owned=null
  try{transport?.stop();this.publish({...this.getSnapshot(),status:'paused'})}
  catch(error){this.publish({...this.getSnapshot(),status:'error',error:String(error)})}
 }
 restart(){this.pause();this.scheduler.seek(this.scheduler.currentLoop?.from??0)}
 seek(time:number){this.scheduler.seek(time)}
 setTempo(factor:number){this.scheduler.setTempoFactor(factor);this.publish({...this.getSnapshot(),tempoFactor:this.scheduler.tempoFactor})}
 setLoop(loop:{from:number;to:number}|null){this.scheduler.setLoop(loop)}
 reset(){this.pause();this.scheduler.setLoop(null);this.scheduler.seek(0);this.publish({status:'idle',silent:false})}
}
