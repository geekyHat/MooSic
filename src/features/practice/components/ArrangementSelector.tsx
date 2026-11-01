import type { ArrangementKind,ContentVersion } from '@/core/plugin/types';
import type { Translate } from '../model';
const ARR_BTN_INACTIVE =
  'border border-line bg-panel rounded-full px-3.5 py-1.5 cursor-pointer text-[13px] text-muted hover:border-accent hover:text-accent'
const ARR_BTN_ACTIVE =
  'border border-accent bg-accent/15 rounded-full px-3.5 py-1.5 cursor-pointer text-[13px] text-accent font-semibold'
export function ArrangementSelector({version,selected,onChange,t}:{version:ContentVersion|null;selected:ArrangementKind;onChange:(kind:ArrangementKind)=>void;t:Translate}){return <>      {version && version.arrangements.length > 1 && (
        <div className="mm-arr-selector flex items-center gap-2 mb-3 flex-wrap">
          <span className="mm-arr-label text-[13px] text-muted font-semibold">
            {t('practice.arrangement')}:
          </span>
          {version.arrangements.map((a) => (
            <button
              key={a.kind}
              className={
                selected === a.kind
                  ? ARR_BTN_ACTIVE
                  : ARR_BTN_INACTIVE
              }
              onClick={() => onChange(a.kind)}
            >
              {t(`arrangement.${a.kind}`)}
            </button>
          ))}
        </div>
      )}
</>}
