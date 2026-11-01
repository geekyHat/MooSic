import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from '../../src/shared/ui/Button.tsx'
import { Field } from '../../src/shared/ui/Field.tsx'
test('button defaults to non-submit and pending disables interaction with exclusive colors',()=>{
 const html=renderToStaticMarkup(<Button variant="primary" pending>Save</Button>)
 assert.match(html,/type="button"/);assert.match(html,/disabled/);assert.match(html,/aria-busy="true"/);assert.match(html,/bg-accent /);assert.doesNotMatch(html,/bg-panel/)
})
test('field label, description and error reference stable IDs',()=>{
 const html=renderToStaticMarkup(<Field id="title" label="Title" description="Required" error="Missing"/>)
 assert.match(html,/for="title"/);assert.match(html,/aria-describedby="title-hint title-error"/);assert.match(html,/aria-invalid="true"/);assert.match(html,/id="title-error" role="alert"/)
})
