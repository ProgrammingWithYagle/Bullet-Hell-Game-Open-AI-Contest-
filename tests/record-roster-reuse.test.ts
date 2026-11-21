import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
import { CONTENT_REVISION } from '../src/shared/protocol.ts';
import {
  RECORD_RULES,
  RECORD_SEASON,
  type RankedTeamRecord,
} from '../src/shared/team-records.ts';
import { mondayUTC } from '../src/client/team-records.ts';
const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
async function until(check: () => boolean) {
  const end = Date.now() + 3000;
  while (!check()) {
    assert(Date.now() < end, 'Roster UI timed out');
    await pause();
  }
}
async function fixture(
  t: TestContext,
  endedAt = Date.now(),
  failPrefetch = false,
  options: { far?: boolean; wrongOwnDifficulty?: boolean } = {},
) {
  const env = menuEnvironment(t),
    offsets: number[] = [];
  const own: RankedTeamRecord = {
    runId: randomUUID(),
    rank: options.far ? 61 : 11,
    score: 0,
    mode: 'endless',
    difficulty: 'normal',
    contentRevision: CONTENT_REVISION,
    rules: RECORD_RULES,
    season: RECORD_SEASON,
    peakPlayers: 50,
    sizeBand: '17-50',
    clears: 3,
    combatTicks: 400,
    lastClearTicks: 300,
    deadlineTicks: 600,
    damageMilli: 0,
    healthMilli: 100000,
    lastClearDamageMilli: 0,
    lastClearHealthMilli: 100000,
    survivors: 50,
    rosterCount: 51,
    endedAt,
    secretCleared: false,
  };
  const others = Array.from({ length: options.far ? 60 : 10 }, (_, i) => ({
    ...own,
    runId: randomUUID(),
    rank: i + 1,
    clears: 4,
  }));
  const participants = Array.from({ length: 51 }, (_, i) => ({
    id: randomUUID(),
    name: 'QA member ' + (i + 1),
    classId: 'soldier',
    firstEncounter: 1,
    lastEncounter: 3,
    encounters: 3,
    survived: i < 50,
  }));
  if (options.wrongOwnDifficulty) own.difficulty = 'hard';
  const board = [...others, own];
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    const url = new URL(request.url!, 'http://fixture');
    if (url.pathname === '/api/leaderboards') {
      const offset = Number(url.searchParams.get('offset')),
        limit = Number(url.searchParams.get('limit')),
        week = url.searchParams.has('week'),
        included = !week || endedAt >= Date.parse(mondayUTC() + 'T00:00:00Z');
      response.end(
        JSON.stringify({
          scope: 'server',
          persistent: false,
          contentRevision: CONTENT_REVISION,
          season: RECORD_SEASON,
          rules: RECORD_RULES,
          mode: 'endless',
          difficulty: 'normal',
          sizeBand: '17-50',
          total: included ? board.length : 0,
          offset,
          nextOffset:
            included && offset + limit < board.length ? offset + limit : null,
          rows: !included ? [] : board.slice(offset, offset + limit),
        }),
      );
      return;
    }
    if (url.pathname !== '/api/leaderboards/' + own.runId) {
      response.writeHead(404).end('{}');
      return;
    }
    const offset = Number(url.searchParams.get('offset'));
    offsets.push(offset);
    if (failPrefetch && offsets.length === 1) {
      response.writeHead(503).end('{}');
      return;
    }
    response.end(
      JSON.stringify({
        record: own,
        participants: participants.slice(offset, offset + 50),
        offset,
        nextOffset: offset === 0 ? 50 : null,
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const endpoint = 'http://127.0.0.1:' + address.port,
    ui = await menuBundle(t, 'src/client/ui/team-records.ts');
  const dispose = ui.mountTeamRecords(env.host, endpoint, 'endless', 'normal', {
    endpoint,
    mode: 'endless',
    difficulty: 'normal',
    sizeBand: '17-50',
    runId: own.runId,
  });
  env.cleanup.push(dispose);
  const details = () =>
    env.host.querySelector('[data-team-run="' + own.runId + '"]')!;
  const open = async () => {
    const d = details();
    d.open = true;
    d.dispatch('toggle');
    await until(() => d.querySelectorAll('li').length === 50);
    return d;
  };
  await until(() => env.host.getAttribute('aria-busy') === 'false');
  return { ...env, offsets, own, details, open, dispose };
}

test(
  'opening an own result reuses its downloaded first roster page and loads all fifty-one members once',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t);
    assert.deepEqual(f.offsets, [0]);
    const d = await f.open();
    assert.deepEqual(f.offsets, [0]);
    d.querySelector('.team-roster button')!.click();
    await until(() => d.querySelectorAll('li').length === 51);
    assert.deepEqual(f.offsets, [0, 50]);
    d.open = false;
    d.dispatch('toggle');
    d.open = true;
    d.dispatch('toggle');
    await pause();
    assert.deepEqual(f.offsets, [0, 50]);
  },
);

test(
  'roster reuse ends with the filter generation and cannot show an old result in this week',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t, Date.parse(mondayUTC() + 'T00:00:00Z') - 1);
    await f.open();
    f.host.querySelector('[data-record-week]')!.click();
    await until(() => f.host.getAttribute('aria-busy') === 'false');
    assert.equal(
      f.host.querySelector('[data-team-run="' + f.own.runId + '"]'),
      null,
    );
    f.host.querySelector('[data-record-all]')!.click();
    await until(
      () =>
        !!f.host.querySelector('[data-team-run="' + f.own.runId + '"]') &&
        f.host.getAttribute('aria-busy') === 'false',
    );
    await f.open();
    assert.deepEqual(f.offsets, [0, 0, 0]);
  },
);

test(
  'a failed own-result prefetch is retried normally when its row arrives through pagination',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t, Date.now(), true);
    assert.deepEqual(f.offsets, [0]);
    assert.equal(f.details(), null);
    f.host.querySelector('[data-record-more]')!.click();
    await until(
      () => !!f.details() && f.host.getAttribute('aria-busy') === 'false',
    );
    await f.open();
    assert.deepEqual(f.offsets, [0, 0]);
  },
);

test(
  'a recent shortcut from a different difficulty cannot appear in the selected board',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t, Date.now(), false, { wrongOwnDifficulty: true });
    assert.deepEqual(f.offsets, [0]);
    assert.equal(f.details(), null);
    assert.equal(f.host.querySelectorAll('[data-team-run]').length, 10);
  },
);

test(
  'an own result beyond two board pages stays a single row without repeated roster lookups',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t, Date.now(), false, { far: true });
    for (let i = 0; i < 3; i++) {
      f.host.querySelector('[data-record-more]')!.click();
      await until(() => f.host.getAttribute('aria-busy') === 'false');
      assert.equal(
        f.host.querySelectorAll('[data-team-run="' + f.own.runId + '"]').length,
        1,
      );
    }
    assert.equal(f.host.querySelectorAll('[data-team-run]').length, 61);
    assert.deepEqual(f.offsets, [0]);
    await f.open();
    assert.deepEqual(f.offsets, [0]);
  },
);
