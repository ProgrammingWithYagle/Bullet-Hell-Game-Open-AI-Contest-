import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client, CloseCode, type Room } from '@colyseus/sdk';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Capacity, capacity } from '../src/server/capacity.ts';
import { CONTENT_REVISION, PROTOCOL, idleInput } from '../src/shared/protocol.ts';
import { WorldState } from '../src/shared/network-state.ts';
import { Session } from '../src/client/session.ts';
const until = async (check: () => boolean, ms = 4000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw Error('Timed out waiting for network state');
    await new Promise((r) => setTimeout(r, 20));
  }
};
const options = () => ({
  mode: 'short',
  difficulty: 'normal',
  visibility: 'public',
  createKey: randomUUID(),
  protocolVersion: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  classId: 'soldier',
  name: 'Mara',
});
const register = (r: Room<WorldState>) => {
  r.onMessage('*', () => {});
  r.reconnection.enabled = false;
  return r;
};

test(
  'explicit ready handshake delivers private codes after client handlers attach and permits a real guest join',
  { timeout: 15000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const owner = new Session(endpoint),
      guest = new Session(endpoint);
    const opts = {
      name: 'Private host',
      classId: 'soldier' as const,
      mode: 'short' as const,
      difficulty: 'normal',
    };
    try {
      await owner.connect(opts, undefined, 'private');
      await until(
        () =>
          /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(owner.code) && owner.status === 'ui.ready',
      );
      await guest.connect(
        { ...opts, name: 'Private guest', classId: 'medic' },
        { code: owner.code },
      );
      await until(() => guest.code === owner.code && guest.view?.players.length === 2);
      assert.equal(guest.room!.roomId, owner.room!.roomId);
      assert.deepEqual(await (await fetch(endpoint + '/api/rooms')).json(), []);
    } finally {
      await Promise.allSettled([guest.close(), owner.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);

test(
  'real client supply state and capacity queue admit one slot, support cancellation and never reopen a closed session',
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const base = 'http://127.0.0.1:' + address.port;
    const owner = new Session(base),
      cancelled = new Session(base),
      guest = new Session(base);
    const fixtures: string[] = [];
    const opts = {
      name: 'Mara',
      classId: 'soldier' as const,
      mode: 'short' as const,
      difficulty: 'normal',
    };
    try {
      await owner.connect(opts);
      const healthIdentity = await (await fetch(base + '/api/health')).json();
      assert.equal(healthIdentity.protocolVersion, PROTOCOL);
      assert.equal(healthIdentity.practiceOnly, true);
      const metrics = await (await fetch(base + '/api/metrics')).json();
      assert.equal(metrics.protocolVersion, PROTOCOL);
      assert.equal(metrics.connections, 1);
      assert.equal(metrics.rooms, 1);
      assert.equal('roomId' in metrics, false);
      assert.equal('name' in metrics, false);
      await until(() => Boolean(owner.view?.players.length));
      const live = liveRooms.get(owner.room!.roomId)!,
        p = live.game.players.get(owner.id)!;
      p.coins = 300;
      const command = { id: 'supply-network', kind: 'supply', item: 'medkit' };
      owner.room!.send('purchase', command);
      owner.room!.send('purchase', command);
      await until(() => owner.view?.players[0]?.supplies[0]?.count === 1);
      assert.equal(p.coins, 210);
      assert.equal(p.supplies[0].count, 1);
      owner.start();
      await until(() => owner.view?.phase === 'combat');
      p.health = 10;
      p.invulnerableUntil = 1e9;
      owner.input({ ...idleInput(), sequence: 1, supply: 0 });
      await until(() => owner.view?.players[0]?.supplies[0]?.count === 0);
      assert.equal(p.health, 55);
      assert.equal(p.supplies[0].id, '');
      while (capacity.slots.size < capacity.limit) {
        const id = 'queue-fixture-' + fixtures.length;
        fixtures.push(id);
        capacity.reserve(id);
      }
      const statuses: string[] = [];
      cancelled.onStatus = (key) => statuses.push(key);
      const cancelledJoin = cancelled.connect(opts);
      const rejected = assert.rejects(cancelledJoin, /ui.errorCapacity/);
      await until(() => statuses.includes('ui.waitingCapacity'));
      assert.equal(cancelled.queuePosition, 1);
      await cancelled.close();
      await rejected;
      assert.equal(capacity.slots.size, capacity.limit);
      const admitted: string[] = [];
      guest.onStatus = (key) => admitted.push(key);
      const joining = guest.connect({ ...opts, name: 'Iona' });
      await until(() => admitted.includes('ui.waitingCapacity'));
      capacity.release(fixtures.pop()!);
      await joining;
      await until(() => Boolean(guest.view?.players.length));
      assert.equal(capacity.slots.size, capacity.limit);
      assert.equal(guest.room!.connection.isOpen, true);
      const health = await (await fetch(base + '/api/health')).json();
      assert.equal(health.capacity.offeredSlots, 0);
      assert.equal(health.protocolVersion, PROTOCOL);
    } finally {
      await Promise.allSettled([owner.close(), guest.close(), cancelled.close()]);
      for (const id of fixtures) capacity.release(id);
      await server.gracefullyShutdown(false);
    }
    assert.equal(capacity.slots.size, 0);
    assert.equal(capacity.rooms.size, 0);
  },
);

test('instance capacity reserves reconnect slots independently of room limits', () => {
  const c = new Capacity(2, 1);
  c.addRoom('a');
  assert.throws(() => c.addRoom('b'), /capacity/);
  c.reserve('1');
  c.reserve('1');
  c.reserve('2');
  assert.throws(() => c.reserve('3'), /capacity/);
  c.release('1');
  c.reserve('3');
  assert.equal(c.summary().reservedSlots, 2);
  for (const n of [NaN, 0, -1, 1.5, Infinity]) assert.throws(() => new Capacity(n));
});

test(
  'real WebSocket clients enforce visibility, versions, authority, idempotence and reconnection',
  { timeout: 20000 },
  async (t) => {
    const { server, httpServer } = createGameServer();
    const rooms: Room<WorldState>[] = [];
    const sessions: Session[] = [];
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const base = 'http://127.0.0.1:' + address.port,
      client = new Client(base);
    try {
      t.diagnostic('version rejection');
      await assert.rejects(
        client.create('grave', { ...options(), contentRevision: 'old' }),
        /versionMismatch/,
      );
      t.diagnostic('public room creation');
      const a = register(await client.create<WorldState>('grave', options(), WorldState));
      rooms.push(a);
      await until(() => Boolean(a.state.players.get(a.sessionId)));
      assert.equal(a.state.owner, a.sessionId);
      t.diagnostic('public guest joining');
      const b = register(
        await client.joinById<WorldState>(
          a.roomId,
          { ...options(), classId: 'medic', name: 'Iona' },
          WorldState,
        ),
      );
      rooms.push(b);
      await until(() => a.state.players.size === 2);
      const listed = (await (await fetch(base + '/api/rooms')).json()) as { roomId: string }[];
      assert(listed.some((r) => r.roomId === a.roomId));
      const live = liveRooms.get(a.roomId)!;
      b.send('start');
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(live.game.phase, 'lobby');
      const request = { id: 'dedup-network', kind: 'upgrade', item: 'damage' };
      let results = 0;
      b.onMessage('purchaseResult', (r) => {
        assert.equal(r.ok, true);
        results++;
      });
      b.send('purchase', request);
      b.send('purchase', request);
      await until(() => results === 2);
      assert.equal(live.game.players.get(b.sessionId)!.upgrades.damage, 1);
      a.send('start');
      await until(() => a.state.phase === 'combat');
      let personalWeaponSounds = 0,
        leakedWeaponSounds = 0;
      b.onMessage('events', (events: { type: string; id?: string; owner?: string }[]) => {
        personalWeaponSounds += events.filter(
          (e) => e.type === 'sound' && e.owner === b.sessionId && e.id?.startsWith('weapon-'),
        ).length;
      });
      a.onMessage('events', (events: { type: string; id?: string; owner?: string }[]) => {
        leakedWeaponSounds += events.filter(
          (e) => e.type === 'sound' && e.owner === b.sessionId && e.id?.startsWith('weapon-'),
        ).length;
      });
      b.send('input', { ...idleInput(), sequence: 1, moveX: 1, fire: true });
      b.send('input', { ...idleInput(), sequence: 2, moveX: 500 });
      await until(
        () =>
          live.telemetry.acceptedInputs >= 1 &&
          live.telemetry.rejectedInputs >= 1 &&
          live.game.players.get(b.sessionId)!.ack === 1,
      );
      assert.equal(live.game.players.get(b.sessionId)!.ack, 1);
      await until(() => personalWeaponSounds > 0);
      assert.equal(leakedWeaponSounds, 0);
      t.diagnostic('interrupted connection');
      const token = a.reconnectionToken,
        id = a.sessionId;
      a.connection.close(4001, 'test interrupted transport');
      await until(() => !live.game.players.get(id)!.connected);
      assert(capacity.slots.has(id));
      assert.equal(live.state.owner, b.sessionId);
      const restored = register(await client.reconnect<WorldState>(token, WorldState));
      rooms.push(restored);
      assert.equal(restored.sessionId, id);
      await until(() => live.game.players.get(id)!.connected);
      assert.equal(live.game.players.size, 2);
      t.diagnostic('private room creation');
      const privateOptions = { ...options(), visibility: 'private' };
      const secret = register(await client.create<WorldState>('grave', privateOptions, WorldState));
      rooms.push(secret);
      const secretLive = liveRooms.get(secret.roomId)!;
      assert.match(secretLive.privateCode, /^[A-Z2-9]{6}$/);
      const publicAfter = (await (await fetch(base + '/api/rooms')).json()) as { roomId: string }[];
      assert(!publicAfter.some((r) => r.roomId === secret.roomId));
      await assert.rejects(client.joinById(secret.roomId, options()), /invalidCode/);
      const resolved = (await (
        await fetch(base + '/api/rooms/code/' + secretLive.privateCode)
      ).json()) as { roomId: string };
      assert.equal(resolved.roomId, secret.roomId);
      const invited = register(
        await client.joinById<WorldState>(
          resolved.roomId,
          { ...options(), code: secretLive.privateCode },
          WorldState,
        ),
      );
      rooms.push(invited);
      await until(() => secretLive.game.players.size === 2);
      assert(secretLive.telemetry.encodedOutboundBytes > 0);
      await secret.leave();
      await until(() => secretLive.state.owner === invited.sessionId);
      t.diagnostic('client adapter recovers an early disconnect and closes during retry');
      const adapter = new Session(base);
      sessions.push(adapter);
      const statuses: string[] = [];
      adapter.onStatus = (key) => statuses.push(key);
      await adapter.connect({
        name: 'Adapter',
        classId: 'soldier',
        mode: 'short',
        difficulty: 'normal',
      });
      await until(() => Boolean(adapter.view?.players.some((p) => p.id === adapter.id)));
      const original = adapter.room!;
      original.connection.close(CloseCode.MAY_TRY_RECONNECT, 'early connection interruption');
      await until(() => adapter.room !== original && statuses.includes('ui.reconnected'));
      assert(statuses.includes('ui.reconnecting'));
      assert.equal(adapter.id, original.sessionId);
      adapter.room!.connection.close(CloseCode.MAY_TRY_RECONNECT, 'leave during reconnect');
      await until(() => adapter.status === 'ui.reconnecting');
      const closingAt = Date.now();
      await adapter.close();
      assert(Date.now() - closingAt < 500);
      await new Promise((r) => setTimeout(r, 350));
      assert(!adapter.room!.connection.isOpen);
    } finally {
      await Promise.allSettled(sessions.map((s) => s.close()));
      await Promise.allSettled(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
      await server.gracefullyShutdown(false);
    }
    assert.equal(capacity.slots.size, 0);
    assert.equal(capacity.rooms.size, 0);
  },
);
