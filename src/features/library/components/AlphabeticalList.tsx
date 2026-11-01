import { useId,type ReactNode } from 'react'
import { initialLetter } from '../model/browseLibrary'
export function AlphabeticalList<T>({items,label,itemKey,render}:{items:readonly T[];label:(item:T)=>string;itemKey:(item:T)=>string;render:(item:T)=>ReactNode}){
  const id=useId(),groups=new Map<string,T[]>()
  for(const item of items){const letter=initialLetter(label(item)),group=groups.get(letter)??[];group.push(item);groups.set(letter,group)}
  return <div className="mm-alphabetical-list space-y-5">{[...groups].map(([letter,group])=><section key={letter} aria-labelledby={`${id}-${letter}`}>
    <h3 id={`${id}-${letter}`} className="mb-2 border-b border-line pb-2 text-lg font-bold text-accent">{letter}</h3>
    <ul className="m-0 list-none space-y-2 p-0">{group.map(item=><li key={itemKey(item)}>{render(item)}</li>)}</ul>
  </section>)}</div>
}
