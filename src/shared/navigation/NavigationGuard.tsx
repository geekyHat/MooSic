import { createContext,useContext,useEffect } from 'react';
export interface Guard {register:(dirty:boolean)=>()=>void;isDirty:()=>boolean;request:(action:()=>void,onCancel?:()=>void)=>void}
export const NavigationGuard=createContext<Guard>({register:()=>()=>{},isDirty:()=>false,request:action=>action()})
export function useDirtyGuard(dirty:boolean){const guard=useContext(NavigationGuard);useEffect(()=>guard.register(dirty),[guard,dirty]);useEffect(()=>{if(!dirty)return;const handler=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',handler);return ()=>window.removeEventListener('beforeunload',handler)},[dirty]);return guard.request}
