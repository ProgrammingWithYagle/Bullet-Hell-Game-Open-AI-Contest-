import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, implementedBossIds } from '../src/shared/game.ts';
import { HZ, type BossId, type Shot } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { encounterFrame } from '../src/client/encounter-presentation.ts';

function encounter(id: BossId, brutal = false,difficulty='normal') {
  const lobby = new Game({
    openingBossId: id,difficulty,
    maxPlayers: 1,
    mode: 'endless',
    seed: 543,
  });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  save.selectedContract.variant = brutal ? 'brutal' : 'normal';
  const game = Game.restoreOffline(save);
  game.start();
  game.players.get('solo')!.invulnerableUntil = 1e9;
  game.boss.deadline = 1e9;
  return game;
}
function until(game: Game, check: () => boolean, maximum = 1200) {
  for (let n = 0; n < maximum && !check(); n++) game.step();
  assert(check(), 'Timed out waiting for encounter mechanic');
}
function shot(game: Game, definition: Partial<Shot> & Pick<Shot, 'x' | 'y'>) {
  const value: Shot = {
    id: 1000000 + game.combatTick,
    owner: 'solo',
    vx: 0,
    vy: 0,
    radius: 3,
    damage: 100,
    expires: game.combatTick + HZ * 2,
    pierce: 0,
    ...definition,
  };
  game.shots.set(value.id, value);
  return value;
}

test('five-fight Quarantine keeps five distinct bosses for every opening identity and saved vote', () => {
  for (const openingBossId of implementedBossIds.filter((id) => id !== 'uncounted'))
    for (const seed of [1, 19, 871]) {
      let game = new Game({ openingBossId, seed, maxPlayers: 1 });
      game.addPlayer('solo', 'Mara', 'soldier');
      game.start();
      const seen = new Set<BossId>();
      for (let fight = 0; fight < 5; fight++) {
        assert(!seen.has(game.boss.id));
        seen.add(game.boss.id);
        assert.equal(game.boss.variant, 'normal');
        game.boss.health = 0;
        game.step();
        if (fight === 4) break;
        while (game.phase !== 'contractVote') game.step();
        assert(game.contractCards.every((card) => !seen.has(card.bossId!)));
        const publicView = viewOf(game, 'solo');
        assert(publicView.contractCards.every((card) => !('bossId' in card)));
        const restored = Game.restoreOffline(game.offlineCheckpoint());
        assert.deepEqual(restored.contractCards, game.contractCards);
        game = restored;
        while ((game.phase as string) !== 'combat') game.step();
      }
      if(game.phase==='secretOffer')for(const survivor of game.players.values())game.vote(survivor.id,0);
        assert.equal(game.phase, 'victory');
      assert.equal(seen.size, 5);
    }
});

test('Endless marks previously defeated candidates Brutal and excludes the last twelve identities', () => {
  const game = encounter('constable');
  const seen = new Map<BossId,number>(),
    recent: BossId[] = [];
  for (let fight = 0; fight < 100; fight++) {
    const last = game.boss.id;
    assert.equal(game.boss.variant,['normal','brutal','crazed'][Math.min(2,seen.get(game.boss.id)??0)]);
    assert(!recent.slice(-12).includes(game.boss.id));
    seen.set(game.boss.id,(seen.get(game.boss.id)??0)+1);
    recent.push(game.boss.id);
    game.boss.health = 0;
    game.step();
    while (game.phase !== 'contractVote') game.step();
    assert(game.contractCards.every((c) => c.bossId !== last));
    while ((game.phase as string) !== 'combat') game.step();
    assert.notEqual(game.boss.id, last);
  }
});

test('Courier locks a harmless charge warning then actually moves along that lane and leaves an expiring trail', () => {
  const game = encounter('courier'),
    p = game.players.get('solo')!;
  until(game, () => game.director.cues().some((c) => c.kind === 'charge'));
  const lane = game.director.cues().find((c) => c.kind === 'charge')!;
  assert(lane.kind === 'charge');
  const origin = { x: game.boss.x, y: game.boss.y };
  p.x = 1300;
  p.y = 850;
  while (game.combatTick < lane.at - 1) game.step();
  assert.equal(game.boss.x, origin.x);
  assert.equal(game.boss.y, origin.y);
  assert.deepEqual(
    game.director.cues().find((c) => c.kind === 'charge'),
    lane,
    'warning must not retarget',
  );
  game.step();
  assert(Math.hypot(game.boss.x - origin.x, game.boss.y - origin.y) > 0);
  const cross =
    (game.boss.x - origin.x) * (lane.y2 - origin.y) -
    (game.boss.y - origin.y) * (lane.x2 - origin.x);
  assert(Math.abs(cross) < 1e-7);
  until(game, () => !game.director.charging);
  const trail = game.director.cues().find((c) => c.kind === 'trail');
  assert(trail?.kind === 'trail');
  assert.equal(trail.width, 32);
  p.x = (trail.x1 + trail.x2) / 2;
  p.y = (trail.y1 + trail.y2) / 2;
  p.invulnerableUntil = 0;
  const health = p.health;
  game.step();
  assert(p.health < health, 'trail must deal actual damage');
  const trailId = trail.id;
  while (game.combatTick <= trail.until) game.step();
  assert(!game.director.cues().some((c) => c.kind === 'trail' && c.id === trailId));
});

test('Ratcatcher summons three locked packs of four real rats, respects its cap and serializes their lanes', () => {
  const game = encounter('ratcatcher');
  until(game, () => game.director.cues().some((c) => c.kind === 'scent'));
  const lanes = game.director.cues().filter((c) => c.kind === 'scent');
  assert.equal(lanes.length, 3);
  assert.equal(game.minions.actors.size, 0);
  until(game, () => game.minions.actors.size > 0);
  assert.equal(game.minions.actors.size, 12);
  const view = viewOf(game, 'solo');
  assert.equal(view.minions.length, 12);
  assert(view.bossCues.some((c) => c.kind === 'sack'));
  for (const rat of game.minions.actors.values()) {
    assert.equal(rat.health, 12);
    assert.equal(rat.kind, 'rat');
    assert(rat.goalX !== undefined);
    assert(lanes.some((l) => l.kind === 'scent' && l.x2 === rat.goalX && l.y2 === rat.goalY));
  }
  for (let n = 0; n < 700; n++) {
    game.step();
    assert(game.minions.actors.size <= 12);
  }
});

test('shooting the 65-HP sack interrupts the warned pack without also damaging the boss, then the sack recovers', () => {
  const game = encounter('ratcatcher'),
    p = game.players.get('solo')!;
  until(game, () => game.director.cues().some((c) => c.kind === 'scent'));
  const sack = game.director.weakPoint()!;
  assert.equal(sack.health, 65);
  const hp = game.boss.health;
  shot(game, { x: sack.x, y: sack.y });
  game.step();
  assert.equal(game.director.weakPoint()!.health, 0);
  assert.equal(game.boss.health, hp);
  assert.equal(p.damageDealt, 65);
  const lanes = game.director.cues().filter((c) => c.kind === 'scent');
  assert(lanes.every((l) => l.kind === 'scent' && l.interrupted));
  const release = Math.max(...lanes.map((l) => (l.kind === 'scent' ? l.at : 0)));
  while (game.combatTick <= release) game.step();
  assert.equal(game.minions.actors.size, 0);
  until(game, () => game.director.weakPoint()!.health === 65);
  until(game, () => game.minions.actors.size === 12);
});

test('Clerk stamps three non-overlapping zones in order and reopens the first as a real safe interior', () => {
  const game = encounter('quarantine-clerk'),
    p = game.players.get('solo')!;
  until(game, () => game.director.cues().some((c) => c.kind === 'stamp'));
  const zones = game.director.cues().filter((c) => c.kind === 'stamp');
  assert.equal(zones.length, 3);
  assert(zones.every((z) => z.kind === 'stamp'));
  const first = zones[0];
  assert(first.kind === 'stamp');
  assert.deepEqual(
    zones.map((z) => (z.kind === 'stamp' ? z.index : 0)),
    [1, 2, 3],
  );
  assert.equal(zones[1].kind === 'stamp' ? zones[1].at - first.at : 0, Math.ceil(0.65 * HZ));
  for (const a of zones)
    for (const b of zones)
      if (a !== b) assert(Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius);
  p.x = first.x;
  p.y = first.y;
  p.invulnerableUntil = 0;
  const initial = p.health;
  while (game.combatTick < first.at) game.step();
  assert(p.health < initial);
  while (game.combatTick < first.safeAt) game.step();
  assert(game.director.isSafe(p, game.combatTick));
  p.invulnerableUntil = 0;
  const before = p.health;
  game.damage(p, 50);
  assert.equal(p.health, before);
  const bullet = shot(game, {
    owner: 'hostile',
    x: first.x + 110,
    y: first.y,
    vx: -300,
    damage: 50,
  });
  for (let n = 0; n < 10; n++) game.step();
  assert(!game.shots.has(bullet.id));
  assert.equal(p.health, before);
  p.x = first.x + first.radius;
  p.invulnerableUntil = 0;
  game.damage(p, 5);
  assert(p.health < before, 'safe interior must include the entire body');
});

test('early bosses have two phases retaining stronger Brutal sacks/rats and the Clerk final echo', () => {
  for (const id of ['courier', 'ratcatcher', 'quarantine-clerk'] as const) {
    const normal = encounter(id),
      brutal = encounter(id, true);
    assert.equal(brutal.boss.maxHealth, normal.boss.maxHealth * 2);
    brutal.boss.health = brutal.boss.maxHealth * 0.2;
    let echoed = false, patrolId = 0;
    const seenInCast = new Set<number>();
    for (let n = 0; n < 1700; n++) {
      brutal.step();
      const cues = brutal.director.cues(), patrol = cues.find(c=>c.kind==='clerk-patrol');
      if (patrol && patrol.id !== patrolId) { patrolId=patrol.id;seenInCast.clear(); }
      const field = cues.filter(c=>c.kind==='stamp');
      assert(field.length <= 5);
      for (const stamp of field) seenInCast.add(stamp.id);
      if (seenInCast.size >= 10) echoed = true;
    }
    assert.equal(brutal.boss.phase, 1);
    assert.equal(brutal.phase, 'combat');
    if (id === 'quarantine-clerk') assert(echoed);
    if (id === 'ratcatcher') {
      assert.equal(brutal.director.weakPoint()!.maxHealth, 130);
      assert([...brutal.minions.actors.values()].every((r) => r.maxHealth === 24));
    }
  }
});

test('Easy Standard Accord cancels signature hazards/adds and resumes with a full fresh warning', () => {
  for (const id of ['courier', 'ratcatcher', 'quarantine-clerk'] as const) {
    const game = encounter(id,false,'easy'),
      p = game.players.get('solo')!;
    game.boss.health = game.boss.maxHealth * 0.49;
    game.step();
    assert(game.accord);
    p.x = game.accord.points[0].x;
    p.y = game.accord.points[0].y;
    until(game, () => game.boss.staggerUntil > game.combatTick);
    assert.equal(game.director.cues().filter((c) => c.kind !== 'sack').length, 0);
    assert.equal(game.minions.actors.size, 0);
    while (game.combatTick < game.boss.staggerUntil - 1) game.step();
    assert.equal(game.director.cues().filter((c) => c.kind !== 'sack').length, 0);
    game.step();
    until(game, () =>
      game.director.cues().some((c) => ['charge', 'scent', 'stamp'].includes(c.kind)),
    );
    const cue = game.director.cues().find((c) => ['charge', 'scent', 'stamp'].includes(c.kind))!;
    assert('at' in cue && cue.at - game.combatTick >= Math.ceil(0.85 * HZ));
  }
});

test('protocol-5 Heavy Practice boundaries retain builds and two-boss history; online v5 remains rejected', () => {
  const game = new Game({ maxPlayers: 1 });
  game.addPlayer('solo', 'Hux', 'heavy');
  game.start();
  game.boss.health = 0;
  game.step();
  const save = JSON.parse(JSON.stringify(game.offlineCheckpoint()));
  save.protocolVersion = 5;
  const before = JSON.stringify(save),
    restored = Game.restoreOffline(save);
  assert.equal(JSON.stringify(save), before);
  assert.deepEqual([...restored.completedBossIds], ['constable']);
  assert.equal(restored.players.get('solo')!.coins, game.players.get('solo')!.coins);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...game.authoritativeCheckpoint()!,
      protocolVersion: 5,
    }),
  );
});

test('signature art follows real cue time and respects reduced motion', () => {
  for (const id of ['courier', 'ratcatcher', 'quarantine-clerk'] as const) {
    const game = encounter(id);
    until(game, () =>
      game.director.cues().some((c) => ['charge', 'scent', 'stamp'].includes(c.kind)),
    );
    assert(encounterFrame(game.boss, game.combatTick, game.director.cues()) > 0);
    assert.equal(
      encounterFrame(game.boss, game.combatTick, game.director.cues(), true),
      id === 'courier' ? 7 : 0,
    );
  }
});
