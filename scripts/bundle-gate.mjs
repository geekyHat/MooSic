import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
const assets='dist/assets',files=readdirSync(assets).filter(f=>f.endsWith('.js'))
const chunks=files.map(file=>{const raw=readFileSync(`${assets}/${file}`);return {file,bytes:raw.length,gzip:gzipSync(raw).length}})
const html=readFileSync('dist/index.html','utf8')
const initial=chunks.filter(c=>html.includes(c.file))
const initialBytes=initial.reduce((sum,c)=>sum+c.bytes,0),initialGzip=initial.reduce((sum,c)=>sum+c.gzip,0)
const report={baseline:{initialBytes:837210,initialGzip:255820},budget:{chunkBytes:500000,initialBytes:350000,initialGzip:115000},initialBytes,initialGzip,chunks}
writeFileSync('dist/bundle-report.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
if(!initial.length||chunks.some(c=>c.bytes>report.budget.chunkBytes)||initialBytes>report.budget.initialBytes||initialGzip>report.budget.initialGzip)process.exitCode=1
