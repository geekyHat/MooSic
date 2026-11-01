import assert from 'node:assert/strict'
import { test } from 'node:test'
import { artistKey, artistNames, canonicalArtist, suggestArtists } from '../../src/domain/songs/artists.ts'
import { buildCatalog } from '../../src/application/library/buildCatalog.ts'
import type { ContentPlugin, RawContentArtist } from '../../src/core/plugin/types.ts'
import { SongService } from '../../src/application/songs/SongService.ts'
import { LocalSongRepository } from '../../src/infrastructure/persistence/LocalSongRepository.ts'
import { configureSongService } from '../../src/content/user/store.ts'
import userContent from '../../src/content/user/index.ts'

test('artist identity reuses case, whitespace and accent variants without conflating distinct names', () => {
  assert.equal(artistKey('  JOSÉ   González '), artistKey('Jose González'))
  assert.deepEqual(artistNames(['José González', ' JOSE GONZALEZ ', '', 'José Luis']), ['José González', 'José Luis'])
  assert.equal(canonicalArtist(' JOSE  GONZALEZ ', ['José González']), 'José González')
  assert.equal(canonicalArtist('  New   Artist ', ['José González']), 'New Artist')
  assert.notEqual(artistKey('東京'), artistKey('大阪'))
  assert.notEqual(artistKey('AC/DC'), artistKey('AC DC'))
})

test('artist suggestions find substrings and typos, but do not automatically merge similar names', () => {
  const names = ['Traditional', 'José González', 'Tradition', 'Another band']
  assert.deepEqual(suggestArtists('gonzalez', names), ['José González'])
  assert.ok(suggestArtists('Traditonal', names).includes('Traditional'))
  assert.equal(canonicalArtist('Traditonal', names), 'Traditonal')
  assert.deepEqual(suggestArtists('', names), [])
  assert.deepEqual(suggestArtists('unrelated', names), [])
  assert.equal(suggestArtists('trad', names, 1).length, 1)
})

function catalogPlugin(id: string, artists: RawContentArtist[]): ContentPlugin {
  return {manifest: {id, type: 'content', name: {it: id, en: id}, version: '1', apiVersion: 1}, artists: async () => artists, file: () => undefined}
}

test('catalog merges artist names across sources, preserving original metadata and metadata-only songs', async () => {
  const publicArtist = {meta: {id: 'traditional', name: 'Traditional', country: 'IT'}, songs: [{meta: {id: 'old', title: 'Old song'}, versions: []}]}
  const userArtist = {meta: {id: 'user-artist-traditional', name: ' TRADITIONAL '}, songs: [{meta: {id: 'new', title: 'New song'}, versions: [{id: 'v1', name: 'Original', arrangements: []}]}]}
  const result = await buildCatalog({enabledContentPlugins: [catalogPlugin('public', [publicArtist]), catalogPlugin('user', [userArtist])], parsers: []})
  assert.equal(result.artists.length, 1)
  assert.deepEqual(result.artists[0].meta, publicArtist.meta)
  assert.deepEqual(result.artists[0].songs.map(song => song.meta.id), ['old', 'new'])
  assert.equal(publicArtist.songs.length, 1)
  assert.deepEqual(result.errors, [])
})

test('existing local artist variants group together and non-Latin artists keep unique IDs', async () => {
  const data = new Map<string, string>()
  const songs = new SongService(new LocalSongRepository({getItem: key => data.get(key) ?? null, setItem: (key, value) => {data.set(key, value)}}))
  configureSongService(songs)
  for (const [index, artist] of ['José', ' JOSE ', '東京', '大阪', 'AC/DC', 'AC DC'].entries()) {
    songs.save({id: String(index), name: 'Song ' + index, artist, genre: '', createdAt: 1, arrangements: []})
  }
  const artists = await userContent.artists()
  assert.equal(artists.length, 5)
  assert.equal(artists[0].songs.length, 2)
  assert.equal(new Set(artists.map(artist => artist.meta.id)).size, 5)
})
