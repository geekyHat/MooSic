import type { ContentArtist } from '@/core/plugin/types'
import type { LibrarySongRow } from '../model/browseLibrary'
import { Button } from '@/shared/ui/Button'
const ROW='mm-card flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4'
export function ArtistCard({artist,onOpen,t}:{artist:ContentArtist;onOpen:()=>void;t:(key:string)=>string}){
  return <article className={`${ROW} mm-artist`}>
    <div className="min-w-0 flex-1"><h4 className="m-0 break-words text-[17px] font-semibold">{artist.meta.name}</h4>
      {artist.meta.country&&<p className="text-sm text-muted">{artist.meta.country}</p>}
      <p className="count text-sm text-muted">{artist.songs.length} {t('library.songs')}</p>
    </div><Button variant="primary" onClick={onOpen}>{t('library.open')}</Button>
  </article>
}
export function SongCard({row,onOpen,onEdit,onArtist,t}:{row:LibrarySongRow;onOpen:()=>void;onEdit?:(id:string)=>void;onArtist?:(id:string)=>void;t:(key:string)=>string}){
  const {song,artist}=row
  return <article className={`${ROW} mm-song`}>
    <div className="min-w-0 flex-1"><h4 className="m-0 break-words text-[17px] font-semibold">{song.meta.title}</h4>
      <p className="break-words text-sm text-muted">{onArtist?<button className="cursor-pointer underline underline-offset-2" onClick={()=>onArtist(artist.meta.id)}>{artist.meta.name}</button>:artist.meta.name}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
        {song.meta.genre&&<span>{song.meta.genre}</span>}
        {song.meta.difficulty&&<span>{t('library.difficulty')}: {song.meta.difficulty}</span>}
        <span>{song.versions.length} {t('library.versions')}</span>
      </div>
      {song.versions.every(version=>version.arrangements.length===0)&&<p className="mt-2 text-sm text-muted">{t('library.needsArrangement')}</p>}
    </div>
    <div className="flex flex-wrap gap-2 max-narrow:w-full"><Button variant="primary" onClick={onOpen}>{t('library.open')}</Button>
      {onEdit&&<Button onClick={()=>onEdit(song.meta.id)}>{t('library.edit')}</Button>}
    </div>
  </article>
}
