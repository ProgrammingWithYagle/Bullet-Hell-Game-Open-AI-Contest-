import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeEvents, decodeEvents } from '../src/shared/wire-events.ts';
import type { Event, Shot } from '../src/shared/protocol.ts';

const shot: Shot = {
  id: 1,
  owner: 'hostile',
  x: 800.123456789,
  y: 250.333333333,
  vx: -123.456789,
  vy: 1e-9,
  radius: 4.25,
  damage: 9.75,
  expires: 9000,
  pierce: 2,
};

test('binary projectile batches round-trip exact doubles, ownership and shot/removal order', () => {
  const shots = Array.from({ length: 4000 }, (_, index) => ({ ...shot, id: index + 1 }));
  const source: Event[] = [
    { type: 'sound', id: 'warning' },
    { type: 'shots', shots },
    { type: 'remove', ids: [2, 3] },
    { type: 'shots', shots: [{ ...shot, id: 5000, owner: 'player_1' }] },
  ];
  const packed = encodeEvents(source);
  assert.deepEqual(decodeEvents(packed), source);
  assert.equal(packed[1].type, 'shot-batch');
  if (packed[1].type === 'shot-batch') assert.equal(packed[1].data.byteLength, 4000 * 40);
  // Colyseus returns binary views with an arbitrary byte offset in the message buffer.
  const encoded = encodeEvents([{ type: 'shots', shots: [shot] }])[0];
  assert.equal(encoded.type, 'shot-batch');
  if (encoded.type === 'shot-batch') {
    const buffer = new Uint8Array(encoded.data.length + 11);
    buffer.set(encoded.data, 7);
    assert.deepEqual(
      decodeEvents([{ ...encoded, data: buffer.subarray(7, 7 + encoded.data.length) }]),
      [{ type: 'shots', shots: [shot] }],
    );
  }
});

test('projectile decoding rejects truncated, nonfinite, oversized and obsolete packets', () => {
  const encoded = encodeEvents([{ type: 'shots', shots: [shot] }])[0];
  assert.equal(encoded.type, 'shot-batch');
  if (encoded.type !== 'shot-batch') return;
  assert.throws(() => decodeEvents([{ ...encoded, data: new Uint8Array(39) }]));
  assert.throws(() => decodeEvents([{ ...encoded, owner: '' }]));
  assert.throws(() => decodeEvents([{ ...encoded, damage: NaN }]));
  assert.throws(() => decodeEvents([{ ...encoded, expires: -1 }]));
  const invalid = encoded.data.slice();
  new DataView(invalid.buffer).setFloat64(8, NaN, true);
  assert.throws(() => decodeEvents([{ ...encoded, data: invalid }]));
  assert.throws(() => decodeEvents([{ ...encoded, data: new Uint8Array(6001 * 40) }]));
  assert.throws(() => decodeEvents([{ type: 'shots', shots: [shot] }] as never));
  assert.throws(() => decodeEvents([null] as never));
});
