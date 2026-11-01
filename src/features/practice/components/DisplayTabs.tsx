import type { DisplayTab,Translate } from '../model';
const DISPLAY_TAB_INACTIVE =
  'appearance-none border border-transparent border-b-0 bg-transparent text-muted text-sm font-semibold px-4 pt-2 pb-2.5 rounded-t-lg cursor-pointer transition-[background-color,color] hover:text-ink hover:bg-ink/5'
const DISPLAY_TAB_ACTIVE =
  'appearance-none border border-line border-b-0 bg-panel text-ink text-sm font-semibold px-4 pt-2 pb-2.5 rounded-t-lg cursor-pointer relative top-px after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:bg-panel'
export function DisplayTabs({available,selected,onChange,t}:{available:DisplayTab[];selected:DisplayTab;onChange:(tab:DisplayTab)=>void;t:Translate}){return <>      {available.length > 1 && (
        <div className="mm-display-tabs flex gap-1.5 mt-3.5 border-b-2 border-line" role="tablist" aria-label={t('practice.display')}>
          {available.map((tab) => (
            <button
              key={tab}
              role="tab"
              id={`display-tab-${tab}`}
              aria-controls="display-panel"
              tabIndex={selected === tab ? 0 : -1}
              onKeyDown={(e) => {
                const index = available.indexOf(tab)
                const next = e.key === 'ArrowRight' ? (index + 1) % available.length
                  : e.key === 'ArrowLeft' ? (index - 1 + available.length) % available.length
                  : e.key === 'Home' ? 0 : e.key === 'End' ? available.length - 1 : -1
                if (next < 0) return
                e.preventDefault()
                onChange(available[next])
                document.getElementById(`display-tab-${available[next]}`)?.focus()
              }}
              aria-selected={selected === tab}
              className={
                selected === tab
                  ? DISPLAY_TAB_ACTIVE
                  : DISPLAY_TAB_INACTIVE
              }
              onClick={() => {onChange(tab)}}
            >
              {t(`display.${tab}`)}
            </button>
          ))}
        </div>
      )}
</>}
