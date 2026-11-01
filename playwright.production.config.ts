import { defineConfig } from '@playwright/test'
import base from './playwright.config'
const port=Number(process.env.MM_PREVIEW_PORT??5197)
export default defineConfig({...base,
 testDir:'./tests/production',testIgnore:[],testMatch:'**/*.spec.ts',
 use:{...base.use,baseURL:`http://127.0.0.1:${port}`},
 webServer:{command:`npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false},
})
