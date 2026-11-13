import test from 'node:test';
import assert from 'node:assert/strict';
import { Capacity } from '../src/server/capacity.ts';

test('admission offers reserve finite capacity and waiting players get the released slot in order', () => {
  const c = new Capacity(1, 1);
  c.addRoom('room');
  c.reserve('existing');
  const a = c.enqueue('join'),
    b = c.enqueue('join');
  assert.equal(a.state, 'waiting');
  assert.equal(b.position, 2);
  c.release('existing');
  assert.equal(c.admission(a.id)?.state, 'ready');
  assert.throws(() => c.reserve('bypass'), /capacity/);
  c.reserve('a', a.id);
  assert.equal(c.admission(a.id), null);
  assert.equal(c.admission(b.id)?.state, 'waiting');
  c.release('a');
  assert.equal(c.admission(b.id)?.state, 'ready');
  c.reserve('b', b.id);
  assert.equal(c.slots.size, 1);
});

test('stale offers and cancelled waiters release their hold; forged and reused permits fail', () => {
  let clock = 1000;
  const c = new Capacity(1, 2, () => clock);
  const first = c.enqueue('join'),
    second = c.enqueue('join');
  clock += 15001;
  assert.equal(c.admission(first.id), null);
  assert.equal(c.admission(second.id)?.state, 'ready');
  assert.throws(() => c.reserve('forged', 'not-a-ticket'), /capacity/);
  c.cancelAdmission(second.id);
  assert(c.summary().canJoin);
  const next = c.enqueue('join');
  c.reserve('next', next.id);
  assert.throws(() => c.reserve('replay', next.id), /capacity/);
  assert.equal(c.slots.size, 1);
});

test('room limits keep create requests waiting while eligible joins can use existing rooms', () => {
  const c = new Capacity(3, 1);
  c.addRoom('existing');
  c.reserve('owner');
  const create = c.enqueue('create'),
    join = c.enqueue('join');
  assert.equal(create.state, 'waiting');
  assert.equal(join.state, 'ready');
  c.reserve('guest', join.id);
  assert.equal(c.slots.size, 2);
  assert.throws(() => c.addRoom('bypass'), /capacity/);
  c.removeRoom('existing');
  assert.equal(c.admission(create.id)?.state, 'ready');
  c.addRoom('next', create.id);
  c.reserve('next-owner', create.id);
  assert.equal(c.rooms.size, 1);
  assert.equal(c.slots.size, 3);
});

test('unpolled waiters expire and the pending queue is bounded', () => {
  let clock = 0;
  const c = new Capacity(1, 1, () => clock);
  c.reserve('full');
  const first = c.enqueue('join');
  clock = 29999;
  assert(c.admission(first.id));
  clock += 30001;
  assert.equal(c.admission(first.id), null);
  for (let n = 0; n < 128; n++) c.enqueue('join');
  assert.throws(() => c.enqueue('join'), /queueFull/);
  assert.equal(c.summary().queued, 128);
});
