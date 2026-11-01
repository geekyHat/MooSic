import type { Piece } from './types'
export function validatePiece(piece:Piece):string[]{
 const errors:string[]=[]
 const positive=(n:number)=>Number.isFinite(n)&&n>0
 if(!piece.id||!piece.title||!piece.instrumentId)errors.push('missing identity')
 if(!positive(piece.tempo)||!positive(piece.secondsPerBeat)||!positive(piece.barLength)||!positive(piece.duration))errors.push('invalid finite time/tempo')
 if(!Number.isInteger(piece.bars)||piece.bars<1)errors.push('invalid bars')
 if(!Number.isInteger(piece.timeSignature.numerator)||piece.timeSignature.numerator<1||!Number.isInteger(piece.timeSignature.denominator)||piece.timeSignature.denominator<1)errors.push('invalid meter')
 if(!piece.notes.length&&!piece.lyrics?.length&&!piece.chords?.length&&!(piece.document&&piece.source?.format.startsWith('olga')))errors.push('empty score')
 const ids=new Set<string>()
 let previous=-Infinity
 for(const note of piece.notes){
  if(ids.has(note.id)||!note.id)errors.push('duplicate/missing note id');ids.add(note.id)
  if(!Number.isFinite(note.time)||note.time<0||note.time<previous||!positive(note.duration)||note.time+note.duration>piece.duration+1e-6)errors.push(`note ${note.id}: invalid time/duration/order`)
  if(!Number.isInteger(note.pitchMidi)||note.pitchMidi<0||note.pitchMidi>127||!Number.isInteger(note.bar)||note.bar<1||note.bar>piece.bars)errors.push(`note ${note.id}: invalid pitch/bar`)
  previous=note.time
 }
 return errors
}
