import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
const directory=process.argv[2]??'dist',inventory=JSON.parse(readFileSync(`${directory}/offline-inventory.json`,'utf8'))
for(const file of [...inventory.core,...inventory.ocr]){
 if(!file.url.startsWith(inventory.base)||file.url.includes('..'))throw new Error(`Invalid offline path: ${file.url}`)
 const bytes=readFileSync(`${directory}/${file.url.slice(inventory.base.length)}`)
 if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error(`Offline digest mismatch: ${file.url}`)
 if(file.decodedSha256&&createHash('sha256').update(gunzipSync(bytes)).digest('hex')!==file.decodedSha256)throw new Error(`Decoded digest mismatch: ${file.url}`)
}
if(!inventory.core.some(file=>file.url===inventory.base+'index.html')||!inventory.ocr.some(file=>file.url.endsWith('eng.traineddata.gz')))throw new Error('Incomplete offline inventory')
const manifest=JSON.parse(readFileSync(`${directory}/manifest.webmanifest`,'utf8'))
if(manifest.scope!==inventory.base||manifest.start_url!==inventory.base)throw new Error('PWA scope mismatch')
for(const icon of manifest.icons)readFileSync(`${directory}/${icon.src}`)
console.log(`Offline integrity: ${inventory.core.length} application files, ${inventory.ocr.length} recognition files; scope ${inventory.base}`)
