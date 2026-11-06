import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DistrictDirector,
  districtBossIds,
  districtMovement,
  freshTerrain,
  districtRingContact,
  type DistrictCue,
  type DistrictProp,
  type DistrictArea,
} from '../src/shared/district-director.ts';
import type { SignatureContext } from '../src/shared/boss-director.ts';
import { Game, data } from '../src/shared/game.ts';
import { finishBossDefeat } from './helpers/boss-defeat.ts';
import { idleInput, PROTOCOL, type BossId, type Shot } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function fixture(id: BossId, brutal = false) {
  const d = new DistrictDirector();
  d.reset(id, true);
  let serial = 1;
  const hurt: { id: string; amount: number }[] = [],
    shots: { id: number; vx: number; vy: number; damage: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 250 },
    bossMaximumHealth: 1000,
    radius: 58,
    targets: [{ id: 'p', x: 800, y: 700, oldX: 800, oldY: 700 }],
    interactors: [],
    obstacles: [],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    damageScale: brutal ? 2 : 1,
    brutal,
    phase: 0,
    id: () => serial++,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat: () => {},
    emitHostile: (_p, a, speed, damage) =>
      shots.push({ id: serial++, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage }),
    emitControlled: (_p, a, speed, damage) => {
      const id = serial++;
      shots.push({ id, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage });
      return id;
    },
    controlShot: (id, vx, vy) => {
      const shot = shots.find((s) => s.id === id);
      if (!shot) return false;
      shot.vx = vx;
      shot.vy = vy;
      return true;
    },
    removeHostile: (id) => {
      const i = shots.findIndex((s) => s.id === id);
      if (i >= 0) shots.splice(i, 1);
    },
    relocateBoss: (p) => {
      c.boss.x = p.x;
      c.boss.y = p.y;
    },
  };
  const cast = () =>
    d.cast(c, c.targets[0], {
      kind: 'zone',
      count: 3,
      speed: 150,
      damage: 12,
      telegraph: 1.5,
      interval: 10,
    });
  const step = (to: number) => {
    for (; c.tick < to;) {
      c.tick++;
      d.step(c);
    }
  };
  return { d, c, hurt, shots, cast, step };
}
const prop = (f: ReturnType<typeof fixture>, role: DistrictProp['role']) =>
  f.d.weakPoints().find((p) => p.role === role)!;
const area = (f: ReturnType<typeof fixture>, style: DistrictArea['style']) =>
  f.d.cues().filter((x): x is DistrictArea => x.kind === 'district-area' && x.style === style);

test('each Pilgrimage signature is finite, bounded and executes actual Normal/Brutal phases', () => {
  for (const id of districtBossIds)
    for (const brutal of [false, true]) {
      const f = fixture(id, brutal);
      assert(f.cast());
      for (let phase = 0; phase < (brutal ? 4 : 3); phase++) {
        if (phase) {
          f.d.reset(id);
          f.c.phase = phase;
          f.cast();
        }
        f.step(f.c.tick + 450);
        const finite = (v: unknown): boolean =>
          typeof v === 'number'
            ? Number.isFinite(v)
            : Array.isArray(v)
              ? v.every(finite)
              : v && typeof v === 'object'
                ? Object.values(v).every(finite)
                : true;
        assert(finite(f.d.cues()), id);
        assert(f.d.cues().length < 120, id);
      }
      f.d.reset('constable', true);
      f.step(f.c.tick + 1);
      assert.equal(f.d.cues().length, 0);
      assert.equal(f.shots.filter((s) => s.vx === 0 && s.vy === 0).length, 0);
    }
});
test('coffin front resistance, rectangular weak collisions and destruction remain distinct from the boss', () => {
  const f = fixture('pallbearer');
  f.cast();
  f.step(1);
  const p = prop(f, 'coffin');
  assert.equal(f.d.bodyMultiplier({ x: 800, y: 900 }, f.c.boss, 1), 0.5);
  assert.equal(f.d.bodyMultiplier({ x: 800, y: 50 }, f.c.boss, 1), 1);
  assert.equal(
    f.d.weakContact({ x: p.x + 60, y: p.y - 100 }, { x: p.x + 60, y: p.y + 100 }, p, 3),
    null,
    'No circular phantom hit outside the narrow coffin',
  );
  f.d.hit(p.id, 180, 1);
  assert.equal(f.d.bodyMultiplier({ x: 800, y: 900 }, f.c.boss, 1), 1);
  f.c.tick = 400;
  f.cast();
  f.step(401);
  assert(
    !f.d.weakPoints().some((p) => p.role === 'coffin'),
    'Destroyed cover must not regenerate every cast',
  );
});
test('foreman keeps the last occupied zone cool and a neutral switch can suppress all vents', () => {
  const f = fixture('cinder-foreman');
  f.cast();
  const vents = area(f, 'vent'),
    switcher = area(f, 'valve')[0];
  f.c.targets[0].x = vents[0].x;
  f.c.targets[0].y = vents[0].y;
  f.step(10);
  f.c.targets[0].x = vents[2].x;
  f.c.targets[0].y = vents[2].y;
  f.step(20);
  assert(vents[2].disabled);
  assert(!vents[0].disabled);
  f.c.targets[0].x = switcher.x;
  f.c.targets[0].y = switcher.y;
  f.c.interactors = ['p'];
  f.step(56);
  assert(vents.every((v) => v.disabled));
  assert.equal(f.hurt.length, 0);
});
test('diver announces one true puddle, is protected underwater and resurfaces at that fixed place', () => {
  const f = fixture('canal-diver');
  f.cast();
  const truePuddle = area(f, 'puddle').find((p) => p.progress === 1)!;
  const state = f.d.cues().find((x) => x.kind === 'district-state' && x.style === 'dive')!;
  f.step(state.at);
  assert.equal(f.d.bodyMultiplier(f.c.targets[0], f.c.boss, f.c.tick), 0);
  f.step(state.until);
  assert.equal(f.c.boss.x, truePuddle.x);
  assert.equal(f.c.boss.y, truePuddle.y);
  assert.equal(f.d.bodyMultiplier(f.c.targets[0], f.c.boss, f.c.tick), 1);
});
test('clock bullets release only after warning, stop, warn for restart and resume the same vectors', () => {
  const f = fixture('clockmender');
  f.cast();
  const clock = f.d.cues()[0];
  f.step(clock.at - 1);
  assert.equal(f.shots.length, 0);
  f.step(clock.at);
  assert.equal(f.shots.length, 24);
  const original = f.shots.map((s) => ({ vx: s.vx, vy: s.vy }));
  f.step(clock.at + 42);
  assert(f.shots.every((s) => s.vx === 0 && s.vy === 0));
  f.step(clock.at + 42 + 60);
  assert.deepEqual(
    f.shots.map((s) => ({ vx: s.vx, vy: s.vy })),
    original,
  );
  f.d.reset('clockmender');
  f.step(f.c.tick + 1);
  assert.equal(f.shots.length, 0);
});
test('breaking a wire anchor removes only its own adjacent lines, retaining a stable visible gate', () => {
  const f = fixture('wire-seamstress');
  f.cast();
  const anchors = f.d.weakPoints(),
    lines = f.d.cues().filter((x) => x.kind === 'district-line');
  assert.equal(anchors.length, 3);
  assert.equal(lines.length, 4);
  f.d.hit(anchors[0].id, 80, 0);
  assert(lines.filter((x) => x.dependencies.includes(anchors[0].id)).every((x) => x.disabled));
  assert(lines.filter((x) => !x.dependencies.includes(anchors[0].id)).every((x) => !x.disabled));
});
test('gravedigger cover travels before the delayed pit and can be destroyed early', () => {
  const f = fixture('gravedigger');
  f.cast();
  const ridge = prop(f, 'ridge'),
    pit = area(f, 'pit')[0];
  const y = ridge.y;
  f.step(ridge.at + 30);
  assert(Math.abs(ridge.y - y - (65 * 31) / 30) < 0.01);
  assert(f.c.tick < pit.at);
  assert.equal(f.d.projectileCover().length, 1);
  f.d.hit(ridge.id, 150, f.c.tick);
  assert.equal(f.d.projectileCover().length, 0);
});
test('notary draws separate spiral segments progressively and leaves the authored angular opening', () => {
  const f = fixture('ink-notary');
  f.cast();
  const lines = f.d.cues().filter((x) => x.kind === 'district-line');
  assert(lines.length > 20 && lines.length < 40);
  assert(new Set(lines.map((x) => x.at)).size > 15);
  assert(lines.every((x) => x.style === 'ink' && x.width === 26));
});
test('destroying one hive drone opens its third of the swarm while retaining the fallback gap', () => {
  const f = fixture('spore-beekeeper');
  f.cast();
  const drone = prop(f, 'drone'),
    ring = f.d.cues().find((x) => x.kind === 'district-ring')!;
  assert.equal(ring.gaps.length, 1);
  f.d.hit(drone.id, 55, 0);
  assert.equal(ring.gaps.length, 2);
  assert(Math.abs(ring.gaps[1].width - (Math.PI * 2) / 3) < 1e-9);
  const danger = { ...ring, radius: 150, oldRadius: 150 };
  const safe = { x: ring.x + Math.cos(drone.angle) * 150, y: ring.y + Math.sin(drone.angle) * 150 };
  assert.equal(districtRingContact(safe, safe, danger), false);
});
test('ice drift is bounded, movement follows input, and dodge or dry ground clears it immediately', () => {
  const f = fixture('ice-custodian');
  f.cast();
  const ice = area(f, 'ice')[0],
    state = freshTerrain();
  for (let i = 0; i < 100; i++)
    districtMovement(f.d.cues(), ice, 'p', ice.at + 1, state, { x: 1, y: 1 }, false);
  assert(Math.abs(Math.hypot(state.iceX, state.iceY) - 45) < 1e-7);
  districtMovement(f.d.cues(), ice, 'p', ice.at + 2, state, { x: 1, y: 0 }, true);
  assert.equal(state.iceX, 0);
  assert.equal(state.iceY, 0);
  districtMovement(f.d.cues(), { x: 10, y: 10 }, 'p', ice.at + 3, state, { x: 1, y: 0 }, false);
  assert.equal(state.iceX, 0);
});
test('ferryman always retains both the open bridge and an outer bypass', () => {
  for (let cast = 0; cast < 2; cast++) {
    const f = fixture('bridge-ferryman');
    if (cast) {
      f.cast();
      f.c.tick = 400;
      f.d.reset('bridge-ferryman');
    }
    f.cast();
    const water = area(f, 'water');
    const at = water[0].at;
    const status = freshTerrain();
    for (const x of [100, 1500, cast ? 1088 : 512])
      assert.equal(
        districtMovement(water, { x, y: 500 }, 'p', at, status, { x: 1, y: 0 }, false).multiplier,
        1,
      );
  }
});
test('porcelain cover warns before splitting once into actual projectiles', () => {
  const f = fixture('porcelain-mourner');
  f.cast();
  const shard = prop(f, 'fragment');
  f.step(shard.until - 1);
  assert.equal(f.shots.length, 0);
  f.step(shard.until);
  assert.equal(f.shots.length, 24);
  f.step(f.c.tick + 20);
  assert.equal(f.shots.length, 24);
});
test('boiler neutral valve adds a wide vent opening and retains the original escape wedge', () => {
  const f = fixture('boiler-tender');
  f.cast();
  const valve = area(f, 'valve')[0],
    ring = f.d.cues().find((x) => x.kind === 'district-ring')!;
  f.c.targets[0].x = valve.x;
  f.c.targets[0].y = valve.y;
  f.c.interactors = ['p'];
  f.step(36);
  assert(valve.disabled);
  assert.equal(ring.gaps.length, 2);
  assert.equal(ring.gaps[0].width, Math.PI / 4);
  assert(ring.gaps[1].width > ring.gaps[0].width);
});
test('mirror ghost never hurts or steals health and the real warp relocates only once', () => {
  const f = fixture('mirror-undertaker');
  f.cast();
  const ghost = area(f, 'ghost')[0],
    state = f.d.cues().find((c) => c.kind === 'district-state')!;
  f.step(state.until);
  assert.equal(f.c.boss.x, state.endX);
  assert.equal(f.c.boss.y, state.endY);
  f.c.targets[0].x = ghost.x;
  f.c.targets[0].y = ghost.y;
  f.step(f.c.tick + 40);
  assert.equal(f.hurt.length, 0);
});
test('chalk leaves one erased edge and harp strikes count in a fixed sequence', () => {
  const chalk = fixture('chalk-magistrate');
  chalk.cast();
  const walls = chalk.d.cues().filter((c) => c.kind === 'district-line');
  assert.equal(walls.filter((w) => !w.disabled).length, 3);
  const harp = fixture('wire-harpist');
  harp.cast();
  const strings = harp.d.cues().filter((c) => c.kind === 'district-line');
  assert.deepEqual(
    strings.map((s) => s.at - strings[0].at),
    [0, 24, 48],
  );
  assert(strings.every((s) => s.until - s.at === 14));
});
test('crow flocks contain fifteen discrete delayed bodies and stop at real cover', () => {
  const f = fixture('crow-shepherd');
  f.cast();
  const birds = f.d.cues().filter((c) => c.kind === 'district-bird');
  assert.equal(birds.length, 15);
  assert.equal(new Set(birds.map((b) => b.at)).size, 3);
  f.c.obstacles = [{ x: 0, y: 252, width: 1600, height: 20 }];
  f.step(birds[0].at + 20);
  assert(!f.d.cues().some((c) => c.kind === 'district-bird' && c.at === birds[0].at));
});
test('ledger seals slow without taking coins and crossing a cleansing circle prevents predicted reapplication', () => {
  const f = fixture('ledger-leech');
  f.cast();
  const seal = area(f, 'seal')[0],
    clean = area(f, 'cleanse')[0],
    state = freshTerrain();
  let movement = districtMovement(
    f.d.cues(),
    f.c.targets[0],
    'p',
    seal.at,
    state,
    { x: 1, y: 0 },
    false,
  );
  assert.equal(movement.multiplier, 0.8);
  movement = districtMovement(f.d.cues(), clean, 'p', seal.at + 1, state, { x: 1, y: 0 }, false);
  assert.equal(movement.multiplier, 1);
  movement = districtMovement(
    f.d.cues(),
    f.c.targets[0],
    'p',
    seal.at + 2,
    state,
    { x: 1, y: 0 },
    false,
  );
  assert.equal(movement.multiplier, 1);
  assert.equal(state.cleansedSeals.length, 1);
});
test('engine armor protects the body before the distinct core opens', () => {
  const f = fixture('engine');
  f.cast();
  const armor = f.d.cues().find((c) => c.kind === 'district-state')!;
  f.step(armor.at);
  assert.equal(f.d.bodyMultiplier(f.c.targets[0], f.c.boss, f.c.tick), 0.4);
  assert(!f.d.weakPoints().some((p) => p.role === 'core'));
  f.step(armor.until);
  assert.equal(f.d.bodyMultiplier(f.c.targets[0], f.c.boss, f.c.tick), 1);
  assert(f.d.transfersDamage(prop(f, 'core').id));
});
test('salt sequence retains two gates and a neutral hold delays all future steps', () => {
  const f = fixture('salt-patriarch');
  f.cast();
  const lines = f.d.cues().filter((c) => c.kind === 'district-line');
  assert.equal(lines.length, 18);
  assert.equal(new Set(lines.map((l) => l.at)).size, 3);
  const valve = area(f, 'valve')[0];
  f.c.targets[0].x = valve.x;
  f.c.targets[0].y = valve.y;
  f.c.interactors = ['p'];
  const next = lines.find((l) => l.index === 1)!,
    start = next.at;
  f.step(60);
  assert.equal(next.at, start + 60);
  assert(valve.disabled);
});
test('sixteen-fight Pilgrimage restores boundaries, never repeats and reaches the same final build budget', () => {
  for (const seed of [4, 19, 831]) {
    let g = new Game({ mode: 'long', seed, maxPlayers: 1 });
    g.addPlayer('p', 'Pilgrim', 'tank');
    g.start();
    const seen = new Set<string>();
    for (let n = 0; n < 16; n++) {
      assert.equal(g.phase, 'combat');
      assert(!seen.has(g.boss.id));
      seen.add(g.boss.id);
      assert(
        data.bosses.some(
          (b) =>
            b.id === g.boss.id &&
            ['short', 'standard', 'long', 'raid'].includes(b.route) &&
            b.finale === (n === 15),
        ),
      );
      const p = [...g.players.values()][0];
      assert.equal(p.totalSp, 3 + Math.floor((24 * n) / 15));
      assert.equal(p.incomeGranted, Math.floor((120 + (2280 * n) / 15) * g.difficulty.coins));
      g.boss.health = 0;
      g.step();
      if (n === 15) {
        if((g.phase as string)==='secretOffer')for(const survivor of g.players.values())g.vote(survivor.id,0);
        assert.equal(g.phase, 'victory');
        assert.equal(g.completedBossIds.size, 16);
        break;
      }
      g = Game.restoreOffline(g.offlineCheckpoint()!);
      finishBossDefeat(g);
      g.phaseEnds = g.tick;
      g.step();
      assert.equal(new Set(g.contractCards.map((c) => c.bossId)).size, 3);
      assert(g.contractCards.every((c) => !seen.has(c.bossId!)));
      for (let guard = 0; guard < 5 && g.phase !== 'combat'; guard++) {
        g.phaseEnds = g.tick;
        g.step();
      }
    }
  }
});
test('clock freeze and restart updates overwrite the same projectile identities for network presentation', () => {
  const g = new Game({ openingBossId: 'clockmender', maxPlayers: 1 }),
    p = g.addPlayer('p', 'Clock', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  advance(g, 61);
  const clock = g.director.district
    .cues()
    .find(
      (c): c is Extract<DistrictCue, { kind: 'district-state' }> =>
        c.kind === 'district-state' && c.style === 'clock',
    )!;
  advance(g, clock.at - g.combatTick + 42);
  const frozen = [...g.shots.values()].filter((s) => s.vx === 0 && s.vy === 0);
  assert(frozen.length > 0);
  const id = frozen[0].id;
  assert(
    g
      .drainEvents()
      .some(
        (e) => e.type === 'shots' && e.shots.some((s) => s.id === id && s.vx === 0 && s.vy === 0),
      ),
  );
  advance(g, 60);
  assert(g.shots.get(id));
  assert(Math.hypot(g.shots.get(id)!.vx, g.shots.get(id)!.vy) > 120);
  assert(
    g
      .drainEvents()
      .some(
        (e) =>
          e.type === 'shots' && e.shots.some((s) => s.id === id && Math.hypot(s.vx, s.vy) > 120),
      ),
  );
});
test('engine core projectile transfers one boosted hit rather than also damaging its invisible body', () => {
  const g = new Game({ openingBossId: 'engine', maxPlayers: 1 }),
    p = g.addPlayer('p', 'Core', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  advance(g, 300);
  const core = g.director.district.weakPoints().find((p) => p.role === 'core')!;
  assert(core);
  g.boss.staggerUntil = 1e9;
  const before = g.boss.health,
    credit = p.damageDealt;
  const shot: Shot = {
    id: 900000,
    owner: p.id,
    x: core.x,
    y: core.y + 100,
    vx: 0,
    vy: -12000,
    radius: 3,
    damage: 10,
    pierce: 1,
    expires: 10000,
  };
  g.shots.set(shot.id, shot);
  g.step();
  assert(Math.abs(before - g.boss.health - 16) < 1e-8);
  assert(Math.abs(p.damageDealt - credit - 16) < 1e-8);
});
test('ice and seal prediction deep-copy terrain state and match the authority through a dodge', () => {
  for (const id of ['ice-custodian', 'ledger-leech'] as const) {
    const g = new Game({ openingBossId: id, maxPlayers: 1 }),
      p = g.addPlayer('p', 'Terrain', 'soldier');
    g.start();
    p.invulnerableUntil = 1e9;
    advance(g, 110);
    g.boss.staggerUntil = 1e9;
    const cue = g.director
      .cues()
      .find(
        (c) => c.kind === 'district-area' && (c.style === 'ice' || c.style === 'seal'),
      ) as DistrictArea;
    assert(cue);
    p.x = cue.x;
    p.y = cue.y;
    const prediction = new Prediction(),
      view = viewOf(g, p.id);
    prediction.acknowledge(view, p.id);
    assert.notEqual(prediction.player!.terrain, view.players[0].terrain);
    for (let sequence = 1; sequence <= 30; sequence++) {
      const input = { ...idleInput(), sequence, moveX: 1, dodge: sequence === 15 };
      prediction.submit(input, viewOf(g, p.id));
      g.submitInput(p.id, input);
      g.step();
      assert(Math.abs(prediction.player!.x - p.x) < 1e-7);
      assert(Math.abs(prediction.player!.y - p.y) < 1e-7);
    }
  }
});

test('every Pilgrimage identity executes all Normal/Brutal phases on actual maps and clears signatures at victory', () => {
  for (const id of districtBossIds)
    for (const brutal of [false, true]) {
      const lobby = new Game({
        mode: 'endless',
        maxPlayers: 1,
        openingBossId: id,
        openingArenaId: 'sunken-chapel',
      });
      lobby.addPlayer('p', 'Mara', 'soldier');
      const save = lobby.offlineCheckpoint()!;
      save.selectedContract.variant = brutal ? 'brutal' : 'normal';
      const g = Game.restoreOffline(save);
      g.start();
      [...g.players.values()][0].invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      const phases = brutal ? 4 : 3;
      for (let phase = 0; phase < phases; phase++) {
        if (phase) {
          g.boss.health =
            g.boss.maxHealth * (brutal ? [1, 0.74, 0.49, 0.24][phase] : [1, 0.74, 0.39][phase]);
          g.step();
          assert.equal(g.boss.phase, phase);
          assert.equal(g.accord,null);
          g.step();
        }
        // Existing scores finish naturally; require a fresh signature within its bounded recovery.
        const prior = new Set(g.director.cues().map(c => c.id));
        const budget = Math.max(180,g.director.district.nextSignatureAt-g.combatTick+90);
        assert(budget<=3000,'Unbounded signature recovery');
        let observed = false;
        for (let tick = 0; tick < budget; tick++) {
          g.step();
          observed ||= g.director.cues().some((c) => c.kind.startsWith('district-') && !prior.has(c.id));
        }
        assert(observed, id + ' did not execute its signature in phase ' + phase);
      }
      assert.equal(
        [...g.shots.values()].filter((s) => s.owner === 'hostile').length <=
          data.rules.maximumHostileProjectiles,
        true,
      );
      g.boss.health = 0;
      g.step();
      assert.equal(g.director.cues().length, 0);
      assert.equal(g.minions.actors.size, 0);
    }
});

test('local protocol-9 Midnight saves migrate but cannot claim a Pilgrimage identity or route', () => {
  const g = new Game({ mode: 'standard', maxPlayers: 1 });
  g.addPlayer('p', 'Old', 'engineer');
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 9;
  assert.equal(Game.restoreOffline(old).offlineCheckpoint()!.protocolVersion, PROTOCOL);
  const wrongRoute = structuredClone(old);
  wrongRoute.settings.mode = 'long';
  assert.throws(() => Game.restoreOffline(wrongRoute));
  const wrongBoss = structuredClone(old);
  wrongBoss.settings.openingBossId = 'pallbearer';
  assert.throws(() => Game.restoreOffline(wrongBoss));
  const wrongHistory = structuredClone(old);
  wrongHistory.completedBossIds = ['engine'];
  assert.throws(() => Game.restoreOffline(wrongHistory));
});

test('signature positions copy only coordinates from rich actors and retain numeric cue IDs', () => {
  for (const id of districtBossIds) {
    const f = fixture(id);
    Object.assign(f.c.boss, { id, health: 1000, privateField: 'must not be copied' });
    f.cast();
    assert(
      f.d.cues().every((c) => Number.isSafeInteger(c.id)),
      id,
    );
    assert(!JSON.stringify(f.d.cues()).includes('privateField'), id);
  }
});

test('new health mutations produce consistent live and restorable authoritative boundaries', () => {
  const g = new Game({ maxPlayers: 1 }),
    p = g.addPlayer('p', 'Boundary', 'soldier');
  g.start();
  g.boss.health = 0;
  g.step();
  g.mutationCards = ['glass-pact'];
  finishBossDefeat(g);
  g.phaseEnds = g.tick;
  g.step();
  assert.equal(g.phase, 'contractVote');
  assert.equal(p.maxHealth, 55);
  assert(p.health <= p.maxHealth);
  const restored = Game.restoreAuthoritative(g.authoritativeCheckpoint());
  assert.equal(restored.players.get(p.id)!.maxHealth, p.maxHealth);
  assert.equal(restored.players.get(p.id)!.health, p.health);
});
test('a destroyed hive drone removes its own actual projectiles without erasing the others', () => {
  const f = fixture('spore-beekeeper');
  f.cast();
  const ring = f.d.cues().find((c) => c.kind === 'district-ring')!;
  f.step(ring.at);
  const before = f.shots.length;
  assert(before > 12 && before < 24);
  const drone = prop(f, 'drone');
  f.d.hit(drone.id, 55, f.c.tick);
  f.step(f.c.tick + 1);
  assert(f.shots.length < before && f.shots.length > 0);
});
