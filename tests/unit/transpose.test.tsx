import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { transposeChord, transposeFingering } from '../../src/domain/music/transpose.ts'
import { chordFingering, chordDefinitions, transposeDefinitions } from '../../src/domain/music/chordDiagrams.ts'
import { chordSymbolKey, inlineChords } from '../../src/domain/music/chordSymbol.ts'
import { transposePieceChords } from '../../src/domain/score/transposeChords.ts'
import { InlineChordDocument } from '../../src/features/practice/components/InlineChordDocument.tsx'
import { guitarChordLibrary } from '../../src/instruments/guitar/chordLibrary.ts'
import { piece } from '../fixtures/songs.ts'

test('transpose moves root and slash bass together, retains extensions and preserves unrecognized text', () => {
  for (const [name, shift, expected] of [
    ['C', 1, 'C#'], ['C', 2, 'D'], ['C', -2, 'Bb'], ['Am', 1, 'A#m'],
    ['F#m7', -2, 'Em7'], ['C/E', 2, 'D/F#'], ['C/E', 1, 'C#/F'],
    ['Bbmaj7/D', 2, 'Cmaj7/E'], ['B', 1, 'C'], ['Cb', 1, 'C'], ['B#', 1, 'C#'],
    ['G7(b9)', 2, 'A7(b9)'], ['F#m7b5', 1, 'Gm7b5'],
  ] as const) assert.equal(transposeChord(name, shift), expected)
  for (const name of ['AMaj9', 'Cb', 'F#m7/C#', 'Unknown', 'constructor', '[Verse 1]', 'Am G']) {
    assert.equal(transposeChord(name, 0), name)
    assert.equal(transposeChord(name, 12), name)
    assert.equal(transposeChord(name, Number.NaN), name)
    assert.equal(transposeChord(name, 0.5), name)
  }
  for (const name of ['Unknown', 'constructor', '[Verse 1]', 'Am G']) assert.equal(transposeChord(name, 1), name)
})

test('every supported root and chord quality survives transposition and its inverse across all controls', () => {
  for (const root of ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cb', 'B#']) {
    for (const quality of ['', 'm', '7', 'm7', 'maj7', 'maj9', 'sus4', 'add9', 'm7b5', 'dim', 'aug']) {
      const original = root + quality + '/G#'
      for (let shift = -11; shift <= 11; shift++) {
        const moved = transposeChord(original, shift)
        assert.ok(chordSymbolKey(moved), moved)
        assert.equal(chordSymbolKey(transposeChord(moved, -shift)), chordSymbolKey(original), original + ' ' + shift)
      }
    }
  }
})

test('custom fingering fallback moves open strings, retains muted strings and respects the playable fret range', () => {
  const original = { strings: [0, 3, 2, 0, 1, 0] }
  assert.deepEqual(transposeFingering(original, 2, 20)?.strings, [2, 5, 4, 2, 3, 2])
  assert.deepEqual(transposeFingering(original, -1, 20)?.strings, [11, 14, 13, 11, 12, 11])
  assert.deepEqual(transposeFingering({ strings: [null, 2, 3, 2, 3, null] }, 1, 20)?.strings, [null, 3, 4, 3, 4, null])
  assert.equal(transposeFingering({ strings: [0, 20] }, 1, 20), undefined)
  assert.deepEqual(original.strings, [0, 3, 2, 0, 1, 0])
  const definitions = chordDefinitions('{define C base-fret 3 frets x 1 3 3 3 1}\n{define Bm7b5 frets x 2 3 2 3 x}')
  const shifted = transposeDefinitions(['C', 'Bm7b5'], definitions, 2, 20)
  assert.deepEqual(chordFingering('D', guitarChordLibrary, shifted, 6, true)?.strings, [null, null, 0, 2, 3, 2])
  assert.deepEqual(chordFingering('C#m7b5', guitarChordLibrary, shifted, 6, true)?.strings, [null, 4, 5, 4, 5, null])
  assert.deepEqual(chordFingering('C', guitarChordLibrary, definitions, 6)?.strings, [null, 3, 5, 5, 5, 3])
})

test('score projection changes chord events and visual anchors without changing lyrics, offsets, notes or source', () => {
  const original = { ...piece(), source: { format: 'chordpro', text: '[C/E]Original [Am]line' }, chords: [{ name: 'C/E', time: 0 }, { name: 'Am', time: 2 }], lyrics: [{ time: 0, endTime: 4, text: 'Original line', bar: 1, anchors: [{ name: 'C/E', offset: 0 }, { name: 'Am', offset: 9 }] }] }
  const before = JSON.stringify(original)
  const moved = transposePieceChords(original, 2)
  assert.deepEqual(moved.chords?.map(chord => chord.name), ['D/F#', 'Bm'])
  assert.deepEqual(moved.lyrics?.[0].anchors?.map(anchor => [anchor.name, anchor.offset]), [['D/F#', 0], ['Bm', 9]])
  assert.equal(moved.lyrics?.[0].text, original.lyrics[0].text)
  assert.equal(moved.notes, original.notes)
  assert.equal(moved.source, original.source)
  assert.equal(JSON.stringify(original), before)
  assert.equal(transposePieceChords(original, 0), original)
})

test('inline transpose replaces only identified markers and reset reproduces the original document exactly', () => {
  const original = '{define C frets x 3 2 0 1 0}\nTitle: C study\n[C/E]One [Am]two\n[Verse 1]\nAm G\ne|--0--2--|'
  const chords = inlineChords(original)
  const html = renderToStaticMarkup(<InlineChordDocument source={original} chords={chords} semitones={2}/>)
  assert.equal(html.replace(/<[^>]*>/g, ''), original.replace('[C/E]', '[D/F#]').replace('[Am]', '[Bm]'))
  const reset = renderToStaticMarkup(<InlineChordDocument source={original} chords={chords}/>)
  assert.equal(reset.replace(/<[^>]*>/g, ''), original)
})
