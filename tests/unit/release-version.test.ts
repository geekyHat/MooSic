import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

test('publication versions increase per run and remain stable on a rerun',()=>{
 const [major,minor,patch]=JSON.parse(readFileSync('package.json','utf8')).version.split('.').map(Number)
 const release=(run:string)=>spawnSync(process.execPath,['scripts/release-version.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_RUN_NUMBER:run,GITHUB_ENV:''}})
 const first=release(String(patch+10)),again=release(String(patch+10)),next=release(String(patch+11))
 assert.equal(first.status,0);assert.equal(first.stdout.trim(),`${major}.${minor}.${patch+10}`)
 assert.equal(again.stdout,first.stdout);assert.equal(next.stdout.trim(),`${major}.${minor}.${patch+11}`)
 assert.notEqual(release('invalid').status,0)
})
