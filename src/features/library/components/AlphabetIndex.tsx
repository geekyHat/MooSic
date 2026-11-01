import { ALPHABET,type LibraryLetter } from '../model/browseLibrary'
import { Button } from '@/shared/ui/Button'
export function AlphabetIndex({selected,counts,onChange,t}:{selected:LibraryLetter;counts:Map<string,number>;onChange:(letter:LibraryLetter)=>void;t:(key:string)=>string}){
  return <nav aria-label={t('library.browse.alphabet')} className="mb-4 flex flex-wrap gap-1">
    <Button aria-controls="library-results" aria-pressed={selected==='all'} variant={selected==='all'?'primary':'secondary'} onClick={()=>onChange('all')}>{t('library.browse.all')}</Button>
    {ALPHABET.map(letter=><Button key={letter} className="min-h-11 min-w-11 px-2" aria-controls="library-results" aria-pressed={selected===letter} disabled={!counts.get(letter)} variant={selected===letter?'primary':'secondary'} title={`${letter} · ${counts.get(letter)??0}`} onClick={()=>onChange(letter)}>{letter}</Button>)}
  </nav>
}
