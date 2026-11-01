import { LIBRARY_VIEWS,type LibraryViewId } from '../model/browseLibrary'
import { Button } from '@/shared/ui/Button'
export function LibraryBrowseMenu({selected,onChange,t}:{selected:LibraryViewId;onChange:(view:LibraryViewId)=>void;t:(key:string)=>string}){
  return <div role="group" aria-label={t('library.browse.label')} className="mb-4 flex flex-wrap gap-2">
    {LIBRARY_VIEWS.map(view=><Button key={view.id} aria-pressed={selected===view.id} variant={selected===view.id?'primary':'secondary'} onClick={()=>onChange(view.id)}>{t(view.label)}</Button>)}
  </div>
}
