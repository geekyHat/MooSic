import type { AppCore } from '@/core/plugin/context-impl'
import { makeId } from '@/domain/songs/ids'
import { canonicalArtist, resolveArtist } from '@/domain/songs/artists'
import { type UserSong } from '@/domain/songs/types'
import { useContext,useEffect,useState } from 'react'
import { NavigationGuard } from '@/shared/navigation/NavigationGuard'
import { CreateForm } from './components/CreateSongForm'
import { SongEditor } from './components/SongEditor'
import { BTN_GHOST,BTN_PRIMARY,CARD,KIND_KEY } from './model/presentation'
import { storeChange } from './model/storeChange'
import { useArtistNames } from './hooks/useArtistNames'
export function EditorView({ core, onOpenPractice, initialSongId, onSelectionChange }: { core: AppCore; onOpenPractice: () => void; initialSongId?: string | null; onSelectionChange?:(id:string|null)=>void }) {
  const t = core.t
  const guard=useContext(NavigationGuard)
  const artists=useArtistNames(core)
  const [songs, setSongs] = useState<UserSong[]>(core.songs.list)
  useEffect(() => core.songs.subscribe(() => setSongs(core.songs.list())), [])

  const [selectedId, setSelectedId] = useState<string | null>(initialSongId ?? null)
  // The opened snapshot survives concurrent deletion until the user leaves explicitly.
  const [selected,setSelected]=useState<UserSong|null>(()=>core.songs.list().find(song=>song.id===initialSongId)??null)
  const selectSong=(id:string|null)=>{setSelectedId(id);setSelected(core.songs.list().find(song=>song.id===id)??null);onSelectionChange?.(id)}

  if (selected) {
    return (
      <SongEditor
        key={selected.id}
        core={core}
        initialSong={selected}
        onBack={() => selectSong(null)}
        onOpenPractice={async (songId, kind) => {
          await core.reloadLibrary()
          core.openSong(songId, 'v1', kind)
          onOpenPractice()
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">{t('editor.title')}</h2>
        <button className={BTN_PRIMARY} onClick={() => selectSong('__new__')}>
          + {t('editor.newSong')}
        </button>
      </div>

      <CreateForm
        key={selectedId === '__new__' ? 'open' : 'closed'}
        visible={selectedId === '__new__'}
        artists={artists}
        onCreate={async(name, artist, genre) => {
          const song: UserSong = {
            id: makeId('song'),
            name,
            artist: canonicalArtist(resolveArtist(artist,core.artistLinks), artists),
            genre,
            createdAt: Date.now(),
            arrangements: [],
          }
          if (await storeChange(core, () => core.songs.saveAtomic(song))) {
            setSongs(core.songs.list())
            selectSong(song.id)
          }
        }}
        onCancel={() => selectSong(null)}
        t={t}
      />

      <RecoveryPanel core={core}/>
      {core.songs.diagnostics().error&&<p role="alert" className="text-bad">{t(`storage.${core.songs.diagnostics().error}`)}</p>}
      {songs.length === 0 ? (
        <div className={`${CARD} py-10 text-center text-muted`}>{t('editor.empty')}</div>
      ) : (
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s.id}>
              <button
                className={`${CARD} flex w-full items-center justify-between gap-3 text-left transition-colors hover:border-accent`}
                onClick={() => guard.request(()=>selectSong(s.id))}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {s.artist || t('editor.noArtist')} · {s.arrangements.length} {t('library.arrangements')}
                    {s.genre ? ` · ${s.genre}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {s.arrangements.map((a) => (
                    <span
                      key={a.id}
                      className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                    >
                      {t(KIND_KEY[a.kind])}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


function RecoveryPanel({core}:{core:AppCore}){
 const [recovery,setRecovery]=useState<string|null>(()=>{try{return core.songs.recovery()}catch{return null}})
 const it=core.locale==='it'
 return <section className={`${CARD} mb-4`} aria-label={it?'Recupero dati':'Data recovery'}><p>{it?'Esporta i brani correnti prima di ripristinare una copia precedente.':'Export current songs before restoring an older copy.'}</p><a download="musicmaestro-songs.json" href={'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({version:1,songs:core.songs.list()},null,2))}>{it?'Esporta brani correnti':'Export current songs'}</a>{recovery&&<><p>{it?'È disponibile una copia precedente dei dati locali.':'A previous copy of local data is available.'}</p><a download="musicmaestro-recovery.json" href={'data:application/json;charset=utf-8,'+encodeURIComponent(recovery)}>{it?'Esporta copia precedente':'Export recovery copy'}</a><button className={BTN_GHOST} onClick={async()=>{if(window.confirm(it?'Il ripristino sostituirà tutti i brani correnti. Esportali prima se vuoi conservarli.':'Restore will replace all current songs. Export them first if you want to keep them.')){if(await storeChange(core,()=>core.songs.restoreRecoveryAtomic())){setRecovery(core.songs.recovery());core.notify('ok',it?'Ripristino riuscito':'Recovery restored')}}}}>{it?'Ripristina':'Restore'}</button></>}</section>
}
