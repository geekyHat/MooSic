import { NavigationGuard } from '@/shared/navigation/NavigationGuard';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useMemo,useRef,useState,type ReactNode } from 'react';
export function AppProvider({children,locale}:{children:ReactNode;locale:'it'|'en'}){
 const dirty=useRef(new Set<symbol>())
 const [pending,setPending]=useState<{action:()=>void;onCancel?:()=>void}|null>(null)
 const guard=useMemo(()=>({register:(isDirty:boolean)=>{const id=Symbol();if(isDirty)dirty.current.add(id);return ()=>{dirty.current.delete(id)}},isDirty:()=>dirty.current.size>0,request:(action:()=>void,onCancel?:()=>void)=>{if(dirty.current.size)setPending({action,onCancel});else action()}}),[])
 const it=locale==='it'
 return <NavigationGuard.Provider value={guard}>{children}<ConfirmDialog open={!!pending} title={it?'Modifiche non salvate. Uscire?':'Unsaved changes. Leave editor?'} cancelLabel={it?'Continua a modificare':'Keep editing'} confirmLabel={it?'Scarta modifiche':'Discard changes'} onCancel={()=>{pending?.onCancel?.();setPending(null)}} onConfirm={()=>{const action=pending?.action;setPending(null);action?.()}}/></NavigationGuard.Provider>
}
