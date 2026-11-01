/** Short-lived handoff from a browser tab to a newly installed app on the same origin. */
export async function syncInvitation(browser:Window){
 const sessionKey='mm:sync-invitation',localKey='mm:pending-sync',incoming=new URLSearchParams(browser.location.hash.split('?')[1]??'').get('sync')
 const clear=()=>{for(const [storage,key] of [['sessionStorage',sessionKey],['localStorage',localKey]] as const){try{browser[storage].removeItem(key)}catch{/* Storage may be disabled. */}}}
 let code=incoming?.slice(0,20000)??''
 if(incoming===null){
  try{code=browser.sessionStorage.getItem(sessionKey)??''}catch{/* Try the installation handoff next. */}
  if(!code)try{const saved=JSON.parse(browser.localStorage.getItem(localKey)??'null');if(saved?.version===1&&typeof saved.code==='string')code=saved.code}catch{/* Corrupt handoffs are discarded below. */}
 }
 let valid=false
 try{
  if(!code)throw new Error('No invitation')
  const {decodePairing}=await import('./pairingCode')
  const invitation=decodePairing(code)
  valid=true
  // Replies require the first device's live connection, so only offers survive installation.
  if(invitation.kind==='offer'){
   try{browser.localStorage.setItem(localKey,JSON.stringify({version:1,code,expires:invitation.expires}))}catch{/* Keep the link and copy/paste fallback. */}
   try{browser.sessionStorage.setItem(sessionKey,code)}catch{/* Keep the in-memory invitation. */}
  }else clear()
 }catch{clear();if(incoming===null)code=''}
 return {code,clear,resume:valid&&incoming===null&&['','#','#/'].includes(browser.location.hash)}
}
