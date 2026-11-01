import {defineConfig} from '@playwright/test'
import base from './playwright.config'
const target=process.env.MM_TARGET_URL
const port=Number(process.env.MM_TEST_PORT??5187)
export default defineConfig({...base,
 testDir:'./tests/visual',testIgnore:[],
 snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{arg}{ext}',
 use:{...base.use,reducedMotion:'reduce',baseURL:target??`http://127.0.0.1:${port}`},
 webServer:target?undefined:base.webServer,
 outputDir:process.env.MM_VISUAL_OUTPUT??'test-results/visual',
})
