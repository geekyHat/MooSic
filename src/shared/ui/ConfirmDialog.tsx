import { useEffect,useRef } from 'react';
import { Button } from './Button';
export function ConfirmDialog({open,title,cancelLabel,confirmLabel,onCancel,onConfirm}:{open:boolean;title:string;cancelLabel:string;confirmLabel:string;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(!open)return;const previous=document.activeElement;ref.current?.showModal();return ()=>{ref.current?.close();if(previous instanceof HTMLElement && previous.isConnected)previous.focus()}},[open])
 return <dialog ref={ref} aria-labelledby="confirm-title" className="max-w-[calc(100%-2rem)] rounded-xl border border-line bg-panel p-5 text-ink backdrop:bg-black/40" onCancel={e=>{e.preventDefault();onCancel()}}><h2 id="confirm-title">{title}</h2><div className="mt-4 flex flex-wrap gap-3"><Button onClick={onCancel} autoFocus>{cancelLabel}</Button><Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button></div></dialog>
}
