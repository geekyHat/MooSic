import type { View } from '@/app/App'
import type { AppCore } from '@/core/plugin/context-impl'
const NAV_BTN_BASE = 'min-h-11 border-0 px-3.5 py-1.75 rounded-lg cursor-pointer transition-colors max-narrow:px-1 max-narrow:text-xs'
const NAV_BTN_INACTIVE = `${NAV_BTN_BASE} bg-transparent text-muted hover:bg-accent/10 hover:text-ink`
const NAV_BTN_ACTIVE = `${NAV_BTN_BASE} bg-accent/15 text-accent font-semibold`

export function AppHeader({core,view,onNavigate}:{core:AppCore;view:View;onNavigate:(view:View)=>void}){const t=core.t;return (      <header className="mm-header flex shrink-0 items-center gap-3.5 bg-panel border-b border-line px-4.5 py-2.5 max-narrow:grid max-narrow:grid-cols-[minmax(0,1fr)_auto] max-narrow:gap-2 max-narrow:px-3 max-narrow:py-2">
        <div className="mm-logo flex min-w-0 items-center gap-2 text-lg font-bold">
          <span>🎸</span>
          <span>{t('app.name')}</span>
        </div>
        <nav aria-label={t('nav.main')} className="mm-nav flex min-w-0 flex-1 gap-1 max-narrow:order-3 max-narrow:col-span-2 max-narrow:grid max-narrow:grid-cols-4">
          {(
            [
              ['library', 'nav.library'],
              ['practice', 'nav.practice'],
              ['editor', 'nav.editor'],
              ['settings', 'nav.settings'],
            ] as [View, string][]
          ).map(([v, key]) => (
            <button
              key={v}
              aria-current={view === v ? 'page' : undefined}
              className={view === v ? NAV_BTN_ACTIVE : NAV_BTN_INACTIVE}
              onClick={() => onNavigate(v)}
            >
              {t(key)}
            </button>
          ))}
        </nav>
        <select
          className="mm-locale min-h-11 border border-line bg-panel rounded-lg px-2 py-1 cursor-pointer"
          value={core.locale}
          onChange={(e) => core.setLocale(e.target.value as 'it' | 'en')}
          aria-label="Language"
        >
          <option value="it">IT</option>
          <option value="en">EN</option>
        </select>
      </header>)}
