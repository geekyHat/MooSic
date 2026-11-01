import App from '@/app/App'
import { bootstrap } from '@/app/bootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

bootstrap().then((core) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App core={core} />
    </StrictMode>,
  )
}).catch(error=>{
  console.error('MooSic could not initialize local storage',error)
  const it=navigator.language.toLowerCase().startsWith('it')
  createRoot(document.getElementById('root')!).render(<main style={{padding:'2rem',fontFamily:'system-ui'}}><h1>MooSic</h1><p role="alert">{it?'Impossibile aprire i dati locali. Controlla che il browser consenta l’archiviazione per questo sito e riprova.':'Could not open local data. Check that the browser allows storage for this site and try again.'}</p><button onClick={()=>location.reload()}>{it?'Riprova':'Retry'}</button></main>)
})
