import { SongStorageError } from '@/application/songs/SongRepository';
import { SongConflictError } from '@/application/songs/SongService';
import type { AppCore } from '@/core/plugin/context-impl';
export async function storeChange(core: AppCore, write: () => void|Promise<void>): Promise<boolean> {
  try { await write(); await core.refreshUserLibrary(); return true } catch(error) {
    core.notify('error', error instanceof SongConflictError ? (core.locale==='it'?'La canzone è cambiata in un’altra scheda. La bozza è conservata; copia le modifiche prima di riaprire la versione salvata.':'The song changed in another tab. Your draft is preserved; copy edits before reopening the saved version.') : core.t('editor.saveFailed')+(error instanceof SongStorageError?' '+core.t(`storage.${error.code}`):''))
    return false
  }
}
