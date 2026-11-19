import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data, type Player } from '../src/shared/game.ts';
import { HZ, idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { bastionIds, bastionRules, TankBastion, type BastionCue } from '../src/shared/tank-bastion.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(owners = ['tank'], allies = ['a', 'z'], fitting?: 'split' | 'corner', difficulty: 'baby' | 'hellish' = 'baby', late = false) {
  const game = new Game({ mode: 'short', seed: 41, difficulty, maxPlayers: 4, openingArenaId: 'gatehouse', arenaSelection: 'fixed' });
  if (fitting) game.encounter = late ? 2 : 1;
  for (const id of owners) {
    const owner = game.addPlayer(id, id, 'tank');
    for (const item of ['tank-protection-1', bastionIds.entry, ...(fitting ? [bastionIds[fitting]] : [])]) {
      assert(game.transact(owner.id, { id: item, kind: 'skill', item }).ok, item);
    }
    if (late) {
      const item = fitting === 'split' ? bastionIds.relief : bastionIds.countermarch;
      assert(game.transact(owner.id, { id: item, kind: 'skill', item }).ok, item);
    }
    if (fitting) {
      const before = [...owner.skills], item = bastionIds[fitting === 'split' ? 'corner' : 'split'];
      const denied = game.transact(owner.id, { id: item, kind: 'skill', item });
      assert.equal(denied.reason, 'incompatibleItem');
      assert.deepEqual(owner.skills, before);
    }
  }
  for (const id of allies) game.addPlayer(id, id, 'soldier');
  assert(game.start());
  game.boss.staggerUntil = 100_000;
  const player = (id: string) => game.players.get(id)!;
  const origin = game.arena.playerSpawn;
  const near = (x: number, y: number) => ({ x: origin.x + x, y: origin.y + y });
  function step(commands: Record<string, Partial<InputFrame>> = {}) {
    const acknowledged: Player[] = [];
    for (const p of game.players.values()) {
      if (!p.connected || p.status !== 'active') continue;
      const input = { ...idleInput(), aim: p.aim, ...commands[p.id], sequence: p.ack + 1, clientTick: game.combatTick };
      assert(game.submitInput(p.id, input), p.id);
      acknowledged.push(p);
    }
    const prior = acknowledged.map(p => p.ack);
    game.step();
    acknowledged.forEach((p, i) => assert.equal(p.ack, prior[i] + 1));
    return game.drainEvents();
  }
  function walk(goals: Record<string, Vec>) {
    for (let i = 0; i < 200; i++) {
      const commands: Record<string, Partial<InputFrame>> = {};
      for (const [id, target] of Object.entries(goals)) {
        const p = player(id), dx = target.x - p.x, dy = target.y - p.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.000001) continue;
        const scale = Math.max(distance, game.movementSpeed(p) / HZ);
        commands[id] = { moveX: dx / scale, moveY: dy / scale };
      }
      if (!Object.keys(commands).length) return;
      step(commands);
    }
    assert.fail('Actual walking never reached the staging points');
  }
  const cue = (id: string) => game.classCues().find((c): c is BastionCue => c.kind === 'tank-gate-signal' && c.owner === id);
  function plant(id: string) {
    const events = step({ [id]: { technique2: true, aim: 0 } });
    const gate = cue(id);
    assert(gate?.kind === 'tank-gate-signal');
    assert.equal(gate.at, game.combatTick);
    assert(events.some(e => e.type === 'sound' && e.id === 'tank-gate-plant' && e.owner === id));
    return gate;
  }
  const guard = (id: string) => game.classKits.status(id, game.combatTick);
  return { game, player, near, step, walk, cue, plant, guard };
}

test('the paid entry uses issued Ultimate timing and shares the planted sill while its readiness stays private', () => {
  const f = fixture(['tank'], ['a']);
  f.walk({ tank: f.near(42, 0), a: f.near(2, 0) });
  f.step({ tank: { aim: 0 } });
  assert.equal(viewOf(f.game, 'tank').players.find(p => p.id === 'tank')!.kit.bastionCanPlant, true);
  assert.equal(viewOf(f.game, 'a').players.find(p => p.id === 'tank')!.kit.bastionCanPlant, undefined);
  const gate = f.plant('tank'), tank = f.player('tank');
  const ability = data.classes.find(c => c.id === 'tank')!.ultimate;
  assert.equal(tank.totalSp, 3);
  assert.equal(tank.ultimateAt, gate.at + Math.ceil(HZ * ability.cooldown * f.game.stats(tank).ultimateCooldown));
  assert.equal(gate.until, gate.at + Math.ceil(HZ * ability.duration));
  for (const id of ['tank', 'a']) assert.deepEqual(viewOf(f.game, id).classCues.find(c => c.id === gate.id), gate);
  assert.equal(f.guard('a').armor, 0);
  const events = f.step({ a: { moveX: -1 } });
  assert.deepEqual(events.flatMap(e => e.type === 'sound' && e.id === 'tank-gate-claim' ? [e.owner] : []), ['a']);
  assert.equal(f.guard('a').armorUntil, gate.until);
  assert.equal(f.cue('tank'), undefined);
});

test('simultaneous ordinary Ultimate wins, while motion and unowned Action 2 spend no recovery', () => {
  const f = fixture(['tank'], ['a']);
  f.walk({ tank: f.near(42, 0) });
  f.step({ tank: { moveX: 0.25, technique2: true, aim: 0 }, a: { technique2: true } });
  assert.equal(f.player('tank').ultimateAt, 0);
  assert.equal(f.player('a').ultimateAt, 0);
  assert.equal(f.cue('tank'), undefined);
  f.step({ tank: { ultimate: true, technique2: true, aim: 0 } });
  assert(f.player('tank').ultimateAt > f.game.combatTick);
  assert(f.guard('tank').armor > 0);
  assert.equal(f.cue('tank'), undefined);
});

for (const owners of [['far', 'near'], ['near', 'far']]) {
  test('one walked segment claims the gate reached first with planting order ' + owners.join(', '), () => {
    const f = fixture(owners, ['a']);
    f.walk({ far: f.near(42, -22), near: f.near(44, 22), a: f.near(5, 0) });
    const stations = owners.map(id => f.plant(id));
    const nearest = stations.find(gate => gate.owner === 'near')!;
    f.step({ a: { moveX: -1 } });
    assert(f.player('a').oldX > nearest.x && f.player('a').x < f.near(0, 0).x);
    assert.equal(f.guard('a').armorUntil, nearest.until);
    assert(f.cue('far'));
    assert.equal(f.cue('near'), undefined);
  });
}

test('Split Watch serves two halves in the same tick, and the opposite fitting rejects without charge', () => {
  const f = fixture(['tank'], ['a', 'z'], 'split');
  f.walk({ tank: f.near(42, 0), a: f.near(2, -30), z: f.near(4, 30) });
  assert.deepEqual(f.plant('tank').entrances.map(face => face.half), ['left', 'right']);
  f.step({ a: { moveX: -1 }, z: { moveX: -1 } });
  assert.equal(f.guard('a').armor, 0.175);
  assert.equal(f.guard('z').armor, 0.175);
  assert.equal(f.cue('tank'), undefined);
});

test('Corner Post has two perpendicular entrances into one reserve', () => {
  const f = fixture(['tank'], ['a', 'z'], 'corner');
  f.walk({ tank: f.near(42, 0), a: f.near(6, -22), z: f.near(-22, 2) });
  const gate = f.plant('tank');
  assert.deepEqual(gate.entrances.map(face => face.aim), [0, Math.PI / 2]);
  f.step({ a: { moveX: -1 }, z: { moveY: -1 } });
  assert.equal(f.guard('a').armor, 0);
  assert.equal(f.guard('z').armor, 0.35);
  assert.equal(f.cue('tank'), undefined);
});

test('a dodge can cross but cannot claim, and disconnect immediately retires the unclaimed gate', () => {
  const f = fixture(['tank'], ['a']);
  f.walk({ tank: f.near(42, 0), a: f.near(2, 0) });
  const gate = f.plant('tank');
  f.step({ a: { moveX: -1, dodge: true, aim: Math.PI } });
  assert(f.player('a').x < gate.x);
  assert.equal(f.guard('a').armor, 0);
  assert.equal(f.cue('tank')?.id, gate.id);
  f.game.setConnected('tank', false);
  assert.equal(f.cue('tank'), undefined);
  assert(f.player('tank').ultimateAt > f.game.combatTick);
});

test('Hellish guard retains the difficulty shield cap and the original expiry', () => {
  const f = fixture(['tank'], ['a'], undefined, 'hellish');
  f.walk({ tank: f.near(42, 0), a: f.near(2, 0) });
  const gate = f.plant('tank');
  f.step({ a: { moveX: -1 } });
  assert.equal(f.guard('a').shield, 0);
  assert.equal(f.player('a').shield, 0);
  assert(f.guard('a').armor > 0);
  while (f.game.combatTick < gate.until) f.step();
  assert.equal(f.guard('a').armor, 0);
});

test('full gate footprint rejects a small obstacle or lava pocket inside an otherwise clear placement', () => {
  const controller = new TankBastion(() => 1);
  const owner = { id: 'tank', x: 142, y: 100, aim: 0, classId: 'tank', connected: true,
    status: 'active', skills: [bastionIds.entry], ultimateAt: 0 };
  const world = { tick: 1, playerRadius: data.rules.playerRadius, bounds: { x: 0, y: 0, width: 350, height: 350 },
    obstacles: [], lavaPits: [] };
  assert.equal(owner.x - bastionRules.lead, 100);
  assert(controller.canPlant(owner, world));
  assert(!controller.canPlant(owner, { ...world, obstacles: [{ x: 114, y: 127, width: 1, height: 1 }] }));
  assert(!controller.canPlant(owner, { ...world, lavaPits: [{ x: 117, y: 128, radius: 2 }] }));
  const guard = { shield: 120, armor: 0.35, until: 241 };
  assert.equal(controller.plant(owner, guard, 2850, { ...world, bounds: { ...world.bounds, x: 64 } }), undefined);
  assert.equal(owner.ultimateAt, 0);
});

test('Relief Watch moves the surviving reserve to the spent half after this interval’s walks', () => {
  const f = fixture(['tank'], ['a', 'z'], 'split', 'baby', true);
  const tank = f.player('tank');
  assert.equal(tank.totalSp, 15);
  f.walk({ tank: f.near(42, 0), a: f.near(2, -30), z: f.near(2, -30) });
  const gate = f.plant('tank');
  const recovery = tank.ultimateAt;
  f.step({ a: { moveX: -1 } });
  assert.equal(f.guard('a').armor, 0.175);
  f.walk({ tank: f.near(16, -30) });
  f.walk({ tank: f.near(-19, -30) });
  f.step({ tank: { aim: 0 } });
  assert.equal(viewOf(f.game, 'tank').players.find(p => p.id === 'tank')!.kit.bastionAdjustment, 'relief');
  assert.equal(viewOf(f.game, 'a').players.find(p => p.id === 'tank')!.kit.bastionAdjustment, undefined);
  const simultaneous = f.step({ tank: { aim: 0, technique2: true }, z: { moveX: -1 } });
  assert(simultaneous.some(event => event.type === 'sound' && event.owner === 'tank' && event.id === 'tank-gate-adjust'));
  assert.equal(f.guard('z').armor, 0);
  const marked = f.cue('tank');
  assert.deepEqual(marked, { ...gate, entrances: gate.entrances.map((face, index) => ({ ...face, open: index === 0 })) });
  assert.equal(tank.ultimateAt, recovery);
  assert.equal(f.game.kitStatus('tank').bastionAdjustment, undefined);
  f.walk({ z: f.near(2, -30) });
  f.step({ z: { moveX: -1 } });
  assert.equal(f.guard('z').armor, 0.175);
  assert.equal(f.guard('z').armorUntil, gate.until);
  assert.equal(f.cue('tank'), undefined);
});

test('a real crossing of the old open half takes priority over Relief Watch', () => {
  const f = fixture(['tank'], ['a', 'z'], 'split', 'baby', true);
  f.walk({ tank: f.near(42, 0), a: f.near(2, -30), z: f.near(2, 30) });
  const gate = f.plant('tank');
  f.step({ a: { moveX: -1 } });
  f.walk({ tank: f.near(16, -30) });
  f.walk({ tank: f.near(-19, -30) });
  f.step({ tank: { aim: 0 } });
  assert.equal(f.game.kitStatus('tank').bastionAdjustment, 'relief');
  const signals = f.step({ tank: { aim: 0, technique2: true }, z: { moveX: -1 } });
  assert(!signals.some(event => event.type === 'sound' && event.id === 'tank-gate-adjust'));
  assert.equal(f.guard('z').armorUntil, gate.until);
  assert.equal(f.cue('tank'), undefined);
});

test('Countermarch reverses the perpendicular Corner Post approach without refreshing the guard', () => {
  const f = fixture(['tank'], ['a'], 'corner', 'hellish', true);
  const tank = f.player('tank');
  f.walk({ tank: f.near(42, 0), a: f.near(32, -18) });
  const gate = f.plant('tank'), recovery = tank.ultimateAt;
  f.walk({ tank: f.near(32, -19) });
  f.step({ tank: { aim: -Math.PI / 2 } });
  assert.equal(f.game.kitStatus('tank').bastionAdjustment, 'turn');
  f.step({ tank: { technique2: true, ultimate: true, aim: -Math.PI / 2 } });
  assert.deepEqual(f.cue('tank'), gate);
  f.step({ tank: { technique2: true, aim: -Math.PI / 2 } });
  const reversed = f.cue('tank')!;
  assert.equal(reversed.id, gate.id);
  assert.equal(reversed.until, gate.until);
  assert.equal(tank.ultimateAt, recovery);
  assert.equal(f.game.kitStatus('tank').bastionAdjustment, undefined);
  assert.deepEqual(reversed.entrances[0], gate.entrances[0]);
  assert.equal(reversed.entrances[1].aim, -Math.PI / 2);
  f.walk({ a: f.near(32, 18) });
  assert.equal(f.guard('a').shield, 0);
  assert.equal(f.guard('a').armor, 0.35);
  assert.equal(f.guard('a').armorUntil, gate.until);
  assert.equal(f.cue('tank'), undefined);
});

test('late fittings require the corresponding owned route and later earnings', () => {
  const game = new Game({ mode: 'short' });
  game.encounter = 1;
  const tank = game.addPlayer('solo', 'solo', 'tank');
  const buy = (item: string) => game.transact(tank.id, { id: item, kind: 'skill', item });
  for (const item of ['tank-protection-1', bastionIds.entry, bastionIds.split]) assert(buy(item).ok, item);
  assert.equal(tank.totalSp, 9);
  assert.equal(buy(bastionIds.relief).reason, 'insufficientPoints');
  assert.equal(buy(bastionIds.countermarch).reason, 'prerequisite');
  assert.deepEqual(tank.skills, ['tank-protection-1', bastionIds.entry, bastionIds.split]);
});
