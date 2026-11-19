/* Build-injected inventory. This worker never reads or uploads musical documents. */
const config = /*__PWA_CONFIG__*/
const scopeURL=new URL(config.base,self.location.origin)
const namespace='musicmaestro-'+encodeURIComponent(scopeURL.pathname)+'-'
const cacheName=namespace+config.version
const packMarker=new URL(config.base+'__offline-pack-ready',self.location.origin).href
const absolute=file=>new URL(file.url,self.location.origin).href
const inventory=new Map([...config.core,...config.ocr].map(file=>[absolute(file),file]))
const inScope=client=>client.url.startsWith(scopeURL.href)
let downloading=null
async function allClients(){return (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(inScope)}
async function announce(message){for(const client of await allClients())client.postMessage(message)}
async function verifiedResponse(file) {
  const existing=await caches.match(file.url)
  if(existing&&await matchesDigest(existing,file))return existing
  const response=await fetch(file.url,{cache:'no-store',credentials:'same-origin'})
  if(!response.ok)throw new Error('HTTP '+response.status)
  if(!await matchesDigest(response,file))throw new Error('Offline file failed verification')
  return response
}
async function matchesDigest(response,file) {
  const bytes=await response.clone().arrayBuffer()
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')
  return digest===file.sha256||digest===file.decodedSha256
}
async function download(files,notify=()=>{}) {
  const cache=await caches.open(cacheName)
  let next=0,completed=0
  async function run() {
    while(next<files.length) {
      const file=files[next++]
      if(!await cache.match(file.url))await cache.put(file.url,await verifiedResponse(file))
      notify({completed:++completed,total:files.length})
    }
  }
  await Promise.all(Array.from({length:4},()=>run()))
}
async function complete(files) {
  const cache=await caches.open(cacheName)
  for(const file of files)if(!await cache.match(file.url))return false
  return true
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  await download(config.core)
  // Keep an explicitly downloaded pack available through application updates.
  if(await caches.match(packMarker)){
    await download(config.ocr)
    await (await caches.open(cacheName)).put(packMarker,new Response('ready'))
  }
  if(!self.registration.active)await self.skipWaiting()
})()))
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()))
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url)
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scopeURL.pathname))return
  if(request.mode==='navigate') {
    event.respondWith((async()=>{
      const cache=await caches.open(cacheName),file=inventory.get(new URL(config.base+'index.html',self.location.origin).href)
      const cached=await cache.match(file.url)
      // A mixed/stale entry page loads the previous JavaScript and repeats the
      // update banner even though this worker has already activated.
      if(cached&&await matchesDigest(cached,file))return cached
      const response=await verifiedResponse(file)
      await cache.put(file.url,response.clone())
      return response
    })())
    return
  }
  url.search='';url.hash=''
  const file=inventory.get(url.href)
  if(!file){if(url.pathname.startsWith(config.base+'assets/'))event.respondWith(caches.match(request,{ignoreSearch:true}).then(response=>response||fetch(request)));return}
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName),cached=await cache.match(file.url)
    if(cached)return cached
    const response=await verifiedResponse(file)
    await cache.put(file.url,response.clone())
    return response
  })())
})
async function canUpdate(client) {
  return new Promise(resolve=>{
    const channel=new MessageChannel()
    const timer=setTimeout(()=>{channel.port1.close();resolve(false)},3000)
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.ready===true)}
    client.postMessage({type:'CAN_UPDATE'},[channel.port2])
  })
}
let activation=null
async function activeVersion(){
  const active=self.registration.active
  if(!active)return null
  return new Promise(resolve=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null)},3000)
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.version)}
    // Older workers may ignore VERSION. Its timeout must still permit their
    // replacement, without starting expensive legacy STATUS cache checks.
    active.postMessage({type:'VERSION'},[channel.port2])
  })
}
async function activateUpdate() {
  // A stale waiting-worker reference can already be active when this request
  // arrives. Freezing clients then waiting for another controllerchange hangs.
  // Do not send STATUS to the old worker: its offline storage checks can keep
  // its message event alive and block activation past the mobile timeout.
  if(await activeVersion()===config.version)return {ok:true,alreadyActive:true}

  const clients=await allClients(),allowed=await Promise.all(clients.map(canUpdate))
  if(allowed.some(value=>!value)) {
    await announce({type:'UPDATE_CANCELLED'})
    return {ok:false,error:'busy-tabs'}
  }
  await announce({type:'RELOAD_ON_ACTIVATE',appVersion:config.appVersion,appBuild:config.appBuild})
  // Finish this ExtendableMessageEvent before activation. Waiting here can
  // leave the new worker blocked by its own activation request.
  void self.skipWaiting().catch(()=>announce({type:'UPDATE_CANCELLED'}))
  return {ok:true}
}
self.addEventListener('message',event=>{
  const port=event.ports[0],type=event.data?.type
  if(!port)return
  const run=async()=>{
    try {
      if(type==='VERSION')port.postMessage({ok:true,version:config.version})
      if(type==='STATUS')port.postMessage({ok:true,version:config.version,appVersion:config.appVersion,appBuild:config.appBuild,...(event.data.metadataOnly?{}:{coreReady:await complete(config.core),ocrReady:await complete(config.ocr),ocrBytes:config.ocr.reduce((sum,file)=>sum+file.bytes,0)})})
      if(type==='DOWNLOAD_OCR') {
        if(!downloading)downloading=download(config.ocr,progress=>{void announce({type:'OCR_PROGRESS',...progress})}).finally(()=>{downloading=null})
        await downloading;await (await caches.open(cacheName)).put(packMarker,new Response('ready'));port.postMessage({ok:true})
      }
      if(type==='ACTIVATE_UPDATE'){
        activation??=activateUpdate().finally(()=>{activation=null})
        port.postMessage(await activation)
      }
      if(type==='CLEAN_OLD_CACHES') {
        // Only delete old code after every open page reports this build. Never touch IndexedDB/localStorage.
        const clients=await allClients()
        const versions=await Promise.all(clients.map(client=>new Promise(resolve=>{
          const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null)},2000)
          channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.version)}
          client.postMessage({type:'APP_VERSION'},[channel.port2])
        })))
        if(versions.every(version=>version===config.appBuild+'/'+config.appVersion))for(const key of await caches.keys()){
          // An older active worker must never erase a newer worker's waiting precache.
          if(self.registration.installing||self.registration.waiting)break
          if(key.startsWith(namespace)&&key!==cacheName)await caches.delete(key)
        }
        port.postMessage({ok:true})
      }
    }catch(error){if(type==='ACTIVATE_UPDATE')await announce({type:'UPDATE_CANCELLED'});port.postMessage({ok:false,error:String(error?.message??error)})}
    finally{port.close()}
  }
  event.waitUntil(run())
})
