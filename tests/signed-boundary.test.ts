import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Game } from '../src/shared/game.ts';
import { signBoundary, verifyBoundary } from '../src/server/checkpoints.ts';
import { idleInput } from '../src/shared/protocol.ts';
function boundary() {
  const g = new Game({ seed: 99, maxPlayers: 2, mode: 'endless' }),
    a = g.addPlayer('a', 'Mara', 'soldier'),
    b = g.addPlayer('b', 'Iona', 'medic');
  a.coins = 1000;
  g.transact(a.id, { id: 'supply', kind: 'supply', item: 'medkit' });
  g.transact(b.id, { id: 'upgrade', kind: 'upgrade', item: 'damage' });
  g.start();
  g.boss.health = 0;
  g.step();
  g.vote(a.id, 2);
  g.vote(b.id, 1);
  return g;
}
test('signed multiplayer boundary retains both builds, inventory, exact votes/RNG and duplicate-purchase replies', () => {
  const g = boundary(),
    key = randomBytes(32),
    id = { runId: randomUUID(), ownerEpoch: 1, sequence: 8 };
  const signed = signBoundary(g, id, key, 1000000),
    restored = verifyBoundary(signed, key, 1000001);
  assert.equal(restored.runId, id.runId);
  assert.equal(restored.sequence, 8);
  assert.deepEqual(restored.game.mutationCards, g.mutationCards);
  assert.deepEqual([...restored.game.votes], [...g.votes]);
  assert.equal(restored.game.rng.state >>> 0, g.rng.state >>> 0);
  assert.equal(restored.game.rng.next(), g.rng.next());
  assert.equal(restored.game.phaseEnds, g.phaseEnds);
  const p = restored.game.players.get('a')!;
  assert.equal(p.connected, false);
  assert.equal(p.supplies[0].count, 1);
  restored.game.setConnected(p.id, true);
  const coins = p.coins;
  assert(restored.game.transact(p.id, { id: 'supply', kind: 'supply', item: 'medkit' }).ok);
  assert.equal(p.coins, coins);
  assert.equal(p.supplies[0].count, 1);
  assert(restored.game.submitInput(p.id, { ...idleInput(), sequence: 1 }));
});
test('fifty-player signed boundary round-trip stays bounded and retains every distinct participant build', () => {
  const g = new Game({ seed: 1234, maxPlayers: 50, mode: 'endless' });
  for (let n = 0; n < 50; n++) {
    const p = g.addPlayer('player-' + n, 'Fixture ' + n, n % 2 ? 'medic' : 'soldier');
    p.coins = 1000;
    assert(g.transact(p.id, { id: 'item-' + n, kind: 'supply', item: 'medkit' }).ok);
  }
  g.start();
  g.boss.health = 0;
  g.step();
  const key = randomBytes(32),
    signed = signBoundary(g, { runId: randomUUID(), ownerEpoch: 1, sequence: 1 }, key);
  assert(Buffer.from(signed.body, 'base64url').length < 256 * 1024);
  const result = verifyBoundary(signed, key).game;
  assert.equal(result.players.size, 50);
  assert.equal(result.peakPlayers, 50);
  for (const [id, p] of g.players) {
    assert.equal(result.players.get(id)!.classId, p.classId);
    assert.deepEqual(result.players.get(id)!.supplies, p.supplies);
  }
});
test('tampering, key mismatch, expiry, unsafe phases and malformed identities cannot restore a signed game', () => {
  const g = boundary(),
    key = randomBytes(32),
    id = { runId: randomUUID(), ownerEpoch: 1, sequence: 1 };
  const signed = signBoundary(g, id, key, 1000);
  const body = JSON.parse(Buffer.from(signed.body, 'base64url').toString());
  body.state.players[0].coins += 1000;
  assert.throws(
    () =>
      verifyBoundary(
        { ...signed, body: Buffer.from(JSON.stringify(body)).toString('base64url') },
        key,
        1001,
      ),
    /invalidSignature/,
  );
  assert.throws(() => verifyBoundary(signed, randomBytes(32), 1001), /invalidSignature/);
  assert.throws(() => verifyBoundary(signed, key, 1000 + 86400000), /expiredCheckpoint/);
  assert.throws(() => signBoundary(g, { ...id, ownerEpoch: 0 }, key), /invalidCheckpointIdentity/);
  g.phase = 'combat';
  assert.throws(() => signBoundary(g, id, key), /unsafeCheckpointPhase/);
  g.phase = 'victory';
  assert.throws(() => signBoundary(g, id, key), /unsafeCheckpointPhase/);
});
test('boundary validator rejects duplicate participants, forged inventory and foreign vote IDs', () => {
  const save = JSON.parse(JSON.stringify(boundary().authoritativeCheckpoint()));
  assert.throws(() =>
    Game.restoreAuthoritative({ ...save, players: [save.players[0], save.players[0]] }),
  );
  assert.throws(() => Game.restoreAuthoritative({ ...save, votes: { intruder: 0 } }));
  save.players[0].supplies[0].count = 3;
  assert.throws(() => Game.restoreAuthoritative(save));
});
