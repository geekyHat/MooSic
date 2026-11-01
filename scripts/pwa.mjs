import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root=fileURLToPath(new URL('../',import.meta.url))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
function publicFiles(directory,prefix='') {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?publicFiles(path.join(directory,entry.name),prefix+entry.name+'/'):[{name:prefix+entry.name,bytes:readFileSync(path.join(directory,entry.name))}])
}
/** Deterministic precache inventory: the large OCR pack is a separate, explicit download. */
export function pwa() {
  let base='/'
  const appBuild=process.env.MM_BUILD_ID??process.env.GITHUB_SHA??Date.now().toString(36)
  return {
    name:'moosic-pwa',apply:'build',enforce:'post',
    config(){return {define:{__APP_BUILD__:JSON.stringify(appBuild)}}},
    configResolved(config){base=config.base},
    generateBundle: {
      order:'post',
      handler(_options,bundle) {
        const manifest={id:base,name:'MooSic',short_name:'MooSic',description:'Your local song library, chords and tablature',lang:'it',start_url:base,scope:base,display:'standalone',background_color:'#fffdf8',theme_color:'#111111',categories:['music','education'],icons:[
          {src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
          {src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
        ]}
        this.emitFile({type:'asset',fileName:'manifest.webmanifest',source:JSON.stringify(manifest)})
        const files=Object.entries(bundle).filter(([name])=>!name.endsWith('.map')&&!name.endsWith('.txt')&&!name.endsWith('.json')).map(([name,item])=>({name,bytes:Buffer.from(item.type==='chunk'?item.code:item.source)}))
        files.push({name:'manifest.webmanifest',bytes:Buffer.from(JSON.stringify(manifest))},...publicFiles(path.join(root,'public')))
        const unique=new Map(files.map(file=>[file.name,file]))
        // Some static servers mark .gz files as HTTP Content-Encoding: gzip.
        // Fetch then exposes the decoded payload; both representations have a fixed digest.
        const inventory=[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(({name,bytes})=>({url:base+name,sha256:sha(bytes),bytes:bytes.length,...(name.endsWith('.gz')?{decodedSha256:sha(gunzipSync(bytes))}:{})}))
        const core=inventory.filter(file=>!file.url.includes('/scan-assets/')&&!file.url.includes('/sounds/')&&!file.url.includes('/icons/MooSic-icons/'))
        const ocr=inventory.filter(file=>file.url.includes('/scan-assets/'))
        const version=sha(JSON.stringify(inventory)).slice(0,16)
        const config={base,version,appBuild,core,ocr}
        this.emitFile({type:'asset',fileName:'offline-inventory.json',source:JSON.stringify(config,null,2)})
        const worker=readFileSync(path.join(root,'src/infrastructure/pwa/service-worker.js'),'utf8').replace('/*__PWA_CONFIG__*/',JSON.stringify(config))
        this.emitFile({type:'asset',fileName:'sw.js',source:worker})
        this.emitFile({type:'asset',fileName:'.nojekyll',source:''})
      },
    },
  }
}
