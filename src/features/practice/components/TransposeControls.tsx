import { buttonStyles } from '@/shared/ui/styles'
import type { Translate } from '../model'

export interface TransposeActions {
  semitones: number
  down: () => void
  up: () => void
  reset: () => void
}

export function TransposeControls({ value, t }: { value: TransposeActions; t: Translate }) {
  const button = `${buttonStyles.secondary} flex min-h-[44px] min-w-[44px] items-center justify-center px-2 disabled:cursor-default disabled:opacity-50`
  const amount = value.semitones > 0 ? '+' + value.semitones : String(value.semitones)
  return <div role="group" aria-label={t('practice.transpose')} className="mm-transpose-controls border-t border-line px-3 pb-3 pt-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-auto text-sm font-semibold">{t('practice.transpose')}</span>
      <button type="button" className={button} aria-label={t('practice.transposeDown')} title={t('practice.transposeDown')} disabled={value.semitones <= -11} onClick={value.down}>−</button>
      <output aria-label={t('practice.transposeOffset')} aria-live="polite" className="min-w-7 text-center text-sm font-semibold tabular-nums">{amount}</output>
      <button type="button" className={button} aria-label={t('practice.transposeUp')} title={t('practice.transposeUp')} disabled={value.semitones >= 11} onClick={value.up}>+</button>
      <button type="button" className={button} aria-label={t('practice.transposeReset')} title={t('practice.transposeReset')} disabled={value.semitones === 0} onClick={value.reset}>↺</button>
    </div>
    <p className="mt-1 text-xs text-muted">{t('practice.transposeHelp')}</p>
  </div>
}
