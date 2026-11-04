import {readFileSync,appendFileSync} from 'node:fs'
const value=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version
if(!/^\d+\.\d+\.\d+$/.test(value))throw new Error('package.json must contain a numeric release version')
const [major,minor,patch]=value.split('.').map(Number),run=process.env.GITHUB_RUN_NUMBER
if(run!==undefined&&!/^[1-9]\d*$/.test(run))throw new Error('Invalid publication run number')
// A rerun keeps the same version; later publication runs get a higher patch.
const version=`${major}.${minor}.${Math.max(patch,Number(run??patch))}`
if(process.env.GITHUB_ENV)appendFileSync(process.env.GITHUB_ENV,`MM_APP_VERSION=${version}\n`)
console.log(version)
