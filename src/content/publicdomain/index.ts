import type { ContentPlugin,RawContentArtist } from '@/core/plugin/types'
import manifest from './plugin.json'
import type { Piece } from '@/domain/score/types'
let catalog:typeof import('./catalog')|undefined
const pieces=new Map<string,Piece>()

const plugin: ContentPlugin = {
  manifest: manifest as ContentPlugin['manifest'],
  async artists() {
    catalog=await import('./catalog')
    return catalog.artists as RawContentArtist[]
  },
  file(name) {
    return catalog?.files[name]
  },
  async buildPiece(name){
    if(!name.endsWith('.cho'))return null
    const prior=pieces.get(name);if(prior)return prior
    const text=catalog?.files[name];if(text===undefined)return null
    const [{parseSongFile},{buildUserPiece}]=await Promise.all([import('@/domain/songs/importSong'),import('@/domain/songs/piece')])
    const song=parseSongFile(name,text).song,arrangement=song.arrangements.find(a=>a.kind==='lyrics')
    if(!arrangement)throw new Error(`Missing bundled lyrics: ${name}`)
    const piece=buildUserPiece(song,arrangement);pieces.set(name,piece);return piece
  },
}

export default plugin
