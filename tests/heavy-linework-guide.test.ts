import test from 'node:test';
import assert from 'node:assert/strict';
import samples from './fixtures/heavy-corner-guide-routes.json';
import { Game } from '../src/shared/game.ts';
import { distance, segmentRect } from '../src/shared/geometry.ts';
import {
  heavyLineworkGuideRules,
  heavyLineworkRules,
  lineworkIds,
} from '../src/shared/heavy-linework.ts';
import { lineworkEye, pickLineworkGuide } from '../src/shared/heavy-linework-guide.ts';
import { HZ, idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';
import { lineworkMenu } from './helpers/heavy-linework-menu-flow.ts';
import { drawLinework, lineworkRenderPlan } from '../src/client/heavy-linework-presentation.ts';

const point = ({ x, y }: Vec) => ({ x, y });
const bearing = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x);

function fixture(sample: keyof typeof samples, ownsGuide = true) {
  const route = samples[sample];
  const game = new Game({
    mode: 'short',
    difficulty: 'baby',
    seed: 41,
    openingArenaId: 'gatehouse',
    arenaSelection: 'fixed',
  });
  const heavy = game.addPlayer('solo', 'Corner Guide geometry', 'heavy');
  const buy = (item: string) => game.transact(heavy.id, { kind: 'skill', id: item, item });
  assert(buy('heavy-ordnance-1').ok && buy(lineworkIds.entry).ok);
  // Isolate the cable geometry at the second-clear SP budget. The transport tests earn it.
  heavy.totalSp = 15;
  if (ownsGuide) assert(buy(lineworkIds.guide).ok);
  assert(game.start());
  game.boss.staggerUntil = 400;
  const status = () => game.kitStatus(heavy.id);
  const line = () => status().lineworkConnection;
  const ammo = heavy.ammo;
  let sequence = 0;
  function step(input: Partial<InputFrame> = {}) {
    assert(
      game.submitInput(heavy.id, {
        ...idleInput(),
        clientTick: game.combatTick,
        sequence: ++sequence,
        ...input,
      }),
    );
    game.step();
    return game.drainEvents();
  }
  function walk(to: Vec) {
    for (let tick = 0; distance(heavy, to) > 0.45 && tick < 100; tick++) {
      const stride = Math.max(distance(heavy, to), game.movementSpeed(heavy) / HZ);
      step({ moveX: (to.x - heavy.x) / stride, moveY: (to.y - heavy.y) / stride });
    }
    assert(distance(heavy, to) <= 0.45);
  }
  if (sample === 'corner') Object.assign(heavy, route.castFrom);
  else walk(route.castFrom);
  step({ aim: bearing({ x: 0, y: 0 }, route.approach), technique1: true });
  for (let tick = 0; !line() && tick < heavyLineworkRules.flightTicks; tick++) step();
  const first = line();
  assert(first && distance(first.origin, route.anchor) <= 1.5);
  const recovery = status().lineworkRecovery;
  walk(route.setFrom);
  step({ aim: bearing(heavy, route.guide) });
  function install(extra: Partial<InputFrame> = {}) {
    return step({ technique3: true, aim: bearing(heavy, route.guide), ...extra });
  }
  return { route, game, heavy, ammo, status, line, first, recovery, step, walk, install };
}

test('actual corner carries both cable spans around cover and returns to the first anchor', () => {
  const f = fixture('corner');
  const paid = f.install({ technique2: true, fire: true });
  const fitted = f.line()!;
  assert(fitted.guide && !fitted.active);
  assert.equal(f.heavy.ammo, f.ammo - 2);
  assert(paid.some((event) => event.type === 'sound' && event.id === 'linework-guide-set'));
  assert(!paid.some((event) => event.type === 'shots'));
  f.walk(f.route.detour);
  assert(f.game.obstacles.some((wall) => segmentRect(f.heavy, lineworkEye(f.first), wall, 1)));
  const direct = fixture('corner', false);
  direct.walk(direct.route.detour);
  assert(!direct.line());
  assert(f.line()?.guide);
  f.step({ technique2: true });
  for (let tick = 0; f.line()?.active && tick < 60; tick++) f.step();
  assert(distance(f.heavy, fitted.guide.point) <= heavyLineworkGuideRules.redirectReach);
  f.walk(fitted.guide.point);
  f.step({ technique3: true, technique2: true });
  const redirected = f.line()!;
  assert(redirected.guideUsed && !redirected.guide && !redirected.active);
  assert.equal(redirected.until, f.first.until);
  assert.equal(f.status().lineworkRecovery, f.recovery);
  assert.deepEqual(redirected.origin, f.first.origin);
  const start = point(f.heavy);
  f.step({ technique2: true });
  for (let tick = 0; f.line()?.active && tick < 60; tick++) f.step();
  assert(distance(start, f.first.origin) - distance(f.heavy, f.first.origin) > 8);
  assert.equal(f.heavy.ammo, f.ammo - 2);
  while (f.game.combatTick < f.first.until - 1) f.step();
  assert.equal(f.line()?.until, f.first.until);
  f.step();
  assert(!f.line());
  assert.equal(f.status().lineworkRecovery, f.recovery);
});

test('guide installation requires owned, still, paid, unobstructed masonry and shares the reserve exclusion', () => {
  const unowned = fixture('face', false);
  unowned.install();
  assert(!unowned.line()?.guide && unowned.heavy.ammo === unowned.ammo - 1);
  const f = fixture('face');
  f.install({ moveY: -0.1 });
  assert(!f.line()?.guide && f.heavy.ammo === f.ammo - 1);
  f.heavy.ammo = 0;
  f.install();
  assert(!f.line()?.guide && !f.line()?.guideUsed);
  f.heavy.ammo = f.ammo - 1;
  const world = {
    bounds: f.game.arena.bounds,
    masonry: f.game.arena.obstacles,
    obstacles: f.game.obstacles,
  };
  const aim = bearing(f.heavy, f.route.guide);
  const guide = pickLineworkGuide(f.heavy, aim, f.first, world)!;
  assert(guide && guide.foot.y > guide.point.y);
  assert(!pickLineworkGuide(f.heavy, aim, f.first, { ...world, masonry: [] }));
  assert(
    !pickLineworkGuide(f.heavy, aim, f.first, {
      ...world,
      obstacles: [
        ...world.obstacles,
        { x: guide.point.x + 16, y: guide.point.y - 5, width: 8, height: 30 },
      ],
    }),
  );
  assert(!pickLineworkGuide(f.heavy, aim, { ...f.first, paidLength: 15 }, world));
  f.install({ technique1: true });
  assert(!f.line() && f.heavy.ammo === f.ammo - 1);
  for (const [first, second] of [
    [lineworkIds.guide, lineworkIds.reserve],
    [lineworkIds.reserve, lineworkIds.guide],
  ]) {
    const game = new Game({ mode: 'raid', difficulty: 'normal' });
    const heavy = game.addPlayer('solo', 'Guide or reserve', 'heavy');
    for (const item of ['heavy-ordnance-1', lineworkIds.entry, first])
      assert(game.transact(heavy.id, { kind: 'skill', id: item, item }).ok);
    const skills = [...heavy.skills];
    assert(!game.transact(heavy.id, { kind: 'skill', id: second, item: second }).ok);
    assert.deepEqual(heavy.skills, skills);
  }
});

test('prediction forecasts only the acknowledged guide and draws its two private cable spans', () => {
  const f = fixture('face');
  const prediction = new Prediction();
  const owner = () => viewOf(f.game, f.heavy.id);
  const before = owner();
  prediction.acknowledge(before, f.heavy.id);
  prediction.submit(
    {
      ...idleInput(),
      sequence: f.heavy.ack + 1,
      aim: bearing(f.heavy, f.route.guide),
      technique3: true,
    },
    before,
  );
  assert(!prediction.player?.kit.lineworkConnection?.guide);
  assert.equal(prediction.player?.ammo, f.ammo - 1);
  f.install();
  const fitted = f.line()!.guide!;
  f.walk(fitted.point);
  const view = owner(),
    original = structuredClone(view);
  const p = view.players[0];
  const foreign = viewOf(f.game, 'observer').players[0];
  assert.equal(foreign.kit.lineworkGuideBlocked, undefined);
  assert.equal(foreign.kit.lineworkConnection, undefined);
  const plan = lineworkRenderPlan(p, view, f.heavy.id)!;
  assert.deepEqual(plan.guide, { point: fitted.point, foot: fitted.foot });
  assert.equal(lineworkRenderPlan(p, view, 'observer'), undefined);
  const lines: number[][] = [];
  const graphics = {
    lineStyle() {
      return graphics;
    },
    lineBetween(...ends: number[]) {
      lines.push(ends);
      return graphics;
    },
    strokeCircle() {
      return graphics;
    },
  };
  drawLinework(graphics, plan);
  assert.deepEqual(lines, [
    [p.x, p.y, fitted.point.x, fitted.point.y],
    [fitted.point.x, fitted.point.y, f.first.origin.x, f.first.origin.y],
    [fitted.foot.x, fitted.foot.y, fitted.point.x, fitted.point.y],
  ]);
  prediction.acknowledge(view, f.heavy.id);
  prediction.submit(
    { ...idleInput(), sequence: f.heavy.ack + 1, technique3: true, technique2: true },
    view,
  );
  const forecast = prediction.player!.kit.lineworkConnection!;
  assert(forecast.guideUsed && !forecast.guide && !forecast.active);
  assert.deepEqual(forecast.origin, f.first.origin);
  assert.equal(prediction.player!.ammo, f.ammo - 2);
  assert.deepEqual(view, original);
  f.heavy.skills = f.heavy.skills.filter((id) => id !== lineworkIds.guide);
  f.step();
  assert(!f.line());
  assert.equal(f.status().lineworkRecovery, f.recovery);
});

test('rounded room coordinates use authoritative guide readiness for the selector and haul label', async () => {
  const f = fixture('face');
  f.install();
  const guide = f.line()!.guide!;
  // Reproduce a real peer body rounded from 4.99 px away to 5.10 px away.
  f.heavy.x = guide.point.x;
  f.heavy.y = guide.point.y - 4.99;
  f.step();
  const owner = viewOf(f.game, f.heavy.id).players[0];
  assert(distance(owner, guide.point) < heavyLineworkGuideRules.redirectReach);
  assert.equal(owner.kit.lineworkGuideBlocked, false);
  assert.equal(owner.kit.lineworkCommandBlocked, true);
  const replicated = { ...owner, x: Math.round(owner.x * 4) / 4, y: Math.round(owner.y * 4) / 4 };
  assert(distance(replicated, guide.point) > heavyLineworkGuideRules.redirectReach);
  const menu = await lineworkMenu(() => replicated);
  try {
    assert.equal(
      menu.guide.heavyHudLabel(replicated, 'technique2', f.game.combatTick),
      'Redirect first',
    );
    assert.equal(
      menu.guide.heavyHudLabel(replicated, 'technique3', f.game.combatTick),
      'Redirect to anchor',
    );
  } finally {
    await menu.close();
  }
  f.step({ technique3: true });
  assert(f.line()?.guideUsed && !f.line()?.guide && !f.line()?.active);
  assert.deepEqual(f.line()?.origin, f.first.origin);
  assert.equal(f.line()?.until, f.first.until);
});
