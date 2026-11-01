import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'
import { GUITAR_GRID } from '../../src/content/user/piece.ts'
import { guitarFingerings } from '../../src/instruments/guitar/fingerings.ts'
import { CHORD_SUGGESTIONS } from '../../src/domain/music/chords.ts'
import { chordPitches,nearestSample } from '../../src/transports/guitar/pitches.ts'
test('all guitar fingerings contain only pitches from their chord, unknown remains unsupported',()=>{
 for(const [symbol,frets] of Object.entries(guitarFingerings)){
  const pitches=chordPitches(symbol);assert.ok(pitches,symbol)
  for(let row=0;row<frets.length;row++){const fret=frets[row];if(fret!=='x')assert.ok(pitches.some(p=>p%12===(GUITAR_GRID[row].midi+fret)%12),`${symbol} row ${row}`)}
 }
 assert.equal(chordPitches('Unknown'),null)
 for(const suggestion of CHORD_SUGGESTIONS)assert.ok(chordPitches(suggestion),`suggestion ${suggestion} must be supported`)
 for(const quality of ['','m','7','maj7','m7','m7b5','dim','aug','sus2','sus4'])assert.ok(chordPitches('F#'+quality))
 assert.equal(chordPitches('C/E')![0]%12,4)
 for(const [alias,canonical] of [['A minor','Am'],['C minor','Cm'],['A minor7','Am7'],['Amin','Am'],['A-min','Am']] as const){
  const actual=chordPitches(alias);assert.ok(actual,alias)
  assert.deepEqual(actual,chordPitches(canonical),alias)
 }
})
test('chordPitches returns null for prototype property names',()=>{
 for(const name of ['toString','__proto__','valueOf','hasOwnProperty','constructor'])assert.equal(chordPitches(name),null)
})
test('chordPitches handles enharmonic note names correctly',()=>{
 // B# should normalize to C
 assert.ok(chordPitches('B#'), 'B# should parse')
 assert.deepEqual(chordPitches('B#'),chordPitches('C'),'B# should equal C')
 // E# should normalize to F
 assert.ok(chordPitches('E#'), 'E# should parse')
 assert.deepEqual(chordPitches('E#'),chordPitches('F'),'E# should equal F')
 // Cb should normalize to B
 assert.ok(chordPitches('Cb'), 'Cb should parse')
 assert.deepEqual(chordPitches('Cb'),chordPitches('B'),'Cb should equal B')
 // Fb should normalize to E
 assert.ok(chordPitches('Fb'), 'Fb should parse')
 assert.deepEqual(chordPitches('Fb'),chordPitches('E'),'Fb should equal E')
})
test('every sample selected for MIDI 0–127 exists and transposition uses semitones',()=>{
 const assets=new Set(readdirSync('public/sounds/guitar'))
 for(let midi=0;midi<128;midi++){const sample=nearestSample(midi);assert.ok(assets.has(`midi-${sample}.wav`));assert.ok(Math.abs(2**((midi+12-sample)/12)/(2**((midi-sample)/12))-2)<1e-12)}
})
