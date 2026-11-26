import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/shared/game.ts';
import { heavyLineworkRules, lineworkIds } from '../src/shared/heavy-linework.ts';
import { idleInput, type InputFrame, type Shot, type Vec } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';
import { lineworkRenderPlan } from '../src/client/heavy-linework-presentation.ts';
import { heavyActions } from '../src/client/heavy-actions.ts';
import { lineworkMenu } from './helpers/heavy-linework-menu-flow.ts';

const evidence = JSON.parse(
  readFileSync(
    new URL('../reviews/heavy-lineworker-entry-2026-11-12/reserve-geometry.json', import.meta.url),
    'utf8',
  ),
);
type Fitting = 'bare' | 'yoke' | 'sheave';
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

function fixture(fitting: Fitting = 'bare', hard = false, owned = true) {
  const arena = hard ? 'ossuary-works' : 'gatehouse',
    difficulty = hard ? 'hellish' : 'baby';
  const sample = evidence.rows.find(
    (row: any) => row.arena === arena && row.difficulty === difficulty,
  );
  assert(sample?.passed && sample.attempts.at(-1).walked === 0);
  const g = new Game({
    mode: 'short',
    seed: 41,
    maxPlayers: 1,
    openingArenaId: arena,
    arenaSelection: 'fixed',
    difficulty,
  });
  const p = g.addPlayer('solo', 'Reserve Anchor regression', 'heavy');
  assert.equal(p.totalSp, 3);
  const buy = (item: string) =>
    g.transact(p.id, { kind: 'skill', id: 'reserve-fixture-' + item, item });
  assert(buy('heavy-ordnance-1').ok && buy(lineworkIds.entry).ok);
  // The authority fixture isolates the purchased operation at the legal second-clear budget.
  p.totalSp = 15;
  if (fitting !== 'bare') assert(buy(lineworkIds[fitting]).ok);
  if (owned) assert(buy(lineworkIds.reserve).ok);
  assert(g.start());
  const shots: Shot[] = [];
  let sequence = 0;
  const step = (props: Partial<InputFrame> = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        ...props,
        sequence: ++sequence,
        clientTick: g.combatTick,
      }),
    );
    g.step();
    const events = g.drainEvents();
    for (const event of events)
      if (event.type === 'shots') shots.push(...event.shots.filter((shot) => shot.owner === p.id));
    return events;
  };
  const status = () => g.kitStatus(p.id),
    line = () => status().lineworkConnection;
  const ammo = p.ammo;
  step({ aim: sample.selected.a.aim, technique1: true });
  for (let tick = 0; !line() && tick < heavyLineworkRules.flightTicks; tick++) step();
  const first = line();
  assert(first);
  assert.equal(p.ammo, ammo - 1);
  const recovery = status().lineworkRecovery;
  const castReserve = (extra: Partial<InputFrame> = {}) =>
    step({ aim: sample.selected.b.aim, technique3: true, ...extra });
  const attachReserve = () => {
    castReserve();
    for (let tick = 0; !line()?.reserve && tick < heavyLineworkRules.flightTicks; tick++) step();
    const alternate = line()?.reserve;
    assert(alternate, 'A separately paid shot attaches to actual masonry');
    return alternate;
  };
  return { g, p, step, status, line, ammo, first, recovery, shots, castReserve, attachReserve };
}

for (const fitting of ['bare', 'yoke', 'sheave'] as const) {
  test(`${fitting} pays and selects a real reserve, then needs a separate haul with the original clock`, () => {
    const f = fixture(fitting),
      alternate = f.attachReserve();
    assert.equal(f.p.ammo, f.ammo - 2);
    assert.equal(f.shots.length, 2);
    assert(f.shots.every((shot) => shot.visual === 'heavy-anchor' && shot.damage === 0));
    assert.notEqual(f.shots[0].id, f.shots[1].id);
    assert.equal(alternate.until, f.first.until);
    assert(distance(alternate.origin, f.first.origin) >= 100);
    assert.deepEqual(f.line()!.origin, f.first.origin);
    const events = f.step({ technique3: true, technique2: true });
    assert(
      events.some((event) => event.type === 'sound' && event.id === 'linework-reserve-select'),
    );
    assert.deepEqual(f.line()!.origin, alternate.origin);
    assert(f.line()!.reserveSelected && !f.line()!.active && !f.line()!.reserve);
    const start = { x: f.p.x, y: f.p.y };
    f.step({ technique2: true });
    for (let tick = 0; tick < 8; tick++) f.step();
    assert(distance(start, alternate.origin) - distance(f.p, alternate.origin) > 25);
    assert.equal(f.line()!.mode, fitting);
    assert.equal(f.line()!.until, f.first.until);
    assert.equal(f.status().lineworkRecovery, f.recovery);
    assert.equal(f.p.ammo, f.ammo - 2);
    f.step({ technique1: true });
    assert(!f.line());
    assert.equal(f.status().lineworkRecovery, f.recovery);
  });
}

test('ordinary Hellish Ossuary supports a real alternate attachment within its bounds', () => {
  const f = fixture('bare', true),
    alternate = f.attachReserve();
  assert(alternate.origin.y < f.g.arena.bounds.y + f.g.arena.bounds.height);
  f.step({ technique3: true });
  assert(f.line()?.reserveSelected);
  assert.equal(f.line()!.until, f.first.until);
});

test('unowned, active and empty-magazine reserve commands retain the first connection and payment', () => {
  const unowned = fixture('bare', false, false);
  unowned.castReserve();
  assert(!unowned.line()!.active && !unowned.line()!.reserveSpent);
  assert.equal(unowned.p.ammo, unowned.ammo - 1);
  const active = fixture();
  active.step({ technique2: true });
  active.castReserve();
  assert(active.line()!.active && !active.line()!.reserveSpent);
  assert.equal(active.p.ammo, active.ammo - 1);
  const empty = fixture();
  empty.p.ammo = 0;
  empty.castReserve();
  assert(!empty.line()!.reserveSpent);
  assert.equal(empty.line()!.until, empty.first.until);
  assert.equal(empty.status().lineworkRecovery, empty.recovery);
});

test('the paid reserve flight admits one shot and C clears it without a refund', () => {
  const f = fixture();
  f.castReserve({ fire: true });
  const id = f.line()?.reserveFlight;
  assert(id && f.g.shots.has(id));
  assert.equal(f.shots.length, 2, 'Paid reserve suppresses same-tick primary');
  f.castReserve();
  assert.equal(f.line()!.reserveFlight, id);
  assert.equal(f.p.ammo, f.ammo - 2);
  f.step({ technique1: true, technique3: true });
  assert(!f.line() && !f.g.shots.has(id));
  assert.equal(f.p.ammo, f.ammo - 2);
  assert.equal(f.status().lineworkRecovery, f.recovery);
});

test('used and unused reserve ownership have separate loss consequences', () => {
  for (const selected of [false, true]) {
    const f = fixture();
    f.attachReserve();
    if (selected) f.step({ technique3: true });
    f.p.skills = f.p.skills.filter((id) => id !== lineworkIds.reserve);
    f.step();
    if (selected) assert(!f.line());
    else {
      assert.deepEqual(f.line()!.origin, f.first.origin);
      assert(!f.line()!.reserve);
    }
    assert.equal(f.status().lineworkRecovery, f.recovery);
    assert.equal(f.p.ammo, f.ammo - 2);
  }
});

test('prediction pays no round and only selects acknowledged alternate geometry for the owner', () => {
  const f = fixture(),
    prediction = new Prediction();
  const initial = viewOf(f.g, f.p.id);
  prediction.acknowledge(initial, f.p.id);
  prediction.submit({ ...idleInput(), sequence: f.p.ack + 1, technique3: true }, initial);
  assert(!prediction.player!.kit.lineworkConnection!.reserveFlight);
  assert.equal(prediction.player!.ammo, f.p.ammo);
  const alternate = f.attachReserve();
  const acknowledged = viewOf(f.g, f.p.id),
    before = structuredClone(acknowledged);
  const remote = viewOf(f.g, 'observer').players[0];
  assert.equal(remote.kit.lineworkConnection, undefined);
  assert.deepEqual(
    lineworkRenderPlan(acknowledged.players[0], acknowledged, f.p.id)?.reserve,
    alternate.origin,
  );
  assert.equal(lineworkRenderPlan(acknowledged.players[0], acknowledged, 'observer'), undefined);
  prediction.acknowledge(acknowledged, f.p.id);
  prediction.submit({ ...idleInput(), sequence: f.p.ack + 1, technique3: true }, acknowledged);
  f.step({ technique3: true });
  assert.deepEqual(prediction.player!.kit.lineworkConnection!.origin, alternate.origin);
  assert(!prediction.player!.kit.lineworkConnection!.reserve);
  assert.equal(prediction.player!.ammo, f.ammo - 2);
  assert.deepEqual(acknowledged, before);
  assert.deepEqual(f.line()!.origin, alternate.origin);
});

test('actual menu refuses the reserve at 9 and buys it exactly once at the controlled 15-SP boundary', async () => {
  const g = new Game({ mode: 'short', difficulty: 'baby' }),
    p = g.addPlayer('solo', 'Reserve menu', 'heavy');
  for (const item of ['heavy-ordnance-1', lineworkIds.entry])
    assert(g.transact(p.id, { kind: 'skill', id: item, item }).ok);
  const menu = await lineworkMenu(() => viewOf(g, p.id).players[0]);
  try {
    p.totalSp = 9;
    await menu.inspect(lineworkIds.reserve, false);
    assert(
      !heavyActions(viewOf(g, p.id).players[0], 0).extras.some(
        (action) => action.key === 'technique3',
      ),
    );
    p.totalSp = 15;
    await menu.inspect(lineworkIds.reserve, true, async () =>
      assert(g.transact(p.id, { kind: 'skill', id: 'reserve', item: lineworkIds.reserve }).ok),
    );
    assert.deepEqual(
      menu.observations.map((row) => [row.earned, row.requests]),
      [
        [9, 0],
        [15, 1],
      ],
    );
    assert.equal(g.skillCost(lineworkIds.reserve), 3);
    assert.equal(
      heavyActions(viewOf(g, p.id).players[0], 0).extras.find(
        (action) => action.key === 'technique3',
      )?.id,
      lineworkIds.reserve,
    );
  } finally {
    await menu.close();
  }
});

test('a second physical contact at the original anchor spends its round without admitting a reserve', () => {
  const f = fixture();
  const aim = Math.atan2(f.first.origin.y - f.p.y, f.first.origin.x - f.p.x);
  f.castReserve({ aim });
  const id = f.line()?.reserveFlight;
  assert(id);
  for (let tick = 0; f.g.shots.has(id) && tick < heavyLineworkRules.flightTicks; tick++) f.step();
  assert(!f.g.shots.has(id));
  assert(f.line()?.reserveSpent && !f.line()?.reserve && !f.line()?.reserveFlight);
  assert.deepEqual(f.line()!.origin, f.first.origin);
  f.castReserve();
  assert.equal(f.shots.length, 2);
  assert.equal(f.p.ammo, f.ammo - 2);
  assert.equal(f.status().lineworkRecovery, f.recovery);
});

test('selected reserve expires at the first cast boundary', () => {
  const f = fixture();
  f.attachReserve();
  f.step({ technique3: true });
  assert(f.line()?.reserveSelected);
  while (f.g.combatTick < f.first.until - 1) f.step();
  assert.equal(f.line()?.until, f.first.until);
  f.step();
  assert(!f.line());
  assert.equal(f.status().lineworkRecovery, f.recovery);
});
