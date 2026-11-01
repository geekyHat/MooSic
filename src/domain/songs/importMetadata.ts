import { artistKey, canonicalArtist } from './artists'

export type MetadataSource = 'metadata' | 'subtitle' | 'filename' | 'title' | 'missing'
export interface ImportMetadata {
  artistSource: MetadataSource
  titleSource: MetadataSource
  needsReview: boolean
}
export interface SongFileMetadata {title?: string; artist?: string; fallbackArtist?: string; subtitle?: string; conflictingArtists?: boolean}

const clean = (value: string) => value.trim().replace(/\s+/g, ' ')
const comparable = (value: string) => artistKey(value.replace(/_/g, ' '))
function fileStem(filename: string): string {
  const basename = filename.split(/[\\/]/).at(-1) ?? filename
  let stem = basename.replace(/\.[^.]+$/, '')
  try {stem = decodeURIComponent(stem)} catch { /* A literal percent sign is allowed in a filename. */ }
  stem=clean(stem.replace(/_/g, ' '))
  const numbered=stem.match(/^\d{1,3}\s*[.)-]\s*(.+)$/)
  return numbered&&/\s+[-–—]\s+/.test(numbered[1])?numbered[1]:stem
}
function pair(value: string, artists: string[] = []): [string, string] | null {
  const parts = value.split(/\s+[-–—]\s+/)
  if(parts.length<2||parts.some(part=>!part.trim()))return null
  for(let index=1;index<parts.length;index++){
    const left=clean(parts.slice(0,index).join(' - ')),right=clean(parts.slice(index).join(' - '))
    if(knownName(left,artists)||knownName(right,artists))return [left,right]
  }
  return [clean(parts[0]), clean(parts.slice(1).join(' - '))]
}
function knownName(value: string, artists: string[]): string | undefined {
  return artists.find(name=>comparable(name)===comparable(value))
}

/** File-name guesses never create artist aliases; only the import confirmation can do that. */
export function identifySongMetadata(filename: string, info: SongFileMetadata, knownArtists: string[] = []): {name: string; artist: string; metadata: ImportMetadata} {
  const stem = fileStem(filename)
  const internalTitle = clean(info.title ?? '')
  let name = internalTitle || stem
  let artist = clean(info.artist ?? '')
  let artistSource: MetadataSource = artist ? 'metadata' : 'missing'
  let titleSource: MetadataSource = internalTitle ? 'metadata' : 'filename'
  let needsReview = !!info.conflictingArtists
  const subtitle = clean(info.subtitle ?? '')
  const creditedSubtitle = subtitle.match(/^(?:by|di|artist|artista|singer|cantante|performed by|interpretato da)(?:\s*:\s*|\s+)(.+)$/i)?.[1]
  const subtitleArtist = creditedSubtitle || knownName(subtitle, knownArtists)
  if (!artist && subtitleArtist) {artist = subtitleArtist; artistSource = 'subtitle'}

  // An explicit performer takes precedence over a file name or songwriter credit.
  if (artist) {
    const titlePair = pair(name,[artist])
    if (titlePair) {
      if (comparable(titlePair[0]) === comparable(artist)) name = titlePair[1]
      else if (comparable(titlePair[1]) === comparable(artist)) name = titlePair[0]
    }
    if (!internalTitle) {
      const filenamePair = pair(stem,[artist])
      if (filenamePair && comparable(filenamePair[0]) === comparable(artist)) name = filenamePair[1]
      else if (filenamePair && comparable(filenamePair[1]) === comparable(artist)) name = filenamePair[0]
    }
  } else {
    // Use the library, a known title or a songwriter credit to determine orientation.
    const possibilities = [
      ...(internalTitle ? [{value:internalTitle, source:'title' as const}] : []),
      {value:stem, source:'filename' as const},
    ].flatMap(({value,source})=>{
      const parts = pair(value,[...knownArtists,...(info.fallbackArtist?[info.fallbackArtist]:[])])
      if (!parts) return []
      const leftKnown = knownName(parts[0], knownArtists)
      const rightKnown = knownName(parts[1], knownArtists)
      const leftCredit = info.fallbackArtist && comparable(parts[0]) === comparable(info.fallbackArtist)
      const rightCredit = info.fallbackArtist && comparable(parts[1]) === comparable(info.fallbackArtist)
      const leftIsTitle = source === 'filename' && internalTitle && comparable(parts[0]) === comparable(internalTitle)
      const rightIsTitle = source === 'filename' && internalTitle && comparable(parts[1]) === comparable(internalTitle)
      if (leftIsTitle || !rightIsTitle && (rightCredit || rightKnown && !leftKnown)) return [{name:parts[0], artist:parts[1], source, reliable:true}]
      if (rightIsTitle || leftCredit || leftKnown && !rightKnown) return [{name:parts[1], artist:parts[0], source, reliable:true}]
      return [{name:parts[1], artist:parts[0], source, reliable:false}]
    })
    const detected = possibilities.find(candidate=>candidate.reliable) ?? possibilities[0]
    if (detected) {
      artist = detected.artist
      artistSource = detected.source
      if (!internalTitle || detected.source === 'title') {name = detected.name; titleSource = detected.source}
      needsReview ||= !detected.reliable
    } else if (info.fallbackArtist?.trim()) {artist = clean(info.fallbackArtist); artistSource = 'metadata'}
  }
  return {name, artist:canonicalArtist(artist, knownArtists), metadata:{artistSource,titleSource,needsReview}}
}
