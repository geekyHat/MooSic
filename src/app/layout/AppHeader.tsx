import type { View } from '@/app/App'
import type { AppCore } from '@/core/plugin/context-impl'
const NAV_BTN_BASE = 'min-h-11 border-0 px-3.5 py-1.75 rounded-lg cursor-pointer transition-colors max-narrow:px-1 max-narrow:text-xs'
const NAV_BTN_INACTIVE = `${NAV_BTN_BASE} bg-transparent text-muted hover:bg-accent/10 hover:text-ink`
const NAV_BTN_ACTIVE = `${NAV_BTN_BASE} bg-accent/15 text-accent font-semibold`

export function AppHeader({core,view,onNavigate,onHome}:{core:AppCore;view:View;onNavigate:(view:View)=>void;onHome:()=>void}){const t=core.t;return (      <header className="mm-header shrink-0 items-center bg-panel border-b border-line px-6.5 py-2.5 max-narrow:px-5 max-narrow:py-2">
        <a className="mm-logo" href="#/library" aria-label={`${t('app.name')} — ${t('nav.home')}`} title={t('nav.home')} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onHome()}}}>
          <picture>
            <source media="(max-width: 45rem)" srcSet={`${import.meta.env.BASE_URL}icons/icon-192.png`} />
            <img src={`${import.meta.env.BASE_URL}Logo/MooSicLogo.png`} alt={t('app.name')} width={1304} height={1206} className="mm-brand-logo" fetchPriority="high" />
          </picture>
          <span className="mm-brand-name" aria-hidden="true">{t('app.name')}</span>
        </a>
        <nav aria-label={t('nav.main')} className="mm-nav flex min-w-0 gap-1">
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
