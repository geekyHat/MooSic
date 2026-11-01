import type { ArrangementItem,ContentArtist,ContentPlugin,ContentSong,ContentVersion,Parser,PluginModule,RawContentArtist } from '@/core/plugin/types';
import type { Piece } from '@/domain/score/types';
import { artistKey, resolveArtist, type ArtistLink } from '@/domain/songs/artists';
export async function buildCatalog(source: {enabledContentPlugins: PluginModule[];parsers:Parser[];artistLinks?:ArtistLink[]}):Promise<{artists:ContentArtist[];errors:string[]}> {
    const artists: ContentArtist[] = []
    const artistsByName = new Map<string, ContentArtist>()
    const errors: string[] = []
    const contentPlugins = source.enabledContentPlugins as unknown as ContentPlugin[]
    for (const cp of contentPlugins) {
      let catalog: RawContentArtist[] = []
      try {
        catalog = await cp.artists()
      } catch (e) {
        errors.push(`content plugin: ${String(e)}`)
        continue
      }
      for (const rawArtist of catalog) {
        const artistName = resolveArtist(rawArtist.meta.name, source.artistLinks ?? [])
        const songs: ContentSong[] = []
        for (const rawSong of rawArtist.songs) {
          const originalComposer = rawSong.meta.composer
          const composer = originalComposer && (artistKey(originalComposer.replace(/\s*\(\d{4}\)\s*$/, '')) === artistKey(rawArtist.meta.name) || artistKey(resolveArtist(originalComposer, source.artistLinks ?? [])) === artistKey(artistName))
            ? artistName : originalComposer
          const versions: ContentVersion[] = []
          for (const rawVer of rawSong.versions) {
            const arrangements: ArrangementItem[] = []
            for (const arr of rawVer.arrangements) {
              // Direct piece (e.g. user-editor songs) — bypass file+parser.
              if (typeof cp.buildPiece === 'function') {
                try {
                  const direct = await cp.buildPiece(arr.file)
                  if (direct) {
                    const piece: Piece = {
                      ...direct,
                      id: `${rawSong.meta.id}-${rawVer.id}-${arr.kind}`,
                      title: direct.title || rawSong.meta.title,
                      composer: composer ?? direct.composer,
                    }
                    arrangements.push({ kind: arr.kind, piece })
                    continue
                  }
                } catch (e) {
                  errors.push(`${rawSong.meta.title} (${rawVer.name} ${arr.kind}): ${String(e)}`)
                  continue
                }
              }
              const raw = cp.file(arr.file)
              if (raw == null) {
                errors.push(`${rawSong.meta.title} (${rawVer.name} ${arr.kind}): file mancante: ${arr.file}`)
                continue
              }
              const parser = source.parsers.find((p) => p.detect(raw))
              if (!parser) {
                errors.push(`${rawSong.meta.title} (${rawVer.name} ${arr.kind}): nessun parser abilitato`)
                continue
              }
              try {
                const parsed = await parser.parse(raw)
                const piece: Piece = {
                  ...parsed,
                  id: `${rawSong.meta.id}-${rawVer.id}-${arr.kind}`,
                  title: parsed.title || rawSong.meta.title,
                  composer: composer ?? parsed.composer,
                  difficulty: rawSong.meta.difficulty,
                  tags: rawSong.meta.tags,
                }
                arrangements.push({ kind: arr.kind, piece })
              } catch (e) {
                errors.push(`${rawSong.meta.title} (${rawVer.name} ${arr.kind}): ${String(e)}`)
              }
            }
            versions.push({ id: rawVer.id, name: rawVer.name, arrangements })
          }
          songs.push({ meta: {...rawSong.meta, composer}, versions })
        }
        const key = artistKey(artistName)
        const existing = artistsByName.get(key)
        if (existing) existing.songs.push(...songs)
        else {
          const artist = { meta: {...rawArtist.meta, name: artistName}, songs }
          artistsByName.set(key, artist)
          artists.push(artist)
        }
      }
    }
    return {artists,errors}
}
