import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
import { CONTENT_REVISION } from '../src/shared/protocol.ts';
import { RECORD_RULES, RECORD_SEASON } from '../src/shared/team-records.ts';

const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
async function fixture(t: TestContext) {
  const env = menuEnvironment(t),
    requests: URL[] = [];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (input: string, init?: RequestInit) => {
      init?.signal?.throwIfAborted();
      const url = new URL(input);
      requests.push(url);
      const query = url.searchParams;
      return new Response(
        JSON.stringify({
          scope: 'server',
          persistent: true,
          contentRevision: CONTENT_REVISION,
          season: RECORD_SEASON,
          rules: RECORD_RULES,
          mode: query.get('mode'),
          difficulty: query.get('difficulty'),
          sizeBand: query.get('sizeBand'),
          total: 0,
          offset: 0,
          nextOffset: null,
          rows: [],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    },
  });
  t.after(() =>
    descriptor
      ? Object.defineProperty(globalThis, 'fetch', descriptor)
      : Reflect.deleteProperty(globalThis, 'fetch'),
  );
  const ui = await menuBundle(t, 'src/client/ui/leaderboards.ts');
  let backs = 0;
  const dispose = ui.mountLeaderboards(
    env.host,
    () => {
      backs++;
    },
    'http://records-fixture',
  );
  env.cleanup.push(dispose);
  const click = async (selector: string) => {
    env.host.querySelector(selector)!.click();
    await turn();
  };
  const change = async (selector: string, value: string) => {
    const input = env.host.querySelector(selector)!;
    input.value = value;
    input.dispatch('change');
    await turn();
  };
  return { ...env, requests, dispose, backs: () => backs, click, change };
}

test('device record filters retain the current keyboard editing focus', async (t) => {
  const f = await fixture(t);
  for (const [selector, value] of [
    ['#records-mode', 'raid'],
    ['#records-difficulty', 'hard'],
  ]) {
    f.host.querySelector(selector)!.focus();
    await f.change(selector, value);
    assert.equal(f.host.querySelector(selector)!.value, value);
    assert(
      f.document.activeElement === f.host.querySelector(selector),
      'Focus must remain on the live record filter',
    );
  }
});

test('switching record tabs focuses the current live tab', async (t) => {
  const f = await fixture(t);
  for (const selector of ['#records-online', '#records-local']) {
    f.host.querySelector(selector)!.focus();
    await f.click(selector);
    assert(
      f.document.activeElement === f.host.querySelector(selector),
      'Focus must move to the live record tab',
    );
    assert.equal(
      f.host.querySelector(selector)!.getAttribute('aria-pressed'),
      'true',
    );
  }
});

test('online records retain mode, difficulty, squad size and week when returning from device records', async (t) => {
  const f = await fixture(t);
  await f.click('#records-online');
  await f.change('[data-record-mode]', 'endless');
  await f.change('[data-record-difficulty]', 'insane');
  await f.change('[data-record-size]', '17-50');
  await f.click('[data-record-week]');
  await f.click('#records-local');
  await f.click('#records-online');
  assert.equal(f.host.querySelector('[data-record-mode]')!.value, 'endless');
  assert.equal(
    f.host.querySelector('[data-record-difficulty]')!.value,
    'insane',
  );
  assert.equal(f.host.querySelector('[data-record-size]')!.value, '17-50');
  assert.equal(
    f.host.querySelector('[data-record-week]')!.getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(
    f.host.querySelector('[data-record-all]')!.getAttribute('aria-pressed'),
    'false',
  );
  const query = f.requests.at(-1)!.searchParams;
  assert.equal(query.get('mode'), 'endless');
  assert.equal(query.get('difficulty'), 'insane');
  assert.equal(query.get('sizeBand'), '17-50');
  assert(query.has('week'));
});

test('device and online record filters keep their separate choices', async (t) => {
  const f = await fixture(t);
  await f.change('#records-mode', 'raid');
  await f.change('#records-difficulty', 'easy');
  await f.click('#records-online');
  await f.change('[data-record-mode]', 'endless');
  await f.change('[data-record-difficulty]', 'hard');
  await f.click('#records-local');
  assert.equal(f.host.querySelector('#records-mode')!.value, 'raid');
  assert.equal(f.host.querySelector('#records-difficulty')!.value, 'easy');
  await f.change('#records-mode', 'long');
  await f.click('#records-online');
  assert.equal(f.host.querySelector('[data-record-mode]')!.value, 'endless');
  assert.equal(f.host.querySelector('[data-record-difficulty]')!.value, 'hard');
});

test('a smaller mode keeps the corrected squad size and time period on return', async (t) => {
  const f = await fixture(t);
  await f.click('#records-online');
  await f.change('[data-record-mode]', 'endless');
  await f.change('[data-record-size]', '17-50');
  await f.click('[data-record-week]');
  await f.change('[data-record-mode]', 'short');
  assert.equal(f.host.querySelector('[data-record-size]')!.value, 'solo');
  await f.click('#records-local');
  await f.click('#records-online');
  assert.equal(f.host.querySelector('[data-record-mode]')!.value, 'short');
  assert.equal(f.host.querySelector('[data-record-size]')!.value, 'solo');
  assert.equal(
    f.host.querySelector('[data-record-week]')!.getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(f.requests.at(-1)!.searchParams.get('sizeBand'), 'solo');
  assert(f.requests.at(-1)!.searchParams.has('week'));
});

test('disposed record controls cannot navigate back or start a new board request', async (t) => {
  const f = await fixture(t),
    back = f.host.querySelector('#records-back')!,
    online = f.host.querySelector('#records-online')!;
  f.dispose();
  back.click();
  online.click();
  await turn();
  assert.equal(f.backs(), 0);
  assert.equal(f.requests.length, 0);
});

test('detached record filters and tabs cannot replace the live online view', async (t) => {
  const f = await fixture(t),
    oldMode = f.host.querySelector('#records-mode')!,
    oldLocal = f.host.querySelector('#records-local')!;
  await f.click('#records-online');
  await f.change('[data-record-mode]', 'endless');
  const requests = f.requests.length;
  oldMode.value = 'long';
  oldMode.dispatch('change');
  oldLocal.click();
  await turn();
  assert(f.host.querySelector('[data-record-mode]'));
  assert.equal(f.host.querySelector('[data-record-mode]')!.value, 'endless');
  assert.equal(f.requests.length, requests);
});
