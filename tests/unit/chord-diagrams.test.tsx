import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { chordDefinitions, chordFingering } from '../../src/domain/music/chordDiagrams.ts'
import { chordSymbolKey, parseChordSymbol } from '../../src/domain/music/chordSymbol.ts'
import { guitarChordLibrary } from '../../src/instruments/guitar/chordLibrary.ts'
import guitar from '../../src/instruments/guitar/index.ts'
import { ChordDiagrams } from '../../src/features/practice/components/ChordDiagrams.tsx'

test('historical and current ChordPro definitions respect base-fret and match quality spelling aliases', () => {
  const source = '{define AMaj9 base-fret 1 frets x 0 2 1 0 0}\n{define: C# base-fret 3 frets x 2 4 4 4 2}\n{define: Dm frets x x 0 2 3 1 fingers 0 0 0 2 3 1 base_fret 1}'
  const definitions = chordDefinitions(source)
  assert.deepEqual(chordFingering('Amaj9', undefined, definitions, 6), { strings: [null, 0, 2, 1, 0, 0], baseFret: 1 })
  assert.deepEqual(chordFingering('C#', undefined, definitions, 6), { strings: [null, 4, 6, 6, 6, 4], baseFret: 3 })
  assert.deepEqual(chordFingering('Dm', undefined, definitions, 6)?.strings, [null, null, 0, 2, 3, 1])
  assert.equal(chordSymbolKey('AMaj9'), chordSymbolKey('Amaj9'))
  assert.equal(chordSymbolKey('AM7'), chordSymbolKey('Amaj7'))
  assert.notEqual(chordSymbolKey('AM7'), chordSymbolKey('Am7'))
  assert.equal(chordSymbolKey('A#m7'), chordSymbolKey('Bbm7'))
})

test('source voicings override catalogue defaults without leaking into another document or instrument', () => {
  const definitions = chordDefinitions('{define: A frets x 0 2 2 2 5}')
  assert.deepEqual(chordFingering('A', guitarChordLibrary, definitions, 6)?.strings, [null, 0, 2, 2, 2, 5])
  assert.deepEqual(chordFingering('A', guitarChordLibrary, undefined, 6)?.strings, [null, 0, 2, 2, 2, 0])
  assert.equal(chordFingering('A', guitarChordLibrary, definitions, 4), undefined)
  assert.equal(chordFingering('C/G', guitarChordLibrary, undefined, 6), undefined)
  assert.equal(chordFingering('constructor', guitarChordLibrary, definitions, 6), undefined)
  for (const source of ['{define: A base-fret 0 frets x 0 2 2 2 0}', '{define: A frets 37 0 2 2 2 0}', '{define: A frets -2 0 2 2 2 0}', '{define: A base-fret 3.5 frets x 0 2 2 2 0}', '{sot}\n{define: A frets x 0 2 2 2 5}\n{eot}']) assert.equal(chordDefinitions(source).size, 0)
  const fourStrings = chordDefinitions('{define: A frets 2 1 0 0}')
  assert.deepEqual(chordFingering('A', undefined, fourStrings, 4)?.strings, [2, 1, 0, 0])
})

test('the expanded guitar catalogue contains musically correct major, minor, seventh, ninth and suspended shapes', () => {
  const roots: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const intervals: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], maj9: [0, 2, 4, 7, 11], sus4: [0, 5, 7] }
  const tuning = [40, 45, 50, 55, 59, 64]
  for (const [name, shape] of Object.entries(guitarChordLibrary)) {
    const symbol = parseChordSymbol(name)!
    const root = (roots[symbol.root[0]] + (symbol.root[1] === '#' ? 1 : symbol.root[1] === 'b' ? -1 : 0) + 12) % 12
    const allowed = intervals[symbol.suffix].map(interval => (root + interval) % 12)
    const played = shape.strings.flatMap((fret, string) => fret === null ? [] : [(tuning[string] + fret) % 12])
    assert.equal(shape.strings.length, 6, name)
    assert.ok(played.includes(root), name + ' root')
    assert.ok(played.every(pitch => allowed.includes(pitch)), name + ' chord tones')
    if (symbol.suffix.includes('7') || symbol.suffix === 'maj9') assert.ok(played.includes((root + (symbol.suffix.startsWith('maj') ? 11 : 10)) % 12), name + ' seventh')
    if (symbol.suffix === 'maj9') assert.ok(played.includes((root + 2) % 12), name + ' ninth')
    if (symbol.suffix === 'sus4') assert.ok(played.includes((root + 5) % 12), name + ' fourth')
  }
  for (const name of ['Amaj9', 'B7', 'Bm7', 'C#', 'C#m7', 'Esus4', 'F#m7']) assert.ok(chordFingering(name, guitarChordLibrary, undefined, 6), name)
})

test('diagrams retain the source starting fret and show every fretted position inside the grid', () => {
  const html = renderToStaticMarkup(<ChordDiagrams chords={['C#']} instrument={guitar.instrument} definitions={chordDefinitions('{define C# base-fret 3 frets x 2 4 4 4 2}')} unavailableLabel="Unavailable"/>)
  assert.match(html, /data-base-fret="3"/)
  assert.match(html, /data-frets="x 4 6 6 6 4"/)
  assert.match(html, /cy="76.5"/)
  assert.ok(!html.includes('Unavailable'))
  const tall = renderToStaticMarkup(<ChordDiagrams chords={['A']} instrument={guitar.instrument} definitions={chordDefinitions('{define A frets x 0 2 2 2 5}')} unavailableLabel="Unavailable"/>)
  assert.match(tall, /height="111"/)
})
