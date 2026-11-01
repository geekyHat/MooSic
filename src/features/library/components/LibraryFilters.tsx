import type { LibraryFilters as Filters } from '../model/filterLibrary'
const SELECT='max-w-full rounded-[9px] border border-line bg-panel px-2.5 py-2 text-muted'
export function LibraryFilters({filters,composers,genres,onChange,t}:{filters:Filters;composers:string[];genres:string[];onChange:(filters:Filters)=>void;t:(key:string)=>string}){
  return <div className="mm-library-filters mb-4 flex flex-wrap gap-2.5">
    <input className="mm-search min-w-0 basis-[180px] flex-1 rounded-[9px] border border-line bg-panel px-3 py-2" type="search" placeholder={t('library.search')} value={filters.search} onChange={e=>onChange({...filters,search:e.target.value})} aria-label={t('library.search')}/>
    <select className={SELECT} value={filters.composer} onChange={e=>onChange({...filters,composer:e.target.value})} aria-label={t('library.composer')}>
      <option value="all">{t('library.allComposers')}</option>{composers.map(name=><option key={name} value={name}>{name}</option>)}
    </select>
    <select className={SELECT} value={filters.genre} onChange={e=>onChange({...filters,genre:e.target.value})} aria-label={t('library.genre')}>
      <option value="all">{t('library.allGenres')}</option>{genres.map(name=><option key={name} value={name}>{name}</option>)}
    </select>
  </div>
}
