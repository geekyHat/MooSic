import {execFileSync} from 'node:child_process'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
for(const version of ['a','b'])execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',`.qa/pwa/${version}`],{env:{...process.env,MM_BUILD_ID:`test-${version}`,MM_BASE_PATH:'/MusicMaestro/'},stdio:['ignore','ignore','inherit']})
let version='a'
let fault=null
let encodedLanguages=false
let unavailable=false
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.gz':'application/gzip','.wasm':'application/wasm'}
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost')
 if(req.method==='POST'&&url.pathname==='/__test/version'){version=url.searchParams.get('value')==='b'?'b':'a';fault=null;encodedLanguages=false;unavailable=false;res.end(version);return}
 if(req.method==='POST'&&url.pathname==='/__test/unavailable'){unavailable=true;res.end('ok');return}
 if(req.method==='POST'&&url.pathname==='/__test/fault'){fault={path:url.searchParams.get('path'),corrupt:url.searchParams.get('corrupt')==='1'};res.end('ok');return}
 if(req.method==='POST'&&url.pathname==='/__test/encoding'){encodedLanguages=true;res.end('ok');return}
 if(!url.pathname.startsWith('/MusicMaestro/')){res.writeHead(404);res.end();return}
 if(unavailable){res.writeHead(503,{'Cache-Control':'no-store'});res.end('Hosting unavailable; local network remains connected');return}
 let file=decodeURIComponent(url.pathname.slice('/MusicMaestro/'.length))||'index.html'
 if(file.split('/').includes('..')){res.writeHead(400);res.end();return}
 if(fault&&file.endsWith(fault.path)){const corrupt=fault.corrupt;fault=null;res.writeHead(corrupt?200:503,{'Content-Type':'text/javascript'});res.end('intentionally incomplete test response');return}
 try{const bytes=await readFile(path.join('.qa/pwa',version,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store',...(encodedLanguages&&file.endsWith('.traineddata.gz')?{'Content-Encoding':'gzip'}:{})});res.end(bytes)}catch{res.writeHead(404);res.end()}
}).listen(5207,'127.0.0.1')
