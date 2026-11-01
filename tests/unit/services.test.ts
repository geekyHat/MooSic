import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LibraryService } from '../../src/application/library/LibraryService.ts'
import { NotificationStore } from '../../src/application/notifications/NotificationStore.ts'
import { PlaybackController } from '../../src/application/playback/PlaybackController.ts'
import { Scheduler } from '../../src/core/scheduler/index.ts'
import { piece } from '../fixtures/songs.ts'
test('stable snapshots, latest reload wins and notifications cannot invalidate catalog',async()=>{
 const library=new LibraryService(); const initial=library.getSnapshot();assert.equal(initial,library.getSnapshot())
 let slow!:(v:{artists:[];errors:string[]})=>void
 const a=library.reload(()=>new Promise(resolve=>{slow=resolve}))
 await library.reload(async()=>({artists:[],errors:['B']}));slow({artists:[],errors:['A']});await a
 assert.deepEqual(library.getSnapshot().errors,['B'])
 const snapshot=library.getSnapshot();const n=new NotificationStore();n.notify('info','hello');n.dismiss(n.getSnapshot()[0].id);assert.equal(library.getSnapshot(),snapshot)
})
test('playback cancels slow resume and prevents stale transport after pause',async(t)=>{
 let resume!:()=>void
 Object.assign(globalThis,{AudioContext:class {state='suspended';currentTime=0;resume(){return new Promise<void>(resolve=>{resume=resolve})}}})
 const scheduler=new Scheduler();scheduler.setPiece(piece());let starts=0;let stops=0
 const controller=new PlaybackController(scheduler,()=>({start:async()=>{starts++},stop:()=>{stops++}}))
 t.after(()=>controller.pause())
 const start=controller.play(false);controller.pause();resume();await start
 assert.equal(scheduler.isPlaying,false);assert.equal(starts,0);assert.equal(controller.getSnapshot().status,'paused')
})
test('silent mode advances clock without starting transport and loop horizon excludes boundary',async(t)=>{
 let clock=10;Object.assign(globalThis,{AudioContext:class {state='running';get currentTime(){return clock}}})
 const scheduler=new Scheduler();scheduler.setPiece(piece());scheduler.setLoop({from:2,to:4});let starts=0
 const controller=new PlaybackController(scheduler,()=>({start:()=>{starts++},stop:()=>{}}))
 t.after(()=>controller.pause())
 let horizon=0;scheduler.on('schedule-window',w=>{horizon=w.to})
 await controller.play(true,3.99);clock=10.15
 assert.equal(starts,0);assert.equal(scheduler.isPlaying,true);assert.ok(horizon<4)
 controller.pause()
})
test('a cancelled slow transport is stopped before the next start is attached',async(t)=>{
 Object.assign(globalThis,{AudioContext:class{state='running';currentTime=0}})
 const scheduler=new Scheduler();scheduler.setPiece(piece());let starts=0;let finish!:()=>void;let running=false
 const controller=new PlaybackController(scheduler,()=>({start:()=>{starts++;if(starts===1)return new Promise<void>(r=>{finish=()=>{running=true;r()}});running=true},stop:()=>{running=false}}))
 t.after(()=>controller.pause())
 const first=controller.play(false);await Promise.resolve();await Promise.resolve();controller.pause()
 const second=controller.play(false);await Promise.resolve();await Promise.resolve();finish();await Promise.all([first,second])
 assert.equal(running,true);assert.equal(starts,2);controller.pause()
})
test('transport stop failure is published without escaping the pause command',async(t)=>{
 Object.assign(globalThis,{AudioContext:class{state='running';currentTime=0}})
 const scheduler=new Scheduler();scheduler.setPiece(piece())
 const controller=new PlaybackController(scheduler,()=>({start(){},stop(){throw new Error('stop failed')}}));t.after(()=>scheduler.pause())
 await controller.play();assert.doesNotThrow(()=>controller.pause());assert.equal(controller.getSnapshot().status,'error');assert.equal(scheduler.isPlaying,false)
})
