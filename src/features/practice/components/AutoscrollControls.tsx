import { useId, type RefObject } from 'react'
import { buttonStyles } from '@/shared/ui/styles'
import { useAutoscroll } from '../hooks/useAutoscroll'
import type { Translate } from '../model'

export function AutoscrollControls({ container, t, disabled = false }: {
  container: RefObject<HTMLElement | null>
  t: Translate
  disabled?: boolean
}) {
  const { running, speed, setSpeed, restart, toggle } = useAutoscroll(container)
  const speedId = useId()
  return <div role="group" aria-label={t('practice.autoscrollControls')} className="mm-autoscroll-controls grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3 min-[48rem]:flex min-[48rem]:flex-wrap">
    <button type="button" disabled={disabled} aria-pressed={running} aria-label={running ? '⏸ ' + t('practice.autoscrollPause') : '▶ ' + t('practice.autoscroll')} onClick={toggle} className={`${buttonStyles.primary} min-h-[44px] min-w-0 whitespace-nowrap disabled:opacity-50 max-narrow:px-2`}>
      {running ? '⏸ ' + t('practice.pause') : '▶ ' + t('practice.autoscroll')}
    </button>
    <label htmlFor={speedId} className="col-span-2 row-start-2 flex min-h-[44px] min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0">{t('practice.scrollSpeed')}</span>
      <input id={speedId} aria-label={t('practice.scrollSpeed')} type="range" min={5} max={100} step={5} value={speed} onChange={event => setSpeed(Number(event.target.value))} className="min-w-10 flex-1 accent-accent min-[48rem]:w-28 min-[48rem]:flex-none"/>
      <output htmlFor={speedId} className="shrink-0 tabular-nums">{speed} px/s</output>
    </label>
    <button type="button" disabled={disabled} onClick={restart} className={`${buttonStyles.secondary} col-start-2 row-start-1 min-h-[44px] whitespace-nowrap disabled:opacity-50 max-narrow:px-2`}>{t('practice.scrollTop')}</button>
  </div>
}
