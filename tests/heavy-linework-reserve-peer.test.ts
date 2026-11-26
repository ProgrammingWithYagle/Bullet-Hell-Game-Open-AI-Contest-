import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { runLineworkPeers } from './helpers/heavy-linework-transport.ts';

test(
  'real non-host Heavy earns the reserve and uses Open Sheave after private selection',
  { timeout: 300_000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    try {
      const result = await runLineworkPeers('http://127.0.0.1:' + address.port, 'sheave', true);
      assert.deepEqual(result.actualEarnedSequence, [3, 9, 15]);
      assert.equal(result.actualClears, 2);
      assert.equal(result.spent, 8);
      assert(
        result.reserve?.pausedSelectionDiscarded &&
          result.payout > 2 &&
          result.ownerPrivateAnchorAndRemovals &&
          result.sharedPhysicalContact,
      );
      console.log(JSON.stringify(result));
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
