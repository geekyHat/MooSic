import {defineConfig} from '@playwright/test'
import base from './playwright.config'
export default defineConfig({...base,testDir:'./tests/pwa',testIgnore:[],fullyParallel:false,workers:1,timeout:90000,
 use:{...base.use,baseURL:'http://127.0.0.1:5207'},
 webServer:{command:'node scripts/pwa-test-server.mjs',url:'http://127.0.0.1:5207/MusicMaestro/',timeout:120000,reuseExistingServer:false},
})
