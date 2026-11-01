import type { LyricLine } from './types';
export interface TimedToken { text: string; start: number; end: number; approximate: boolean; joinNext?:boolean }
/** Timings are seconds only at playback boundaries. Source/editor units are beats. */
export function lyricTokens(line: LyricLine, secondsPerBeat: number): TimedToken[] {
  if (line.tokens) return line.tokens.map(t => ({joinNext:t.joinNext,text:t.text,start:t.startBeat*secondsPerBeat,end:t.endBeat*secondsPerBeat,approximate:line.timingApproximate??false}))
  const words = line.text.trim().split(/\s+/).filter(Boolean)
  return words.map((text,i) => ({text,start:line.time+(line.endTime-line.time)*i/words.length,end:line.time+(line.endTime-line.time)*(i+1)/words.length,approximate:true}))
}
export function activeTokenAt(tokens: TimedToken[], time: number): number {
  return tokens.findIndex(t => time >= t.start && time < t.end)
}
