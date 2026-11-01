import type { ButtonHTMLAttributes } from 'react';
import { buttonStyles } from './styles';
export function Button({variant='secondary',pending=false,type='button',disabled,className='',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:keyof typeof buttonStyles;pending?:boolean}){
 return <button {...props} type={type} disabled={disabled||pending} aria-busy={pending||undefined} className={`${buttonStyles[variant]} disabled:opacity-50 ${className}`}>{children}</button>
}
export function IconButton(props:Omit<Parameters<typeof Button>[0],'aria-label'>&{'aria-label':string}){return <Button {...props}/>}
