import {useEffect,useRef,useState} from 'react'
import {Button} from '@/shared/ui/Button'
import {syncText} from '../syncText'
export function PairingScanner({locale,onCode,disabled}:{locale:'it'|'en';onCode:(code:string)=>void;disabled:boolean}){
 const t=syncText[locale],input=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),generation=useRef(0)
 const [camera,setCamera]=useState(false),[error,setError]=useState('')
 const stop=()=>{generation.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCamera(false)}
 useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(track=>track.stop())},[])
 const scanImage=async(file:File)=>{
   setError('');stop();const id=generation.current
   try{
     if(file.size>15*1024*1024)throw new Error()
     const image=await createImageBitmap(file)
     try{const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0,canvas.width,canvas.height);const {default:jsQR}=await import('jsqr');if(id!==generation.current)return;const found=jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);if(!found)throw new Error();onCode(found.data)}finally{image.close()}
   }catch{if(id===generation.current)setError(t.imageError)}
 }
 const start=async()=>{
   stop();setError('');setCamera(true);const id=generation.current
   try{
     const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false})
     if(id!==generation.current){media.getTracks().forEach(track=>track.stop());return}
     stream.current=media
     const element=video.current;if(!element){stop();return}element.srcObject=media;await element.play()
     const {default:jsQR}=await import('jsqr'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true})!
     const tick=()=>{
       if(id!==generation.current)return
       if(element.videoWidth){const scale=Math.min(1,1000/element.videoWidth);canvas.width=Math.round(element.videoWidth*scale);canvas.height=Math.round(element.videoHeight*scale);ctx.drawImage(element,0,0,canvas.width,canvas.height);const found=jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,{inversionAttempts:'dontInvert'});if(found){stop();onCode(found.data);return}}
       setTimeout(tick,250)
     };tick()
   }catch{if(id===generation.current){stop();setError(t.cameraError)}}
 }
 return <div className="my-3"><div className="flex flex-wrap gap-2"><Button disabled={disabled} onClick={()=>void start()}>{t.scan}</Button><Button disabled={disabled} onClick={()=>input.current?.click()}>{t.photo}</Button>{camera&&<Button onClick={stop}>{t.stop}</Button>}</div><input ref={input} type="file" accept="image/*" aria-label={t.photoLabel} disabled={disabled} className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void scanImage(file)}}/>{camera&&<video ref={video} autoPlay muted playsInline className="mt-3 w-full max-w-sm rounded-lg" aria-label={t.scan}/>} {error&&<p role="alert" className="mt-2">{error}</p>}</div>
}
