import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { createPracticeGame } from '../src/shared/practice-start.ts';
import { HZ, PROTOCOL } from '../src/shared/protocol.ts';
import { runtimeArenas } from '../src/shared/arena-layouts.ts';
import { distance, segmentRect } from '../src/shared/geometry.ts';
import {
  sampleWarden,
  wardenCanHit,
  wrappedAngle,
} from '../src/shared/warden-signature.ts';
import {
  wardenCombatPose,
  wardenArt,
} from '../src/client/warden-presentation.ts';
import { wardenPhaseName, wardenPhaseHint } from '../src/client/warden-text.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { Client } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import { viewOf } from '../src/shared/view.ts';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const steps = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
const close = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function game(
  variant: 'normal' | 'brutal' = 'normal',
  phase = 0,
  map = 'gatehouse',
  difficulty = 'normal',
) {
  const g = createPracticeGame(
    {
      openingBossId: 'lantern-warden',
      openingArenaId: map,
      difficulty,
      mode: 'endless',
      seed: 143,
    },
    'Mara',
    'soldier',
    variant,
  );
  g.start();
  for (const p of g.players.values()) p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  g.boss.maxHealth = 1e6;
  g.boss.health = phase ? 499999 : 1e6;
  if (phase) {
    g.step();
    // Phase entry retains Still Watch. Test the following legal Roving patrol.
    until(g, () => g.bossCues().some(c => c.kind === 'warden-patrol'));
  }
  return g;
}
function until(g: Game, check: () => boolean, max = 1000) {
  for (let i = 0; i < max && !check(); i++) g.step();
  assert(check(), 'Warden state not reached');
}
test('Still Watch stays planted and Roving Vigil makes a visibly separate rest-only patrol on every map and cover rule', () => {
  const still = game(),
    origin = { x: still.boss.x, y: still.boss.y };
  steps(still, 700);
  close(distance(still.boss, origin), 0);
  for (const map of runtimeArenas)
    for (const difficulty of ['baby', 'normal', 'hard', 'insane', 'hellish']) {
      const g = game('normal', 1, map.id, difficulty);
      if (g.accord) g.accord = null;
      const route = g.bossCues().find((c) => c.kind === 'warden-patrol');
      assert(route && route.kind === 'warden-patrol');
      assert.equal(route.moveAt - route.at, 18);
      const start = { x: g.boss.x, y: g.boss.y };
      steps(g, 16);
      close(distance(start, g.boss), 0);
      let travelled = 0;
      for (let i = 0; i < 700; i++) {
        const before = { x: g.boss.x, y: g.boss.y };
        g.step();
        const moved = distance(before, g.boss);
        travelled += moved;
        assert(moved <= 72 / HZ + 1e-6);
        assert(
          !g.arena.obstacles.some(
            (o) => segmentRect(g.boss, g.boss, o, 58) !== null,
          ),
          map.id + '/' + difficulty + ' collider',
        );
        if (g.signatures.some((s) => s.phase !== 'rest')) close(moved, 0);
        for (const s of g.signatures.filter((s) => s.phase !== 'rest')) {
          close(s.cone.x, g.boss.x + 55);
          close(s.cone.y, g.boss.y);
        }
      }
      assert(travelled >= 72, map.id + '/' + difficulty + ' stayed stationary');
    }
});
test('patrol warning locks a route and next sweep locks its actual new ground origin and aim', () => {
  const g = game('normal', 1),
    route = g.bossCues().find((c) => c.kind === 'warden-patrol')!;
  assert(route.kind === 'warden-patrol');
  const routeBytes = JSON.stringify(route);
  const p = g.players.get('solo')!;
  p.x = 1000;
  steps(g, 20);
  assert.equal(
    JSON.stringify(g.bossCues().find((c) => c.kind === 'warden-patrol')),
    routeBytes,
  );
  until(g, () => g.signatures.some((s) => s.phase === 'warning'));
  const s = g.signatures[0],
    origin = { x: s.cone.x, y: s.cone.y },
    aim = s.cone.aim;
  p.x = 500;
  steps(g, 35);
  assert.equal(g.signatures[0].phase, 'warning');
  close(g.signatures[0].cone.aim, aim);
  g.step();
  assert.equal(g.signatures[0].phase, 'active');
  close(g.signatures[0].cone.x, origin.x);
  close(g.signatures[0].cone.y, origin.y);
});
test('Brutal alternates direction and final pairs have two complete warnings with no overlapping active cone', () => {
  const g = game('brutal', 1);
  let warnings = 0,
    activeTicks = 0,
    returnCue = false;
  const directions: number[] = [];
  for (let i = 0; i < 550; i++) {
    g.step();
    assert(g.signatures.filter((s) => s.phase === 'active').length <= 1);
    for (const s of g.signatures) {
      if (s.phase === 'warning' && s.phaseTick === 0) {
        warnings++;
        directions.push(s.direction);
      }
      if (s.phase === 'active') activeTicks++;
    }
    returnCue ||= g.bossCues().some((c) => c.kind === 'warden-return');
  }
  assert(warnings >= 2);
  assert.deepEqual(directions.slice(0, 2), [-1, 1]);
  assert(activeTicks >= 240);
  assert(returnCue);
  const first = game('brutal');
  steps(first, 276);
  assert.equal(first.signatures[0].direction, -1);
  assert.equal(first.signatures[0].phase, 'warning');
});
test('both sweep directions preserve a genuinely clear trailing interior under actual signature geometry', () => {
  for (const direction of [1, -1] as const)
    for (let tick = 36; tick < 156; tick++) {
      const sample = sampleWarden(
          tick,
          { x: 855, y: 250 },
          Math.PI * 0.9,
          direction,
        ),
        safe = {
          x: 855 + Math.cos(sample.trailingSafe.aim) * 220,
          y: 250 + Math.sin(sample.trailingSafe.aim) * 220,
        };
      assert.equal(wardenCanHit(sample, safe, 9), false);
      assert(
        wardenCanHit(
          sample,
          {
            x: 855 + Math.cos(sample.cone.aim) * 220,
            y: 250 + Math.sin(sample.cone.aim) * 220,
          },
          9,
        ),
      );
    }
});
test('the live final Brutal pair clears auxiliary hazards and cannot damage its marked trailing interior', () => {
  const g = game('brutal', 1),
    p = g.players.get('solo')!;
  let checked = 0,
    damageCalls = 0;
  const original = g.damage.bind(g);
  g.damage = (player, amount) => {
    if(g.signatures.some(s=>s.phase==='active'))damageCalls++;
    original(player, amount);
  };
  for (let i = 0; i < 530; i++) {
    const clock = Reflect.get(Reflect.get(g, 'wardenPatrol'), 'clock') as
      | {
          sample(): ReturnType<typeof sampleWarden>;
          tick: number;
          origin: { x: number; y: number };
          direction: 1 | -1;
        }
      | undefined;
    if (clock && g.signatures[0]?.phase === 'active') {
      const current = clock.sample(),
        nextAim = wrappedAngle(
          current.cone.aim + (clock.direction * (24 / 30) * Math.PI) / 180,
        ),
        safeAim = nextAim - (clock.direction * (55 + 40) * Math.PI) / 360;
      p.x = clock.origin.x + Math.cos(safeAim) * 200;
      p.y = clock.origin.y + Math.sin(safeAim) * 200;
      p.oldX = p.x;
      p.oldY = p.y;
    }
    g.step();
    if (g.signatures[0]?.phase === 'active') {
      checked++;
      assert.equal(
        [...g.shots.values()].some((s) => s.owner === 'hostile'),
        false,
      );
      assert(!g.fields.some((f) => f.owner === 'hostile'));
    }
  }
  assert(checked >= 240);
  assert.equal(p.damageTaken, 0);
  assert.equal(damageCalls, 0);
});
test('Brutal rest fan actually emits a warned second locked-origin projectile wave', () => {
  const g = game('brutal');
  until(g, () => g.warnings.some((w) => w.kind === 'fan'));
  const fan = g.warnings.find((w) => w.kind === 'fan')!;
  until(g, () => g.combatTick >= fan.at);
  const queue = g.bossCues().find((c) => c.kind === 'brutal-echo');
  assert(queue && queue.kind === 'brutal-echo');
  assert.equal(queue.wave, 2);
  assert.equal(queue.angles.length, fan.count);
  const emitted: { x: number; y: number; angle: number }[] = [];
  const original = Reflect.get(g, 'emitShot') as Function;
  Reflect.set(
    g,
    'emitShot',
    function (
      this: Game,
      owner: string,
      x: number,
      y: number,
      angle: number,
      ...rest: unknown[]
    ) {
      if (owner === 'hostile') emitted.push({ x, y, angle });
      return original.call(this, owner, x, y, angle, ...rest);
    },
  );
  until(g, () => g.combatTick >= queue.at);
  assert.equal(emitted.length, fan.count);
  for (let i = 0; i < emitted.length; i++) {
    close(emitted[i].x, queue.x);
    close(emitted[i].y, queue.y);
    close(emitted[i].angle, queue.angles[i]);
  }
});
test('patrol art follows movement only, retains world scale and avoids animation under reduced motion', () => {
  const g = game('normal', 1),
    route = g.bossCues().find((c) => c.kind === 'warden-patrol')!;
  assert(route.kind === 'warden-patrol');
  for (let n = 0; n < 4; n++) {
    const tick = route.moveAt + n * 6;
    assert.deepEqual(wardenCombatPose(g.boss, tick, tick, [], false, route), {
      clip: 'patrol',
      frame: n,
    });
    assert.deepEqual(wardenCombatPose(g.boss, tick, tick, [], true, route), {
      clip: 'patrol',
      frame: 0,
    });
  }
  close(
    (256 * wardenArt.clips.patrol.displayCell) / 512,
    (344 * wardenArt.clips.idle.displayCell) / 512,
  );
});
test('victory, timeout, wipe and stagger cancel patrol/return cues and do not leave live motion state', () => {
  for (const stop of ['victory', 'timeout', 'wipe', 'stagger']) {
    const g = game('brutal', 1),
      p = g.players.get('solo')!;
    assert(g.bossCues().some((c) => c.kind === 'warden-patrol'));
    if (stop === 'victory') g.boss.health = 0;
    else if (stop === 'timeout') g.boss.deadline = g.combatTick;
    else if (stop === 'wipe') {
      p.status = 'eliminated';
    } else g.boss.staggerUntil = g.combatTick + 100;
    g.step();
    assert(
      !g
        .bossCues()
        .some((c) => c.kind === 'warden-patrol' || c.kind === 'warden-return'),
    );
    assert.equal(g.signatures.length, 0);
  }
});
test('all fifteen locales have distinct phase responses and explicit fully warned Brutal return help', () => {
  for (const l of data.locales) {
    assert.notEqual(wardenPhaseName(0, l.id), wardenPhaseName(1, l.id));
    assert.notEqual(
      wardenPhaseHint(0, 'normal', l.id),
      wardenPhaseHint(1, 'normal', l.id),
    );
    assert(
      wardenPhaseHint(1, 'brutal', l.id).length >
        wardenPhaseHint(1, 'normal', l.id).length,
    );
  }
  const c = data.bosses.find((b) => b.id === 'lantern-warden')!;
  assert(
    'sequentialSweeps' in c.variants.brutal.phases[1] &&
      c.variants.brutal.phases[1].sequentialSweeps === 2,
  );
  assert.equal(c.healthFactor, 0.88);
  assert.equal(c.timer, 120);
});
test('issued protocol18 Practice retains money, skills and identity under the new encounter protocol', () => {
  const g = createPracticeGame({ mode: 'endless' }, 'Mara', 'soldier'),
    p = g.players.get('solo')!;
  p.coins = 999;
  const save = g.offlineCheckpoint()!;
  save.protocolVersion = 18;
  save.contentRevision =
    '535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6';
  const restored = Game.restoreOffline(save);
  assert.equal(PROTOCOL, 39);
  assert.equal(restored.settings.runId, g.settings.runId);
  assert.equal(restored.players.get('solo')!.coins, 999);
  assert.deepEqual(restored.players.get('solo')!.skills, p.skills);
  assert.throws(
    () => Game.restoreOffline({ ...save, serverOnly: true }),
    /versionMismatch/,
  );
});
test('independent Warden pixel verifier reconstructs the complete source and all four normalized poses', () => {
  execFileSync('python', ['-X', 'utf8', 'tools/verify-warden-patrol.py']);
  const report = JSON.parse(
    readFileSync(
      'reviews/warden-patrol-2026-10-25/art-verification.json',
      'utf8',
    ),
  );
  assert(
    report.passed &&
      report.sourceRGBAConserved &&
      report.identicalWorldBodyHeight,
  );
  assert.equal(report.frames, 4);
});
test(
  'real clients reject protocol18 and replicate patrol, new sweep origin, direction and cleanup',
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const owner = new Session(endpoint),
      guest = new Session(endpoint);
    const wait = async (check: () => boolean) => {
      const end = Date.now() + 5000;
      while (!check()) {
        if (Date.now() > end) throw Error('Warden patrol replication timeout');
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const options = {
        name: 'Host',
        classId: 'soldier' as const,
        mode: 'endless' as const,
        difficulty: 'hellish',
        openingBossId: 'lantern-warden' as const,
      };
      await assert.rejects(
        new Client(endpoint).create('grave', {
          ...options,
          visibility: 'public',
          createKey: randomUUID(),
          protocolVersion: 18,
          contentRevision:
            '535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6',
        }),
        /versionMismatch/,
      );
      await owner.connect(options);
      await guest.connect(
        { ...options, name: 'Observer' },
        { roomId: owner.room!.roomId },
      );
      await wait(() => owner.view?.players.length === 2);
      owner.start();
      await wait(() => guest.view?.phase === 'combat');
      const g = liveRooms.get(owner.room!.roomId)!.game;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      const priorTick = g.signatures[0].phaseTick;
      g.boss.health = g.boss.maxHealth * 0.49;
      g.step();
      assert.equal(g.signatures[0].phaseTick, priorTick + 1);
      until(g, () => g.bossCues().some(c => c.kind === 'warden-patrol'));
      await wait(() =>
        guest.view!.bossCues.some((c) => c.kind === 'warden-patrol'),
      );
      assert.equal(guest.view!.boss.phase, 1);
      assert.equal(guest.view!.boss.variant, 'crazed');
      const route = guest.view!.bossCues.find(
        (c) => c.kind === 'warden-patrol',
      )!;
      assert(route.kind === 'warden-patrol');
      steps(g, 80);
      await wait(() =>
        guest.view!.signatures.some((s) => s.phase === 'warning'),
      );
      assert(
        guest.view!.boss.x !== route.x1 || guest.view!.boss.y !== route.y1,
      );
      const v = guest.view!;
      close(v.signatures[0].cone.x, v.boss.x + 55);
      assert.equal(v.signatures[0].direction, -1);
      steps(g, 37);
      await wait(() =>
        guest.view!.signatures.some((s) => s.phase === 'active'),
      );
      assert.equal(
        guest.view!.signatures.filter((s) => s.phase === 'active').length,
        1,
      );
      g.boss.health = 0;
      await wait(() => guest.view?.phase !== 'combat');
      assert.equal(guest.view!.signatures.length, 0);
      assert(
        !guest.view!.bossCues.some(
          (c) => c.kind === 'warden-patrol' || c.kind === 'warden-return',
        ),
      );
      assert.equal(viewOf(g, owner.id).players.length, 2);
    } finally {
      await Promise.allSettled([owner.close(), guest.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
