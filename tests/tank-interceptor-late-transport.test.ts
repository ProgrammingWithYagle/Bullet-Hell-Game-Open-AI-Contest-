import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createGameServer } from '../src/server/index.ts';
import { runInterceptionPeers, runInterceptionWorker } from './helpers/tank-interceptor-transport.ts';

test('the optimized Solo worker earns Return Crossing and reverses the same paid screen', { timeout: 430_000 }, async () => {
  const worker = await build({
    entryPoints: ['src/client/offline.worker.ts'], bundle: true, minify: true, write: false, platform: 'browser',
    format: 'esm', define: { __GA_TESTING_BUILD__: 'false', 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  const result=await runInterceptionWorker(worker.outputFiles[0].text,'returning');
  assert(result.passed && result.pausedCommandsDiscarded);
  assert.deepEqual(result.actualEarnedSequence,[3,9,15,21]);
  assert.equal(result.spent,8);
  assert.equal(result.later.adjusted?.id,result.later.physical.id);
  assert.equal(result.later.adjusted?.until,result.later.physical.until);
  console.log(JSON.stringify(result));
});

test('a real non-host Tank earns Offset Brace and holds a shared off-center screen', { timeout: 430_000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0,'127.0.0.1');
  const endpoint=httpServer.address();
  assert(endpoint&&typeof endpoint==='object');
  try {
    const result=await runInterceptionPeers('http://127.0.0.1:'+endpoint.port,'offset');
    assert(result.passed && result.tankIsNonHost && result.ownerPrivateSounds && result.sharedPhysicalScreen);
    assert.deepEqual(result.actualEarnedSequence,[3,9,15,21]);
    assert.equal(result.spent,8);
    assert.equal(result.later.physical.halfSpan,44);
    assert(result.later.actualDistance<1);
    console.log(JSON.stringify(result));
  } finally {
    await server.gracefullyShutdown(false);
  }
});
