import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Scheduler } from '../../src/core/scheduler/index.ts'
import { activeTokenAt,lyricTokens } from '../../src/domain/score/lyrics.ts'
import { piece } from '../fixtures/songs.ts'
for(const rate of [.25,.5,1,2])test(`scheduler retains timing at ${rate}x, pause, live tempo, seek and actual loop interval`,async()=>{
 let clock=10;let tick=()=>{}
 const interval=globalThis.setInterval,clear=globalThis.clearInterval,Audio=globalThis.AudioContext
 Object.assign(globalThis,{AudioContext:class{state='running';get currentTime(){return clock}},setInterval:(cb:()=>void)=>{tick=cb;return 1},clearInterval:()=>{}})
 try{
  const s=new Scheduler();s.setPiece(piece());s.setTempoFactor(rate)
  const tokens=lyricTokens({text:'one two',bar:1,time:0,endTime:2,tokens:[{text:'one',startBeat:0,endBeat:.5},{text:'two',startBeat:2,endBeat:4}]},.5)
  await s.play();clock=10.05+.1/rate;tick();assert.equal(activeTokenAt(tokens,s.currentTime),0)
  clock=10.05+.5/rate;tick();assert.equal(activeTokenAt(tokens,s.currentTime),-1)
  s.pause();clock+=10;assert.ok(Math.abs(s.currentTime-.5)<1e-6)
  await s.play();clock+=.05+.6/rate;tick();assert.equal(activeTokenAt(tokens,s.currentTime),1)
  const before=s.currentTime;s.setTempoFactor(rate===2?.5:2);assert.equal(s.currentTime,before)
  s.seek(0);assert.equal(activeTokenAt(tokens,s.currentTime),0)
  s.setLoop({from:2,to:4});s.pause();await s.play(0);assert.equal(s.currentTime,2)
  clock+=.05+2/s.tempoFactor;tick();assert.equal(s.currentTime,2)
  s.pause()
 }finally{Object.assign(globalThis,{setInterval:interval,clearInterval:clear,AudioContext:Audio})}
})
