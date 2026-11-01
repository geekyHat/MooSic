/**
 * content-user plugin: surfaces editor-created songs (from the localStorage
 * store) into the Library. Pieces are built directly from the editor data
 * (buildPiece) rather than the file+parser flow, so tab notes keep their
 * exact (string, fret) placement.
 */
import type { ContentPlugin,RawContentArtist } from '@/core/plugin/types'
import type { Piece } from '@/core/score-model/types'
import { buildUserPiece } from './piece'
import manifest from './plugin.json'
import { loadUserSongs,type UserSong } from './store'
import { artistKey } from '@/domain/songs/artists'

// One immutable read per catalog build. buildCatalog asks for each song piece
// individually; re-reading and validating localStorage for every arrangement
// made a large local library scale quadratically.
let catalogSongsById=new Map<string,UserSong>()

const plugin: ContentPlugin = {
  manifest: manifest as ContentPlugin['manifest'],

  async artists(): Promise<RawContentArtist[]> {
    const songs = loadUserSongs()
    catalogSongsById=new Map(songs.map(song=>[song.id,song]))
    if (songs.length === 0) return []
    const byArtist = new Map<string, {name: string; songs: UserSong[]}>()
    for (const s of songs) {
      const artist = s.artist.trim().replace(/\s+/g, ' ') || 'Folk'
      const key = artistKey(artist)
      const group = byArtist.get(key) ?? {name: artist, songs: []}
      group.songs.push(s)
      byArtist.set(key, group)
    }
    const result: RawContentArtist[] = []
    for (const [key, {name: artist, songs: list}] of byArtist) {
      result.push({
        meta: { id: `user-artist-${encodeURIComponent(key)}`, name: artist },
        songs: list.map((s) => ({
          meta: {
            id: s.id,
            title: s.name,
            composer: s.artist.trim() || undefined,
            genre: s.genre.trim() || undefined,
          },
          versions: [
            {
              id: 'v1',
              name: 'Original',
              arrangements: s.arrangements.map((a) => ({
                kind: a.kind,
                file: `user:${s.id}:${a.id}`,
              })),
            },
          ],
        })),
      })
    }
    return result
  },

  // User songs are built directly (buildPiece); they have no source file.
  file(): string | undefined {
    return undefined
  },

  buildPiece(arrFile: string): Piece | null {
    const parts = arrFile.split(':')
    if (parts.length !== 3 || parts[0] !== 'user') return null
    const [, songId, arrId] = parts
    const song = catalogSongsById.get(songId)
    if (!song) return null
    const arr = song.arrangements.find((a) => a.id === arrId)
    if (!arr) return null
    return buildUserPiece(song, arr)
  },
}

export default plugin
