import type { AppCore } from '@/core/plugin/context-impl';
import { useAppSnapshot } from '@/shared/hooks/useAppSnapshot';
import { IconButton } from '@/shared/ui/Button';
const TOAST_BORDER:Record<string,string>={ok:'border-ok',error:'border-bad'}
export function NotificationRegion({core}:{core:AppCore}){const notifications=useAppSnapshot(core.notificationStore);return (      <div aria-live="polite" aria-atomic="false" className="mm-notifications fixed bottom-4 right-4 left-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            role={n.level === 'error' ? 'alert' : 'status'}
            className={`mm-toast max-w-full break-words rounded-[10px] bg-panel border shadow-[0_6px_18px_rgb(0_0_0/12%)] px-3.5 py-2.5 text-sm ${TOAST_BORDER[n.level] ?? 'border-line'}`}
          >
            <span>{n.text}</span><IconButton aria-label={core.locale==='it'?'Chiudi notifica':'Dismiss notification'} className="pointer-events-auto ml-2" onClick={()=>core.notificationStore.dismiss(n.id)}>×</IconButton>
          </div>
        ))}
      </div>)}
