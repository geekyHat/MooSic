import type { HTMLAttributes } from 'react'
import { panelStyle } from './styles'
export function Panel({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={`${panelStyle} ${className}`}/>}
export function Badge(props:HTMLAttributes<HTMLSpanElement>){return <span {...props} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted"/>}
export function EmptyState(props:HTMLAttributes<HTMLParagraphElement>){return <p {...props} className="p-4 text-muted"/>}
export function InlineError(props:HTMLAttributes<HTMLParagraphElement>){return <p {...props} role="alert" className="text-bad"/>}
