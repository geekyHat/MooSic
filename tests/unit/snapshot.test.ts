import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotificationStore } from '../../src/application/notifications/NotificationStore.ts';
test('published snapshots are stable and deeply immutable',()=>{
 const store=new NotificationStore();store.notify('ok','Saved')
 const value=store.getSnapshot();assert.equal(store.getSnapshot(),value)
 assert.equal(Object.isFrozen(value),true);assert.equal(Object.isFrozen(value[0]),true)
})
