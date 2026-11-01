import type { AppCore } from '@/core/plugin/context-impl'
import { type UserArrangement,type UserArrKind,type UserSong } from '@/domain/songs/types'
import { artistKey, canonicalArtist, resolveArtist } from '@/domain/songs/artists'
import { useDirtyGuard } from '@/shared/navigation/NavigationGuard'
import { useState } from 'react'
import { useSongDraft } from '../hooks/useSongDraft'
import { useArtistNames } from '../hooks/useArtistNames'
import { BTN_GHOST,CARD,KIND_KEY } from '../model/presentation'
import { storeChange } from '../model/storeChange'
import { ArrangementComposer } from './ArrangementComposer'
import { SongDetailsForm } from './SongDetailsForm'
export function SongEditor({
  core,
  initialSong,
  onBack,
  onOpenPractice,
}: {
  core: AppCore
  initialSong: UserSong
  onBack: () => void
  onOpenPractice: (songId: string, kind: UserArrKind) => void
}) {
  const t = core.t
  const artists = useArtistNames(core)
  const {song,setSong,saved,dirty,markSaved,cancel} = useSongDraft(initialSong)
  const request=useDirtyGuard(dirty)
  const [editing,setEditing]=useState<UserArrangement|null>(null)
  const [compositionKey,setCompositionKey]=useState(0)
  const [saving,setSaving]=useState(false)
  async function persist(next: UserSong): Promise<boolean> {
    const clean = {
      ...next,
      name: next.name.trim(),
      artist: canonicalArtist(resolveArtist(next.artist,core.artistLinks), artists),
      artistAliases: artistKey(next.artist) === artistKey(saved.artist) ? next.artistAliases : undefined,
      genre: next.genre.trim(),
    }
    if (!clean.name.trim()) { core.notify('error',t('editor.name'));return false }
    if(saving)return false
    setSaving(true)
    try {
      if (!await storeChange(core, () => core.songs.saveAtomic(clean,saved))) return false
      markSaved(clean)
      if (clean.arrangements.length) core.openSong(clean.id, 'v1', core.currentSongId === clean.id ? core.currentArrangement : clean.arrangements[0].kind)
      return true
    }
    finally{setSaving(false)}
  }

  async function removeArrangement(id: string) {
    await persist({ ...song, arrangements: song.arrangements.filter((a) => a.id !== id) })
  }

  async function deleteSong() {
    if (!window.confirm(t('editor.confirmDelete', { name: song.name }))) return
    if (!await storeChange(core, () => core.songs.removeAtomic(song.id,saved))) return
    onBack()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <button className={BTN_GHOST} onClick={()=>request(onBack)}>
          ← {t('editor.back')}
        </button>
        <h2 className="truncate text-xl font-bold text-ink">{song.name}</h2>
      </div>

      <SongDetailsForm song={song} artists={artists} saving={saving} onChange={setSong} onSave={async()=>{if(await persist(song))core.notify('ok',t('editor.saved'))}} onCancel={cancel} locale={core.locale} t={t}/>

      <ArrangementComposer key={compositionKey} core={core} arrangements={song.arrangements} editing={editing} onCancel={()=>{setEditing(null);setCompositionKey(k=>k+1)}} onSave={async added=>{
        const kinds=added.map(a=>a.kind)
        if(!await persist({...song,arrangements:[...song.arrangements.filter(a=>!kinds.includes(a.kind)),...added]}))return false
        setEditing(null);setCompositionKey(k=>k+1);return true
      }}/>

      {/* Existing arrangements */}
      <div className={CARD}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('editor.existing')}
        </h3>
        {song.arrangements.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{t('editor.noArrangements')}</p>
        ) : (
          <ul className="space-y-2">
            {song.arrangements.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 max-narrow:flex-wrap">
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">{t(KIND_KEY[a.kind])}</span>
                <span className="flex flex-wrap justify-end gap-2 max-narrow:w-full max-narrow:justify-start">
                  <button type="button" className={BTN_GHOST} onClick={()=>request(()=>{setEditing(a);setCompositionKey(k=>k+1)})}>{core.locale==='it'?'Modifica':'Edit'}</button>
                  <button
                    className="cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs text-ink transition-colors hover:bg-accent/10"
                    onClick={() => request(()=>onOpenPractice(song.id, a.kind))}
                  >
                    {t('editor.openPractice')}
                  </button>
                  <button
                    className="cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:bg-bad/15 hover:text-bad"
                    onClick={() => void removeArrangement(a.id)}
                  >
                    {t('editor.remove')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-3">
          <button
            className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-bad/15 hover:text-bad"
            onClick={() => void deleteSong()}
          >
            {t('editor.deleteSong')}
          </button>
        </div>
      </div>
    </div>
  )
}
