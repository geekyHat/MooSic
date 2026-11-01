import type { ReactNode, RefObject } from 'react'
import type { Translate } from '../model'
import { AutoscrollControls } from './AutoscrollControls'

export function PracticeToolbar({ container, t, disabled, children }: {
  container: RefObject<HTMLElement | null>
  t: Translate
  disabled?: boolean
  children?: ReactNode
}) {
  return <div className="mm-practice-toolbar sticky top-0 z-10 my-3 rounded-xl border border-line bg-panel shadow-sm">
    <AutoscrollControls container={container} t={t} disabled={disabled}/>
    {children}
  </div>
}
