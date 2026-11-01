import { Button } from '@/shared/ui/Button';
import { Component,type ReactNode } from 'react';
export class ChunkBoundary extends Component<{children:ReactNode;locale:'it'|'en'},{error:boolean}>{
 state={error:false}
 static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div role="alert"><p>{this.props.locale==='it'?'Impossibile caricare la pagina. Controlla la connessione e riprova.':'Page could not load. Check the connection and retry.'}</p><Button onClick={()=>window.location.reload()}>{this.props.locale==='it'?'Ricarica':'Reload'}</Button></div>:this.props.children}
}
