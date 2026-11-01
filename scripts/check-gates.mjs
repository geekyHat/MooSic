import {spawnSync} from 'node:child_process'
import {writeFileSync,unlinkSync} from 'node:fs'
const probes=[
 {name:'lint',file:'tests/__gate_probe.ts',content:'export const unsafe: any = 1\n',args:['scripts/lint.mjs']},
 {name:'architecture',file:'src/domain/__gate_probe.ts',content:"import React from 'react'\nexport default React\n",args:['scripts/architecture.mjs']},
 {name:'unit',file:'tests/unit/__gate_probe.test.ts',content:"import {test} from 'node:test'\nimport assert from 'node:assert/strict'\ntest('intentional gate probe',()=>assert.equal(1,2))\n",args:['--import','./tests/unit/register.js','--test','--test-isolation=none','tests/unit/__gate_probe.test.ts']},
 {name:'bundle',file:'dist/assets/__gate_probe.js',content:'/*'+ 'x'.repeat(500001)+'*/',args:['scripts/bundle-gate.mjs']},
]
for(const probe of probes){let created=false;try{writeFileSync(probe.file,probe.content,{flag:'wx'});created=true;const result=spawnSync(process.execPath,probe.args,{encoding:'utf8',timeout:20000});if(result.status===0||result.error)throw new Error(`${probe.name} gate failed its negative control: ${result.error??result.stdout}`);console.log(`${probe.name}: correctly rejected intentional violation`)}finally{if(created)unlinkSync(probe.file)}}
const restored=spawnSync(process.execPath,['scripts/bundle-gate.mjs'],{encoding:'utf8'});if(restored.status!==0)throw new Error(restored.stderr);console.log('All probes removed; bundle report restored')
