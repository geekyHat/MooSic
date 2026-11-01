import type { UserArrangement,UserArrKind,UserChordBar,UserSheetNote,UserTabNote,UserLyricSheet } from '@/domain/songs/types';
import { validateArrangement } from '@/domain/songs/validation';
export interface ArrangementDraft {
  kinds: UserArrKind[]
  tempo: number
  bars: number
  tabNotes: UserTabNote[]
  sheetNotes: UserSheetNote[]
  chordBars: UserChordBar[]
  lyricSheet?: UserLyricSheet
  introTabs?: UserTabNote[]
  outroTabs?: UserTabNote[]
}
export function composeArrangements(draft:ArrangementDraft,name:(kind:UserArrKind)=>string,id:(kind:UserArrKind)=>string):UserArrangement[]{
 if(!draft.kinds.length||new Set(draft.kinds).size!==draft.kinds.length)throw new Error('Select distinct arrangement kinds')
 const result=draft.kinds.map((kind):UserArrangement=>{
  const base={id:id(kind),name:name(kind),tempo:draft.tempo,bars:draft.bars,beatsPerBar:4}
  if(kind==='tabs')return {...base,kind,tabNotes:draft.tabNotes}
  if(kind==='sheet')return {...base,kind,sheetNotes:draft.sheetNotes}
  if(draft.lyricSheet)return {...base,kind,chordBars:[],lyricSheet:draft.lyricSheet}
  return {...base,kind,chordBars:Array.from({length:draft.bars},(_,i)=>draft.chordBars[i]??{chord:'',lyric:''}),introTabs:draft.introTabs,outroTabs:draft.outroTabs}
 })
 const errors=result.flatMap(validateArrangement);if(errors.length)throw new Error(errors[0]);return result
}
