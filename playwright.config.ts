import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import process from 'node:process'
const port=Number(process.env.MM_TEST_PORT??5187)
const browsers=(process.env.MM_BROWSERS??'chromium').split(',') as ('chromium'|'firefox'|'webkit')[]
export default defineConfig({
 testDir:'./tests',testMatch:'**/*.spec.ts',testIgnore:['**/production/**','**/visual/**','**/pwa/**'],
 fullyParallel:true,workers:2,
 reporter:[['list'],['html',{open:'never'}]],
 use:{locale:'en-US',baseURL:`http://127.0.0.1:${port}`,trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
 projects:browsers.map(browserName=>({name:browserName,use:{browserName,launchOptions:browserName==='chromium'?{executablePath:process.env.CHROMIUM_PATH??(!process.env.CI&&existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}:{}}})),
 webServer:{command:`npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false},
})
