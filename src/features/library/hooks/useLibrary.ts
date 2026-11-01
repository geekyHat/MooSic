import type { AppCore } from '@/core/plugin/context-impl'
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot'
import { useEffect } from 'react'
export function useLibrary(core:AppCore){
 const snapshot=useAppSnapshot(core.library)
 useEffect(()=>{void core.ensureLibrary()},[core,core.pluginVersion])
 return snapshot
}
