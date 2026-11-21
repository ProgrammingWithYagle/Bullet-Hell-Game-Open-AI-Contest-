import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/index.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';

test('a non-host Medic receives their owned Field Dressing state while the host sees the purchase alone', { timeout: 20_000 }, async () => {
  const { server, httpServer } = createGameServer({ audience: 'public' });
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), medic = new Session(endpoint);
  const options = { mode: 'short', difficulty: 'normal', maxPlayers: 2 } as const;
  const wait = async (condition: () => boolean, operation: string) => {
    const end = Date.now() + 5_000;
    while (!condition()) {
      assert(Date.now() < end, operation);
      await sleep(18);
    }
  };
  const viewer = (session: Session) => session.view?.players.find(p => p.id === medic.id);
  try {
    await host.connect({ ...options, name: 'Mara', classId: 'soldier' });
    await medic.connect({ ...options, name: 'Iona', classId: 'medic' }, { roomId: host.room!.roomId });
    await wait(() => !!viewer(host) && !!viewer(medic), 'Both clients acknowledge the ordinary lobby');
    assert.equal(medic.view!.owner, host.id);
    assert.notEqual(medic.id, host.id);
    const results: { ok: boolean }[] = [];
    medic.onPurchase = result => results.push(result);
    for (const item of ['medic-triage-1', fieldSurgeryIds.entry]) {
      const index = results.length;
      medic.purchase({ kind: 'skill', item });
      await wait(() => results.length > index && !!viewer(host)?.skills.includes(item) && !!viewer(medic)?.skills.includes(item), 'Both clients see the issued purchase');
      assert(results[index].ok);
    }
    const owned = () => viewer(medic)?.kit.fieldDressing;
    await wait(() => owned() !== undefined, 'Medic sees owner-filtered acquisition state');
    assert.deepEqual(owned(), { phase: 'idle', ready: false });
    assert.equal(viewer(host)?.kit.fieldDressing, undefined);
    assert(!host.room!.state.players.get(medic.id)!.lineworkOwner);
    assert.equal(JSON.parse(medic.room!.state.players.get(medic.id)!.lineworkOwner).fieldDressing.phase, 'idle');
  } finally {
    await Promise.all([medic.close(), host.close()]);
    await server.gracefullyShutdown(false);
  }
});
