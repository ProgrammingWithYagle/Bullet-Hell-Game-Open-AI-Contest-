import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runLineworkWorker } from './helpers/heavy-linework-transport.ts';

test(
  'whole optimized public Short worker earns 15 SP and hauls both legs of Corner Guide with Straight Yoke',
  { timeout: 300_000 },
  async () => {
    const bundle = await build({
      entryPoints: ['src/client/offline.worker.ts'],
      bundle: true,
      minify: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      define: { __GA_TESTING_BUILD__: 'false', 'import.meta.env.DEV': 'false' },
      logLevel: 'silent',
    });
    const result = await runLineworkWorker(bundle.outputFiles[0].text, 'yoke', 'guide');
    assert.deepEqual(result.actualEarnedSequence, [3, 9, 15]);
    assert.equal(result.actualClears, 2);
    assert.equal(result.spent, 8);
    assert(
      result.guide &&
        result.guide.firstHaul > 45 &&
        result.guide.towardOriginal > 8 &&
        result.guide.paidGuideRounds === 1 &&
        result.paidPrimaryProjectiles > 0,
    );
    console.log(JSON.stringify(result));
  },
);
