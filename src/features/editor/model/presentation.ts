import type { UserArrKind } from '@/domain/songs/types'
import { buttonStyles } from '@/shared/ui/styles'
export const KINDS: UserArrKind[] = ['tabs', 'lyrics', 'sheet']
export const KIND_KEY: Record<UserArrKind, string> = {
  tabs: 'editor.kind.tabs',
  lyrics: 'editor.kind.chords',
  sheet: 'editor.kind.notation',
}
export const GENRES = ['Rock', 'Folk', 'Pop', 'Classical', 'Blues', 'Jazz', 'Country', 'Metal']

export { panelStyle as CARD,fieldStyle as INPUT } from '@/shared/ui/styles'
export const BTN_PRIMARY=buttonStyles.primary
export const BTN_GHOST=buttonStyles.ghost
