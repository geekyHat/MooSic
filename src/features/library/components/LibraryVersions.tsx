import type { ContentSong,ArrangementKind } from '@/core/plugin/types'
import { Button } from '@/shared/ui/Button'
export function LibraryVersions({song,onOpen,onEdit,t,emptyLabel}:{song:ContentSong;onOpen:(version:string,kind:ArrangementKind)=>void;onEdit?:(id:string)=>void;t:(key:string)=>string;emptyLabel:string}){
  return <div className="mm-library-grid grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3.5">{song.versions.map(version=><article key={version.id} className="mm-version mm-card rounded-xl border border-line bg-panel p-4">
    <h3 className="mb-2 text-lg">{version.name}</h3>
    {version.arrangements.length===0&&<p className="text-sm text-muted">{emptyLabel}</p>}
    {onEdit&&<Button className="mb-2" onClick={()=>onEdit(song.meta.id)}>{t('library.edit')}</Button>}
    <div className="arrangements flex flex-wrap gap-2">{version.arrangements.map(arrangement=><Button key={arrangement.kind} onClick={()=>onOpen(version.id,arrangement.kind)}>{t(`arrangement.${arrangement.kind}`)}</Button>)}</div>
  </article>)}</div>
}
