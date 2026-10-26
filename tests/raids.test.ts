import { bossThreat } from '../src/shared/boss-threat.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RaidDirector,
  raidBossIds,
  raidMovement,
  type RaidProp,
  type RaidCue,
} from '../src/shared/raid-director.ts';
import type { SignatureContext } from '../src/shared/boss-director.ts';
import { Game, data } from '../src/shared/game.ts';
import { PROTOCOL, idleInput, type BossId, type Shot } from '../src/shared/protocol.ts';
import { Prediction } from '../src/client/prediction.ts';
import { viewOf } from '../src/shared/view.ts';
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function fixture(id: BossId, brutal = false, players = 1) {
  const d = new RaidDirector();
  d.reset(id, true);
  let serial = 1;
  const shots: number[] = [],
    hurt: number[] = [],
    bossHits: number[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 250 },
    bossMaximumHealth: 3000,
    radius: 58,
    targets: Array.from({ length: players }, (_, i) => ({
      id: 'p' + i,
      x: 800 + i * 10,
      y: 700,
      oldX: 800 + i * 10,
      oldY: 700,
    })),
    interactors: [],
    obstacles: [],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    damageScale: brutal ? 2 : 1,
    brutal,
    phase: 0,
    id: () => serial++,
    damage: (_id, n) => hurt.push(n),
    spawnRat: () => {},
    emitHostile: (_p, a) => shots.push(a),
    hurtBoss: (n) => bossHits.push(n),
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
    while (c.tick < to) {
      c.tick++;
      d.step(c);
    }
  };
  return { d, c, shots, hurt, bossHits, cast, step };
}
const props = (f: ReturnType<typeof fixture>, role: RaidProp['role']) =>
  f.d.cues().filter((p): p is RaidProp => p.kind === 'raid-prop' && p.role === role);
test('Raid signatures execute finite Normal and Brutal phases, cancel at reset and do not leak actor fields', () => {
  for (const id of raidBossIds)
    for (const brutal of [false, true]) {
      const f = fixture(id, brutal);
      Object.assign(f.c.boss, { id, privateField: 'secret' });
      for (let phase = 0; phase < (brutal ? 4 : 3); phase++) {
        f.d.reset(id);
        f.c.phase = phase;
        assert(f.cast());
        assert(f.d.cues().every((c) => Number.isSafeInteger(c.id)));
        assert(!JSON.stringify(f.d.cues()).includes('secret'));
        f.step(f.c.tick + 450);
        assert(f.d.cues().length < 100);
        assert(!JSON.stringify(f.d.cues()).includes('null'));
      }
      f.d.reset('constable', true);
      assert.equal(f.d.cues().length, 0);
    }
});
test('Colossus pylons scale for solo and sixteen players, break the pull and open four seconds', () => {
  for (const count of [1, 16]) {
    const f = fixture('chain-colossus', false, count);
    f.cast();
    const p = props(f, 'pylon')[0];
    assert.equal(p.health, 110 * (1 + 0.2 * (count - 1)));
    const pull = f.d
      .cues()
      .find(
        (c): c is Extract<RaidCue, { kind: 'raid-lane' }> =>
          c.kind === 'raid-lane' && c.style === 'pull',
      )!;
    f.step(pull.at);
    assert.equal(
      Math.hypot(...Object.values(raidMovement(f.d.cues(), { x: pull.x1, y: 500 }, f.c.tick))),
      45,
    );
    assert.deepEqual(raidMovement(f.d.cues(), { x: 80, y: 500 }, f.c.tick), { x: 0, y: 0 });
    f.d.hit(p.id, p.health, f.c.tick);
    assert.deepEqual(raidMovement(f.d.cues(), { x: pull.x1, y: 500 }, f.c.tick), { x: 0, y: 0 });
    assert.equal(f.d.bodyMultiplier(f.c.tick + 119), 1.5);
    assert.equal(f.d.bodyMultiplier(f.c.tick + 120), 1);
  }
});
test('Leviathan curves with three sequential rib openings and preserves the 1.5 weak transfer', () => {
  const f = fixture('ossuary-leviathan');
  f.cast();
  const state = f.d.cues().find((c) => c.kind === 'raid-state')!;
  const start = { ...f.c.boss };
  f.step(state.at + 1);
  assert.notDeepEqual(f.c.boss, start);
  for (let i = 0; i < 3; i++) {
    f.step(state.at + i * 90);
    const active = f.d.weakPoints();
    assert.equal(active.length, 1);
    assert.equal(active[0].index, i);
    assert.equal(f.d.transfer(active[0].id), 1.5);
  }
  assert.equal(f.d.bodyMultiplier(f.c.tick), 0.55);
});
test('Triplets have three independent keepers and a 185px beam gap; 95 damage interrupts the highlighted keeper', () => {
  const f = fixture('bell-triplets');
  f.d.prepare(f.c);
  assert.equal(props(f, 'keeper').length, 3);
  assert(f.d.independentBodies());
  f.cast();
  const keepers = props(f, 'keeper'),
    active = keepers.find((p) => p.active)!;
  assert.equal(keepers.filter((p) => p.active).length, 1);
  const beams = f.d.cues().filter((c) => c.kind === 'raid-lane');
  assert.equal(beams.length, 2);
  assert.equal(beams[1].x1 - beams[0].x2 - beams[0].width, 185);
  f.d.hit(active.id, 94, 0);
  assert(beams.every((b) => !b.disabled));
  f.d.hit(active.id, 1, 0);
  assert(beams.every((b) => b.disabled));
  f.d.reset('bell-triplets');
  assert.equal(props(f, 'keeper').length, 3, 'phase changes preserve separate keeper health');
});
test('Heart neutral F valve reverses one stream and deals exactly one 120 damage hit without class checks', () => {
  const f = fixture('quarantine-heart');
  f.cast();
  const valve = f.d
    .cues()
    .find(
      (c): c is Extract<RaidCue, { kind: 'raid-pad' }> =>
        c.kind === 'raid-pad' && c.style === 'valve',
    )!;
  Object.assign(f.c.targets[0], { x: valve.x, y: valve.y, oldX: valve.x, oldY: valve.y });
  f.c.interactors = ['p0'];
  f.step(44);
  assert.equal(f.bossHits.length, 0);
  f.step(45);
  assert.deepEqual(f.bossHits, [120]);
  assert(valve.disabled);
  const hoses = f.d.cues().filter((c) => c.kind === 'raid-lane');
  assert.equal(hoses.filter((h) => h.disabled).length, 1);
  assert.equal(f.d.bodyMultiplier(45), 1.5);
  f.step(70);
  assert.equal(f.bossHits.length, 1);
});
test('Procession moves four separate attendants, rests for four seconds and stops when an attendant falls', () => {
  const f = fixture('crown-procession');
  f.cast();
  const s = f.d.cues().find((c) => c.kind === 'raid-state')!,
    attendants = props(f, 'attendant');
  assert.equal(attendants.length, 4);
  f.step(s.at + 20);
  const x = f.c.boss.x;
  assert.notEqual(x, 800);
  assert.equal(attendants[0].x, f.c.boss.x - 85);
  f.d.hit(attendants[0].id, 90, f.c.tick);
  f.step(f.c.tick + 30);
  assert.equal(f.c.boss.x, x);
  assert.equal(f.d.bodyMultiplier(f.c.tick), 1.5);
  f.step(s.until - 120);
  const restX = f.c.boss.x;
  f.step(s.until - 1);
  assert.equal(f.c.boss.x, restX);
  assert.equal(f.d.bodyMultiplier(f.c.tick), 1.5);
});
test('City Eater leaves a 240px escape lane and two 120HP temporary walls expose the core', () => {
  const f = fixture('city-eater');
  f.cast();
  const lanes = f.d.cues().filter((c) => c.kind === 'raid-lane');
  const left = lanes[0].x1 + lanes[0].width / 2,
    right = lanes[1].x1 - lanes[1].width / 2;
  assert.equal(right - left, 240);
  const walls = props(f, 'wall');
  assert.equal(walls.length, 2);
  assert.equal(walls[0].health, 120);
  assert.equal(f.d.weakPoints().filter((p) => p.role === 'core').length, 0);
  f.d.hit(walls[0].id, 120, 0);
  const core = f.d.weakPoints().find((p) => p.role === 'core')!;
  assert(core.active);
  assert.equal(f.d.transfer(core.id), 1.5);
});
test('Saint shelters cancel inhalation and exhalation emits three actual sixteen-projectile waves', () => {
  const f = fixture('last-breath-saint');
  f.cast();
  const breath = f.d.cues().find((c) => c.kind === 'raid-state' && c.style === 'breath')!,
    shelter = f.d.cues().find((c) => c.kind === 'raid-pad')!;
  f.step(breath.at);
  assert.deepEqual(raidMovement(f.d.cues(), shelter, f.c.tick), { x: 0, y: 0 });
  assert.equal(
    Math.round(
      Math.hypot(...Object.values(raidMovement(f.d.cues(), { x: 800, y: 700 }, f.c.tick))),
    ),
    45,
  );
  assert.equal(f.shots.length, 0);
  f.step(breath.until);
  assert.equal(f.shots.length, 16);
  f.step(breath.until + 72);
  assert.equal(f.shots.length, 48);
});
test('Raid completes two distinct regular bosses and one reserved finale with concrete budgets, threats and maps', () => {
  for (let seed = 1; seed <= 12; seed++) {
    let g = new Game({ mode: 'raid', maxPlayers: 1, seed });
    g.addPlayer('p', 'Raid', 'soldier');
    g.start();
    const seen = new Set<string>();
    for (let n = 0; n < 3; n++) {
      assert(!seen.has(g.boss.id));
      seen.add(g.boss.id);
      assert.equal(g.boss.threat, bossThreat(g.boss.id).level);
      assert.equal(g.arena.id, ['ossuary-works', 'bell-foundry', 'crown-crypt'][n]);
      const p = [...g.players.values()][0];
      assert.equal(p.totalSp, [12, 20, 27][n]);
      assert.equal(p.incomeGranted, [600, 1400, 2400][n]);
      if (n === 2) assert(data.bossPools.raid.finale.includes(g.boss.id));
      else assert(data.bossPools.raid.regular.includes(g.boss.id));
      g.boss.health = 0;
      g.step();
      if (n === 2) {
        if(g.phase==='secretOffer')for(const survivor of g.players.values())g.vote(survivor.id,0);
        assert.equal(g.phase, 'victory');
        break;
      }
      g = Game.restoreOffline(g.offlineCheckpoint()!);
      g.phaseEnds = g.tick;
      g.step();
      assert(g.contractCards.every((c) => !seen.has(c.bossId!)));
      while (g.phase !== 'combat') {
        g.phaseEnds = g.tick;
        g.step();
      }
    }
  }
});
test('Raid health multiplier is 1.25 and old local protocol-10 saves migrate without claiming Raid content', () => {
  const ordinary = new Game({ mode: 'endless', maxPlayers: 1, openingBossId: 'chain-colossus' }),
    raid = new Game({ mode: 'raid', maxPlayers: 1 });
  ordinary.addPlayer('p', 'Base', 'soldier');
  raid.addPlayer('p', 'Raid', 'soldier');
  const baseSave = ordinary.offlineCheckpoint()!;
  baseSave.selectedContract.threat = 4;
  const base = Game.restoreOffline(baseSave);
  base.start();
  raid.start();
  assert.equal(raid.boss.maxHealth, base.boss.maxHealth * 1.25);
  const g = new Game({ mode: 'long', maxPlayers: 1 });
  g.addPlayer('p', 'Old', 'engineer');
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 10;
  assert.equal(Game.restoreOffline(old).offlineCheckpoint()!.protocolVersion, PROTOCOL);
  old.settings.mode = 'raid';
  assert.throws(() => Game.restoreOffline(old));
  old.settings.mode = 'long';
  old.settings.openingBossId = 'chain-colossus';
  assert.throws(() => Game.restoreOffline(old));
});
test('Raid weak hit transfers one 1.5 projectile hit without body double credit', () => {
  const g = new Game({ mode: 'raid', maxPlayers: 1, openingBossId: 'ossuary-leviathan' }),
    p = g.addPlayer('p', 'Ribs', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  advance(g, 61);
  g.boss.staggerUntil = 1e9;
  const rib = g.director.raids.weakPoints()[0];
  assert(rib);
  const before = g.boss.health,
    credit = p.damageDealt;
  const shot: Shot = {
    id: 900000,
    owner: p.id,
    x: rib.x,
    y: rib.y + 100,
    vx: 0,
    vy: -12000,
    radius: 3,
    damage: 10,
    pierce: 1,
    expires: 10000,
  };
  g.shots.set(shot.id, shot);
  g.step();
  assert(Math.abs(before - g.boss.health - 15) < 1e-8);
  assert(Math.abs(p.damageDealt - credit - 15) < 1e-8);
});
test('Raid pull prediction and authority agree through a dodge', () => {
  const g = new Game({ mode: 'raid', maxPlayers: 1 }),
    p = g.addPlayer('p', 'Pull', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  advance(g, 115);
  g.boss.staggerUntil = 1e9;
  const lane = g.director
    .cues()
    .find((c): c is Extract<RaidCue, { kind: 'raid-lane' }> => c.kind === 'raid-lane')!;
  assert(lane);
  p.x = lane.x1;
  p.y = (lane.y1 + lane.y2) / 2;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, p.id), p.id);
  for (let sequence = 1; sequence <= 30; sequence++) {
    const input = { ...idleInput(), sequence, moveY: 1, dodge: sequence === 15 };
    prediction.submit(input, viewOf(g, p.id));
    g.submitInput(p.id, input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-7);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-7);
  }
});
test('all seven Raid identities execute actual Normal and Brutal phases and clear signatures on victory', () => {
  for (const id of raidBossIds)
    for (const brutal of [false, true]) {
      const lobby = new Game({
        mode: 'endless',
        maxPlayers: 1,
        openingBossId: id,
        openingArenaId: 'ossuary-works',
      });
      lobby.addPlayer('p', 'Mara', 'soldier');
      const save = lobby.offlineCheckpoint()!;
      save.selectedContract.variant = brutal ? 'brutal' : 'normal';
      const g = Game.restoreOffline(save);
      g.start();
      [...g.players.values()][0].invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      for (let phase = 0; phase < (brutal ? 4 : 3); phase++) {
        if (phase) {
          g.boss.health =
            g.boss.maxHealth * (brutal ? [1, 0.74, 0.49, 0.24][phase] : [1, 0.74, 0.39][phase]);
          g.step();
          assert.equal(g.boss.phase, phase);
          assert.equal(g.accord,null);
          g.step();
        }
        let observed = false;
        for (let tick = 0; tick < 150; tick++) {
          g.step();
          observed ||= g.director.cues().some((c) => c.kind.startsWith('raid-'));
        }
        assert(observed, id + ' phase ' + phase);
      }
      g.boss.health = 0;
      g.step();
      assert.equal(g.director.cues().length, 0);
    }
});
