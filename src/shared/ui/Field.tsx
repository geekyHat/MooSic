import { useId,type InputHTMLAttributes,type ReactNode,type SelectHTMLAttributes } from 'react';
import { fieldStyle } from './styles';
export function Field({label,description,error,id:provided,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;description?:string;error?:string}){
 const generated=useId();const id=provided??generated
 return <div><label htmlFor={id}>{label}</label><input {...props} id={id} className={fieldStyle} aria-invalid={!!error} aria-describedby={`${description?id+'-hint ':''}${error?id+'-error':''}`.trim()||undefined}/>{description&&<p id={id+'-hint'}>{description}</p>}{error&&<p id={id+'-error'} role="alert">{error}</p>}</div>
}
export function Select({label,children,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string;children:ReactNode}){const id=useId();return <label htmlFor={id}>{label}<select {...props} id={id} className={fieldStyle}>{children}</select></label>}
