import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runLineworkWorker } from './helpers/heavy-linework-transport.ts';

test(
  'whole optimized Short worker earns the optional Yoke and exercises its actual primary/haul choice',
  { timeout: 300_000 },
  async () => {
    const bundle = await build({
      entryPoints: ['src/client/offline.worker.ts'],
      bundle: true,
      minify: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      define: { __GA_TESTING_BUILD__: 'true', 'import.meta.env.DEV': 'false' },
      logLevel: 'silent',
    });
    const result = await runLineworkWorker(bundle.outputFiles[0].text, 'yoke');
    assert.deepEqual(result.actualEarnedSequence, [3, 9]);
    assert.equal(result.spent, 5);
    assert(result.paidPrimaryProjectiles > 0 && result.wholeOptimizedWorker);
    console.log(JSON.stringify(result));
  },
);
