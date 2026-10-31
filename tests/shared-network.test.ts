import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/service.ts';
import { Session } from '../src/client/session.ts';
import { liveRooms, roomCodes } from '../src/server/GraveRoom.ts';
import { capacity } from '../src/server/capacity.ts';
import { TeamRecordStore } from '../src/server/team-record-store.ts';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, 'Shared-network state timed out');
    await delay(10);
  }
}
async function fixture(t: TestContext, records = false) {
  const store = records ? new TeamRecordStore(':memory:') : undefined,
    { server, httpServer } = createGameServer({
      audience: 'public',
      records: store,
    });
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port,
    peers: Session[] = [];
  t.after(async () => {
    await Promise.allSettled(peers.map((p) => p.close()));
    await server.gracefullyShutdown(false);
    store?.close();
    assert.equal(capacity.slots.size, 0);
    assert.equal(capacity.rooms.size, 0);
  });
  const peer = () => {
    const s = new Session(endpoint);
    peers.push(s);
    return s;
  };
  const room = async (mode: 'endless' | 'raid' = 'endless') => {
    const owner = peer();
    await owner.connect(
      {
        name: 'QA host',
        classId: 'soldier',
        mode,
        difficulty: 'baby',
        openingArenaId: 'gatehouse',
        arenaSelection: 'fixed',
      },
      undefined,
      'private',
      'QA-only password',
    );
    await until(() => !!owner.code);
    return owner;
  };
  const join = async (owner: Session, index: number) => {
    const guest = peer(),
      found = await guest.lookupRoom(owner.code);
    await guest.connect(
      {
        name: 'QA guest ' + index,
        classId: 'medic',
        mode: 'endless',
        difficulty: 'baby',
      },
      { roomId: found.roomId, code: owner.code, password: 'QA-only password' },
    );
    return guest;
  };
  const request = (path: string, init?: RequestInit) =>
    fetch(endpoint + path, { ...init, signal: AbortSignal.timeout(5000) });
  return { endpoint, peers, peer, room, join, request };
}

test(
  'fifty real peers can join a private room by code from one IP and wait for the host',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t),
      owner = await f.room();
    for (let i = 1; i < 50; i++) await f.join(owner, i);
    await until(
      () =>
        owner.view?.players.length === 50 &&
        f.peers.every((p) => p.view?.players.length === 50),
    );
    assert.equal(liveRooms.get(owner.room!.roomId)!.clients.length, 50);
    assert.equal(owner.view!.phase, 'lobby');
    owner.start();
    await until(() => f.peers.every((p) => p.view?.phase === 'combat'));
    assert.equal(capacity.slots.size, 50);
  },
);

test(
  'a shared group can leave a sixteen-player lobby and rejoin a fifty-player lobby within one minute',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t),
      first = await f.room('raid');
    for (let i = 1; i < 16; i++) await f.join(first, i);
    await Promise.all(f.peers.map((p) => p.close()));
    await until(() => capacity.slots.size === 0 && liveRooms.size === 0);
    const second = await f.room();
    for (let i = 1; i < 50; i++) await f.join(second, i);
    await until(() => second.view?.players.length === 50);
    assert.equal(second.view!.phase, 'lobby');
    assert.equal(capacity.slots.size, 50);
  },
);

test(
  'failed room-code guesses remain limited without locking out a known valid code',
  { timeout: 15000 },
  async (t) => {
    const f = await fixture(t),
      owner = await f.room(),
      missing = roomCodes.has('AAAAAA') ? 'BBBBBB' : 'AAAAAA';
    for (let i = 0; i < 30; i++) {
      const r = await f.request('/api/rooms/code/' + missing);
      assert.equal(r.status, 404);
      await r.arrayBuffer();
    }
    const blocked = await f.request('/api/rooms/code/' + missing);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '60');
    await blocked.arrayBuffer();
    const valid = await f.request(
      '/api/rooms/code/' + owner.code.toLowerCase(),
    );
    assert.equal(valid.status, 200);
    const value = await valid.json();
    assert.deepEqual(Object.keys(value).sort(), ['hasPassword', 'roomId']);
    assert.equal(value.roomId, owner.room!.roomId);
    assert.equal(value.hasPassword, true);
  },
);

test(
  'known room-code lookups have a bounded shared-network budget and cannot be reset with forwarded headers',
  { timeout: 15000 },
  async (t) => {
    const f = await fixture(t),
      owner = await f.room();
    for (let i = 0; i < 120; i++) {
      const r = await f.request('/api/rooms/code/' + owner.code);
      assert.equal(r.status, 200, 'Known-code request ' + (i + 1));
      await r.arrayBuffer();
    }
    const blocked = await f.request('/api/rooms/code/' + owner.code, {
      headers: { 'X-Forwarded-For': '203.0.113.7' },
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '60');
    await blocked.arrayBuffer();
    const missing = roomCodes.has('AAAAAA') ? 'BBBBBB' : 'AAAAAA',
      invalid = await f.request('/api/rooms/code/' + missing);
    assert.equal(invalid.status, 404);
    await invalid.arrayBuffer();
  },
);

test(
  'admission allows two full join attempts per group while remaining bounded after tickets are cancelled',
  { timeout: 15000 },
  async (t) => {
    const f = await fixture(t);
    for (let i = 0; i < 120; i++) {
      const r = await f.request('/api/admission/join', { method: 'POST' });
      assert.equal(r.status, 200, 'Admission ' + (i + 1));
      const ticket = await r.json();
      const cancelled = await f.request('/api/admission/' + ticket.id, {
        method: 'DELETE',
      });
      assert.equal(cancelled.status, 204);
    }
    const blocked = await f.request('/api/admission/join', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.8' },
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '60');
    await blocked.arrayBuffer();
    assert.equal(capacity.summary().offeredSlots, 0);
    assert.equal(capacity.summary().queued, 0);
  },
);

test(
  'records reads allow a full group to browse results and roster pages while retaining a shared-IP limit',
  { timeout: 15000 },
  async (t) => {
    const f = await fixture(t, true),
      path = '/api/leaderboards?mode=endless&difficulty=normal&sizeBand=17-50';
    for (let i = 0; i < 360; i++) {
      const r = await f.request(path);
      assert.equal(r.status, 200, 'Records read ' + (i + 1));
      const page = await r.json();
      assert.equal(page.total, 0);
    }
    const blocked = await f.request(path, {
      headers: { 'X-Forwarded-For': '203.0.113.9' },
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '60');
    await blocked.arrayBuffer();
  },
);
