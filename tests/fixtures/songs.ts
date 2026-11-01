import type { UserArrangement,UserSong } from '../../src/content/user/store.ts'
import type { Piece } from '../../src/core/score-model/types.ts'
export const arrangement = (): Extract<UserArrangement,{kind:'tabs'}> => ({ id:'a', kind:'tabs', name:'Tabs', tempo:120, bars:2, beatsPerBar:4, tabNotes:[{row:0,beat:0,fret:0}] })
export const song = (): UserSong => ({id:'s',name:'Fixture',artist:'QA',genre:'',createdAt:1,arrangements:[arrangement()]})
export const piece = (): Piece => ({id:'p',title:'Test',instrumentId:'guitar',tempo:120,secondsPerBeat:0.5,barLength:2,bars:4,duration:8,timeSignature:{numerator:4,denominator:4},notes:[{id:'n',time:0,duration:.5,pitchMidi:60,bar:1}]})
