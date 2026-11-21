import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createGameServer } from '../src/server/index.ts';
import { runBulwarkPeers, runBulwarkWorker } from './helpers/tank-bulwark-transport.ts';

test('the optimized Solo worker earns Folded Setdown at 21 SP and leaves real narrow cover', { timeout: 430_000 }, async () => {
  const output = await build({
    entryPoints: ['src/client/offline.worker.ts'], bundle: true, minify: true, write: false, platform: 'browser',
    format: 'esm', define: { __GA_TESTING_BUILD__: 'false', 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  const result = await runBulwarkWorker(output.outputFiles[0].text, 'folded');
  assert(result.passed && result.pausedCommandsDiscarded);
  assert.deepEqual(result.actualEarnedSequence, [3, 9, 15, 21]);
  assert.equal(result.spent, 8);
  assert.equal(result.paidAfterFold, 1);
  console.log(JSON.stringify(result));
});

test('the non-host Tank earns Side Port at 21 SP, shifts its actual slit and pays for primary fire', { timeout: 430_000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  try {
    const result = await runBulwarkPeers('http://127.0.0.1:' + address.port, 'side');
    assert(result.passed && result.ownerPrivateHandlingAndPublicPanels && result.pausedCommandsDiscarded);
    assert.deepEqual(result.actualEarnedSequence, [3, 9, 15, 21]);
    assert.equal(result.spent, 8);
    assert.equal(result.paidPortRounds, 2);
    assert(Math.abs(result.shiftedOffset) > 14);
    console.log(JSON.stringify(result));
  } finally {
    await server.gracefullyShutdown(false);
  }
});
