import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createGameServer } from '../src/server/index.ts';
import { runBastionPeers, runBastionWorker } from './helpers/tank-bastion-transport.ts';

test('whole optimized Solo worker earns Split Watch at 9 SP and claims one physical half', { timeout: 300_000 }, async () => {
  const output = await build({
    entryPoints: ['src/client/offline.worker.ts'], bundle: true, minify: true, write: false, platform: 'browser',
    format: 'esm', define: { __GA_TESTING_BUILD__: 'false', 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  const result = await runBastionWorker(output.outputFiles[0].text, 'split');
  assert(result.passed && result.pausedCommandsDiscarded);
  assert.deepEqual(result.actualEarnedSequence, [3, 9]);
  assert.equal(result.spent, 5);
  assert.equal(result.claimant, 'tank');
  console.log(JSON.stringify(result));
});

test('real non-host Tank earns Corner Post and an ally claims its perpendicular entrance', { timeout: 300_000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  try {
    const result = await runBastionPeers('http://127.0.0.1:' + address.port, 'corner');
    assert(result.passed && result.ownerPrivate && result.pausedCommandsDiscarded && result.tankIsNonHost);
    assert.deepEqual(result.actualEarnedSequence, [3, 9]);
    assert.equal(result.spent, 5);
    assert.equal(result.claimant, 'soldier');
    console.log(JSON.stringify(result));
  } finally {
    await server.gracefullyShutdown(false);
  }
});
