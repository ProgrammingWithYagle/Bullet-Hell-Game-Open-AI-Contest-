import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/index.ts';
import { mageBindingIds } from '../src/shared/mage-pivot-sigil.ts';

test('A joined Mage receives private Binding commands and the host sees the public purchase', { timeout: 20_000 }, async () => {
  const { server, httpServer } = createGameServer({ audience: 'public' });
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), mage = new Session(endpoint);
  const options = { mode: 'short', difficulty: 'normal', maxPlayers: 2 } as const;
  const player = (session: Session) => session.view?.players.find(p => p.id === mage.id);
  async function wait(condition: () => boolean, detail: string) {
    const end = Date.now() + 5_000;
    while (!condition()) {
      assert(Date.now() < end, detail);
      await sleep(18);
    }
  }
  try {
    await host.connect({ ...options, name: 'Mara', classId: 'soldier' });
    await mage.connect({ ...options, name: 'Sable', classId: 'mage' }, { roomId: host.room!.roomId });
    await wait(() => !!player(host) && !!player(mage), 'Both clients acknowledge the ordinary lobby');
    assert.equal(mage.view!.owner, host.id);
    assert.notEqual(mage.id, host.id);
    const receipts: { ok: boolean }[] = [];
    mage.onPurchase = receipt => receipts.push(receipt);
    for (const item of ['mage-control-1', mageBindingIds.entry]) {
      const index = receipts.length;
      mage.purchase({ kind: 'skill', item });
      await wait(() => !!receipts[index] && !!player(host)?.skills.includes(item) && !!player(mage)?.skills.includes(item),
        'Both clients see the issued purchase');
      assert(receipts[index].ok);
    }
    await wait(() => player(mage)?.kit.pivotSigil !== undefined, 'Mage receives the join-time owner view');
    assert.deepEqual(player(mage)?.kit.pivotSigil, { phase: 'idle', ready: false });
    assert.equal(player(host)?.kit.pivotSigil, undefined);
    assert(!host.room!.state.players.get(mage.id)!.lineworkOwner);
  } finally {
    await Promise.all([mage.close(), host.close()]);
    await server.gracefullyShutdown(false);
  }
});
