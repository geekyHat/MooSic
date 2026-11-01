import { useEffect, useMemo } from 'react'
import type { AppCore } from '@/core/plugin/context-impl'
import { artistNames, resolveArtist } from '@/domain/songs/artists'
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot'

export function useArtistNames(core: AppCore): string[] {
  const library = useAppSnapshot(core.library)
  useEffect(() => { void core.ensureLibrary() }, [core, core.pluginVersion])
  return useMemo(() => artistNames([
    ...library.artists.map(artist => artist.meta.name),
    ...core.songs.list().map(song => resolveArtist(song.artist,core.artistLinks)),
  ]), [core, library])
}
