import assert from 'node:assert/strict'
import { test } from 'node:test'
import { documentBlocks, expandTabStops, tabSegments } from '../../src/domain/songs/responsiveDocument.ts'

test('responsive blocks preserve source offsets and reflow only unambiguous chord/lyric pairs', () => {
  const source = 'Heading\nAm\tG/B\nOriginal words across the sea\n[Verse 1]\n[Am]Inline music\n'
  const blocks = documentBlocks(source)
  assert.deepEqual(blocks[0], { kind: 'text', text: 'Heading', offset: 0 })
  assert.deepEqual(blocks[1], { kind: 'lyrics', text: 'Original words across the sea', anchors: [{ name: 'Am', offset: 0 }, { name: 'G/B', offset: 8 }] })
  assert.deepEqual(blocks[3], { kind: 'text', text: '[Am]Inline music', offset: source.indexOf('[Am]Inline') })
  assert.equal(source, 'Heading\nAm\tG/B\nOriginal words across the sea\n[Verse 1]\n[Am]Inline music\n')
  assert.equal(expandTabStops('123\tx\ty'), '123     x       y')
  assert.equal(documentBlocks('A heading\nnot chords')[0].kind, 'text')
})

test('TAB continuation uses shared columns, preserves every character and never splits multi-digit frets', () => {
  const bodies = ['--10h12--|--14/16--|--0---| x4', '--0------|---------|------|', '---------|--2------|------|', '---------|---------|--3---|', '---------|---------|------|', '---------|---------|------|']
  const original = bodies.map((body, index) => `${'eBGDAE'[index]}|${body}`).join('\n')
  const block = documentBlocks(original)[0]
  assert.equal(block.kind, 'tab')
  if (block.kind !== 'tab') return
  for (const columns of [4, 8, 12, 25, 200]) {
    const segments = tabSegments(block.rows, columns)
    block.rows.forEach((row, index) => {
      assert.equal(segments.map(({ start, end }) => row.body.slice(start, end)).join(''), bodies[index])
      segments.forEach(({ start, end }) => {
        assert.ok(end - start <= columns)
        assert.ok(!(row.body[start - 1]?.match(/\d/) && row.body[start]?.match(/\d/)))
      })
    })
  }
  assert.equal(tabSegments(block.rows, 12)[0].end, 10, 'prefer a shared barline')
})

test('irregular documents keep all rows and text visible without inventing TAB blocks', () => {
  assert.equal(documentBlocks('e|--0--|\nA poem\nB|--2--|').every(block => block.kind === 'text'), true)
  const source = Array.from({ length: 6 }, (_, index) => `${'eBGDAE'[index]}|--10h12p14b16r18/20\\22--`).join('\n')
  const block = documentBlocks(source)[0]
  assert.equal(block.kind, 'tab')
  if (block.kind !== 'tab') return
  const segments = tabSegments(block.rows, 8)
  assert.ok(segments.length > 1)
  for (const row of block.rows) assert.equal(segments.map(({ start, end }) => row.body.slice(start, end)).join(''), row.body)
})

test('adjacent six-string TAB systems stay separate without a blank line', () => {
  const system = ['e','B','G','D','A','E'].map(label => `${label}|--10h12--|`).join('\n')
  const blocks = documentBlocks(system+'\n'+system)
  assert.equal(blocks.length,2)
  for (const block of blocks) {
    assert.equal(block.kind,'tab')
    if (block.kind==='tab') assert.equal(block.rows.map(row=>row.label).join(''),'eBGDAE')
  }
})
