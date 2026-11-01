import { useSyncExternalStore } from 'react';
export function useAppSnapshot<T>(store:{subscribe:(cb:()=>void)=>()=>void;getSnapshot:()=>T}){return useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot)}
