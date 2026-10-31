import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { build } from 'esbuild';
import { Game, data } from '../src/shared/game.ts';
import { createPracticeGame } from '../src/shared/practice-start.ts';
import { implementedClassIds } from '../src/shared/protocol.ts';
import { practiceVariantLabels, practiceVariantMarkup } from '../src/client/ui/practice-variant.ts';
import { createGameServer } from '../src/server/index.ts';
import { Session } from '../src/client/session.ts';

test('local boss-form choice starts the real Normal or Brutal Constable on every map and class', () => {
  for (const classId of implementedClassIds)
    for (const map of data.arenas) {
      const settings = {
        seed: 491,
        mode: 'short' as const,
        difficulty: 'normal',
        openingBossId: 'constable' as const,
        openingArenaId: map.id,
      };
      const normal = createPracticeGame(settings, 'Mara', classId);
      const brutal = createPracticeGame(settings, 'Mara', classId, 'brutal');
      assert(normal.start() && brutal.start());
      assert.equal(normal.boss.variant, 'normal');
      assert.equal(brutal.boss.variant, 'brutal');
      assert.equal(brutal.boss.maxHealth, normal.boss.maxHealth * 2);
      assert.equal(brutal.boss.deadline, normal.boss.deadline * 1.5);
      assert.equal(normal.boss.threat, 1);
      assert.equal(brutal.boss.threat, 1);
      assert.equal(brutal.settings.difficulty, 'normal');
      assert.equal(brutal.arena.id, map.id);
      assert.equal(brutal.players.get('solo')!.classId, classId);
      assert.equal(brutal.settings.maxPlayers, 1);
    }
});

test('Practice form validates input, survives a boundary restore and applies only to the opener', () => {
  for (const invalid of [null, 'B', 'hellish', 1, {}, []])
    assert.throws(() => createPracticeGame({}, 'Mara', 'soldier', invalid));
  const game = createPracticeGame({ mode: 'endless', seed: 491 }, 'Mara', 'soldier', 'brutal');
  const saved = game.offlineCheckpoint()!;
  assert.equal(saved.selectedContract.variant, 'brutal');
  const restored = Game.restoreOffline(saved);
  assert(restored.start());
  assert.equal(restored.boss.variant, 'brutal');
  restored.boss.health = 0;
  restored.step();
  for (let n = 0; !restored.contractCards.length; n++) {
    assert(n < 1500);
    restored.step();
  }
  assert(restored.contractCards.every((c) => c.variant === 'normal'));
});

function receive(worker: Worker, check: (m: any) => boolean) {
  return new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => finish(Error('Offline worker response timed out')), 5000);
    const onMessage = (message: any) => {
      if (check(message)) finish(undefined, message);
    };
    const onError = (error: Error) => finish(error);
    function finish(error?: Error, value?: any) {
      clearTimeout(timeout);
      worker.off('message', onMessage);
      worker.off('error', onError);
      error ? reject(error) : resolve(value);
    }
    worker.on('message', onMessage);
    worker.on('error', onError);
  });
}
test(
  'actual offline worker honors the selected form and reports invalid init messages',
  { timeout: 20000 },
  async () => {
    const bundle = await build({
      entryPoints: ['src/client/offline.worker.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      logLevel: 'silent',
    });
    const shim = `import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=(m)=>parentPort.postMessage(m);`;
    const tail = `parentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});`;
    const url = new URL(
      'data:text/javascript;base64,' +
        Buffer.from(shim + bundle.outputFiles[0].text + '\n' + tail).toString('base64'),
    );
    for (const variant of ['normal', 'brutal', 'invalid']) {
      const worker = new Worker(url, { execArgv: [] });
      try {
        await receive(worker, (m) => m.type === 'ready');
        const initialized = receive(worker, (m) => m.type === 'view' || m.type === 'error');
        worker.postMessage({
          type: 'init',
          settings: { seed: 491, mode: 'short', difficulty: 'normal' },
          name: 'Mara',
          classId: 'soldier',
          practiceVariant: variant,
        });
        const initial = await initialized;
        if (variant === 'invalid') {
          assert.equal(initial.type, 'error');
          continue;
        }
        assert.equal(initial.view.phase, 'lobby');
        const started = receive(worker, (m) => m.type === 'view' && m.view.phase === 'combat');
        worker.postMessage({ type: 'start' });
        const { view } = await started;
        assert.equal(view.boss.variant, variant);
        assert.equal(view.boss.threat, 1);
        assert(Math.abs(view.boss.maxHealth - 1944 * (variant === 'brutal' ? 2 : 1)) < 1e-8);
      } finally {
        await worker.terminate();
      }
    }
  },
);

test(
  'online Session creation excludes the local Practice form and starts the normal authoritative contract',
  { timeout: 15000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const owner = new Session('http://127.0.0.1:' + address.port);
    const until = async (check: () => boolean) => {
      const end = Date.now() + 5000;
      while (!check()) {
        assert(Date.now() < end);
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    try {
      await owner.connect({
        name: 'Mara',
        classId: 'soldier',
        mode: 'short',
        difficulty: 'normal',
        openingBossId: 'constable',
        practiceVariant: 'brutal',
      });
      owner.start();
      await until(() => owner.view?.phase === 'combat');
      assert.equal(owner.view!.boss.variant, 'normal');
      assert(Math.abs(owner.view!.boss.maxHealth - 1944) < 1e-8);
    } finally {
      await owner.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test('boss-form controls have an explicit accessible label and first-boss scope in all fifteen locales', () => {
  assert.deepEqual(Object.keys(practiceVariantLabels).sort(), data.locales.map((l) => l.id).sort());
  for (const language of data.locales) {
    const html = practiceVariantMarkup(language.id, 'brutal', 'Standard form', 'Brutal');
    assert(
      html.includes('for="practice-variant"') &&
        html.includes('aria-describedby="practice-variant-help"'),
    );
    assert(html.includes('value="brutal" selected'));
    assert(!html.includes('value="normal" selected'));
    assert(
      practiceVariantLabels[language.id as keyof typeof practiceVariantLabels].every(
        (text) => text.length > 0,
      ),
    );
  }
});
