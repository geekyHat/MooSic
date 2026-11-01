import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { inlineChords, parseChordSymbol } from '../../src/domain/music/chordSymbol.ts'
import { InlineChordDocument } from '../../src/features/practice/components/InlineChordDocument.tsx'

test('explicit chord symbols retain root, suffix and slash bass without an audio or fingering lookup', () => {
  for (const name of ['Am', 'C#', 'Bb', 'C/G', 'F#m7b5', 'Cadd9', 'Dsus4', 'G7(b9)', 'Cmaj13', 'Am6']) assert.ok(parseChordSymbol(name), name)
  assert.deepEqual(parseChordSymbol('F#m7b5/C#'), { name: 'F#m7b5/C#', root: 'F#', suffix: 'm7b5', bass: 'C#' })
  for (const name of ['Chorus', 'Verse 1', 'Unknown', 'H', 'constructor', 'Am/GG', 'Am lyrics', '<C>']) assert.equal(parseChordSymbol(name), null, name)
})

test('only bracketed chord markers are recognized; sections, comments, escapes and TAB blocks are preserved', () => {
  const source = '{title: [C]}\r\nAm     G\r\n[Verse 1]\r\n\\[Dm] literal\r\n[C]🎵 [Am]study [G/B]\r\n{sot}\r\n[C]in a TAB block\r\n{eot}\r\n# [E] comment\r\n[Unknown] [Cadd9]'
  const chords = inlineChords(source)
  assert.deepEqual(chords.map(chord => chord.symbol.name), ['C', 'Am', 'G/B', 'Cadd9'])
  for (const chord of chords) assert.equal(source.slice(chord.start, chord.end), `[${chord.symbol.name}]`)
  assert.equal(inlineChords('Am     G\nSome words').length, 0)
  const html = renderToStaticMarkup(<InlineChordDocument source={source} chords={chords}/>)
  assert.equal(html.replace(/<[^>]*>/g, ''), source)
  assert.match(html, /data-chord="Cadd9"/)
})

test('chord annotations escape HTML text and do not rewrite or execute imported source', () => {
  const html = renderToStaticMarkup(<InlineChordDocument source={'[Am]<script>alert(1)</script>'} chords={inlineChords('[Am]<script>alert(1)</script>')}/>)
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(!html.includes('<script>'))
})
