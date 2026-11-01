import {defineConfig} from '@playwright/test'
import base from './playwright.config'
export default defineConfig({...base,
 testMatch:'**/olga*.spec.ts',
 use:{...base.use,baseURL:'http://127.0.0.1:5190'},
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 5190 --strictPort',url:'http://127.0.0.1:5190',reuseExistingServer:false},
})
