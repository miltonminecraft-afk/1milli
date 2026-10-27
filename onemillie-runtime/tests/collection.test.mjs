import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrder, validOrder, moveRecord, recordLocations, visibleShelf } from '../lib/collection.mjs';

test('a saved order survives catalog additions and removals without duplicates', () => {
  assert.deepEqual(normalizeOrder(['b','removed','b','a'], ['a','b','c']), ['b','a','c']);
});
test('moving forward, backward and to an edge preserves every record exactly once', () => {
  assert.deepEqual(moveRecord(['a','b','c'], 'a', 2), ['b','c','a']);
  assert.deepEqual(moveRecord(['a','b','c'], 'c', -9), ['c','a','b']);
  assert.deepEqual(moveRecord(['a','b','c'], 'missing', 1), ['a','b','c']);
});
test('shared saved order rejects duplicate, missing and unknown records', () => {
  assert.equal(validOrder(['b','a'],['a','b']), true);
  for (const order of [['a','a'],['a'],['a','other'],null]) assert.equal(validOrder(order,['a','b']),false);
});

test('picking, swapping and returning records preserves the owner order and unique locations', () => {
  const order = Object.freeze(['c', 'a', 'b']);
  const first = recordLocations(order, 'a');
  assert.deepEqual(first.filter(r => r.location === 'shelf').map(r => r.id), ['c', 'b']);
  assert.equal(first.find(r => r.id === 'a').location, 'turntable');
  const swapped = recordLocations(order, 'b');
  assert.equal(swapped.find(r => r.id === 'a').slot, 1);
  assert.equal(swapped.find(r => r.id === 'a').location, 'shelf');
  assert.equal(swapped.filter(r => r.location === 'turntable').length, 1);
  assert.deepEqual(recordLocations(order).map(r => r.id), ['c', 'a', 'b']);
  assert.ok(recordLocations(order).every(r => r.location === 'shelf'));
});

test('front covers follow browsing and exclude the record on the turntable', () => {
  assert.deepEqual(visibleShelf(['a','b','c','d'], 'b', 'c'), ['c','d']);
  assert.deepEqual(visibleShelf(['a','b','c','d'], 'b', 'd'), ['d','a']);
  assert.deepEqual(visibleShelf(['a'], 'a', 'a'), []);
});
