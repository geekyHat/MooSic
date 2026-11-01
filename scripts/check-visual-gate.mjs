import {spawnSync} from 'node:child_process'
import {mkdirSync,readFileSync} from 'node:fs'
import path from 'node:path'
const out=path.resolve(process.env.MM_VISUAL_OUTPUT??'test-results/visual')
mkdirSync(out,{recursive:true})
const report=path.join(out,'negative-control.json')
const args=['node_modules/@playwright/test/cli.js','test','--config=playwright.visual.config.ts','--project=chromium','--grep=visual lyrics-mobile','--update-snapshots=none','--reporter=json']
const result=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000,env:{...process.env,MM_BROWSERS:'chromium',MM_VISUAL_NEGATIVE:'1',PLAYWRIGHT_JSON_OUTPUT_FILE:report}})
if(result.error)throw result.error
const data=JSON.parse(readFileSync(report,'utf8')),messages=[]
function collect(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[])for(const run of test.results??[])for(const error of run.errors??[])messages.push(error.message??'');for(const child of suite.suites??[])collect(child)}
for(const suite of data.suites??[])collect(suite)
if(result.status===0||data.stats.unexpected!==1||!messages.some(message=>/\d+ pixels.*different/s.test(message)))throw new Error('Visual gate did not reject the intended pixel regression: '+messages.join('\n')+'\n'+result.stderr)
console.log('Visual gate: correctly rejected intentional font/color pixel regression; no source or baseline was changed')
