import assert from 'node:assert/strict'
import {test} from 'node:test'
import production from '../../playwright.production.config.ts'
test('production verification starts only its dedicated preview server',()=>{
 assert.equal(Array.isArray(production.webServer),false)
 assert.ok(production.webServer && 'command' in production.webServer && production.webServer.command.includes('preview'))
})
