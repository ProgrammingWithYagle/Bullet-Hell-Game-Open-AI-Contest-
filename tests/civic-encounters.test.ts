import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, implementedBossIds } from '../src/shared/game.ts';
import { CivicDirector, civicBossIds, leaveClosingGates } from '../src/shared/civic-director.ts';
import { moveBody, segmentRect } from '../src/shared/geometry.ts';
import type { SignatureContext } from '../src/shared/boss-director.ts';
import { HZ, idleInput, type BossId, type Shot } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';

const until = (g: Game, check: () => boolean, max = 1200) => {
  for (let n = 0; n < max && !check(); n++) g.step();
  assert(check(), 'Encounter mechanic did not occur');
};
function encounter(id: BossId, brutal = false, arenaId = 'gatehouse') {
  const lobby = new Game({
    openingBossId: id,
    openingArenaId: arenaId,
    maxPlayers: 1,
    mode: 'endless',
    seed: 17,
  });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  save.selectedContract.variant = brutal ? 'brutal' : 'normal';
  const g = Game.restoreOffline(save);
  g.start();
  g.players.get('solo')!.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  return g;
}
function context(id: BossId): SignatureContext & { hits: { id: string; amount: number }[] } {
  let serial = 1;
  const hits: { id: string; amount: number }[] = [];
  return {
    tick: 1,
    bossId: id,
    boss: { x: 800, y: 300 },
    radius: 58,
    obstacles: [],
    targets: [{ id: 'p', x: 800, y: 800, oldX: 800, oldY: 800 }],
    damageScale: 1,
    brutal: false,
    phase: 0,
    id: () => serial++,
    damage: (id, amount) => hits.push({ id, amount }),
    spawnRat: () => {},
    hits,
  };
}
function fire(g: Game, x: number, y: number, vx: number, damage = 100): Shot {
  const shot = {
    id: 1000000 + g.combatTick,
    owner: 'solo',
    x,
    y,
    vx,
    vy: 0,
    radius: 3,
    damage,
    expires: g.combatTick + HZ,
    pierce: 0,
  };
  g.shots.set(shot.id, shot);
  return shot;
}

test('Tollkeeper locks both segments, reflects once at the wall and sweeps moving survivors only after its tell', () => {
  const d = new CivicDirector(),
    c = context('tollkeeper');
  d.resetEncounter(c.bossId);
  d.step(c, false);
  const cue = d.cues().find((q) => q.kind === 'wheel')!;
  assert(cue.kind === 'wheel');
  assert.equal(cue.path.length, 3);
  assert.equal(cue.at, 1 + Math.ceil(1.2 * HZ));
  assert(cue.path[1].y > 900 && cue.path[2].y < 100);
  const path = structuredClone(cue.path);
  c.targets[0].x = 100;
  for (c.tick = 2; c.tick < cue.at; c.tick++) d.step(c, false);
  assert.equal(c.hits.length, 0);
  assert.deepEqual(d.cues().find((q) => q.kind === 'wheel')!.kind, 'wheel');
  assert.deepEqual(
    (d.cues()[0] as typeof cue).path,
    path,
    'Tell must never follow a new target position',
  );
  c.targets[0] = { id: 'p', oldX: 650, oldY: 300, x: 950, y: 300 };
  d.step(c, false);
  assert(c.hits.length > 0, 'Swept player crossing must hit the active wheel');
  c.targets[0] = { id: 'p', oldX: 100, oldY: 500, x: 100, y: 500 };
  while (c.tick < cue.until) {
    c.tick++;
    d.step(c, false);
  }
  assert(
    !d.cues().some((q) => q.id === cue.id),
    'Wheel retires at the end of the reflected segment',
  );
});

test('Chain Marshal anchors absorb actual shots and breaking one cancels only its own sweep', () => {
  const g = encounter('chain-marshal');
  g.step();
  const chains = g.director.cues().filter((c) => c.kind === 'chain');
  assert.equal(chains.length, 2);
  const a = chains[0];
  assert(a.kind === 'chain');
  const bossHealth = g.boss.health,
    p = g.players.get('solo')!;
  fire(g, a.x - 80, a.y, 3000, 200);
  g.step();
  const broken = g.director.cues().find((c) => c.id === a.id)!;
  assert(broken.kind === 'chain');
  assert.equal(broken.health, 0);
  assert.equal(g.boss.health, bossHealth);
  assert.equal(p.damageDealt, 90);
  assert.equal(g.director.cues().filter((c) => c.kind === 'chain' && c.health > 0).length, 1);
  const d = new CivicDirector(),
    c = context('chain-marshal');
  d.resetEncounter(c.bossId);
  d.step(c, false);
  const first = d.weakPoints()[0];
  d.hit(first.id, 1000);
  const second = d.weakPoints()[0];
  c.tick = second.at;
  const arm=d.cues().find(q=>q.kind==='chain'&&q.id===second.id);assert(arm?.kind==='chain');
  const px=arm.x+Math.cos(arm.startAngle)*Math.min(200,arm.length*.7),py=arm.y+Math.sin(arm.startAngle)*Math.min(200,arm.length*.7);
  c.targets[0] = { id: 'p', x: px, y: py, oldX: px, oldY: py };
  d.step(c, false);
  assert(c.hits.length > 0, 'Unbroken anchor must still produce real contact damage');
  assert.equal(d.hit(first.id, 100), 0, 'Destroyed anchors never award repeated damage');
});

test('Widow rotates the open gate, blocks shots and movement, and ejects a closing overlap without trapping', () => {
  const d = new CivicDirector(),
    c = context('gate-widow');
  d.resetEncounter(c.bossId);
  d.step(c, false);
  const gates = d.cues().filter((q) => q.kind === 'gate');
  assert.equal(gates.length, 3);
  assert.equal(gates.filter((q) => q.open).length, 1);
  assert.equal(gates.find((q) => q.open)!.lane, 0);
  assert.equal(d.solids(c.tick).length, 0);
  c.tick = gates[0].at;
  d.step(c, false);
  const solids = d.solids(c.tick);
  assert.equal(solids.length, 2);
  const slab=solids[0],x=slab.x+slab.width/2;
  assert(segmentRect({x,y:slab.y-50},{x,y:slab.y+100},slab,3),'Closed gate absorbs swept shots');
  const blocked=moveBody({x,y:slab.y-65},{x:0,y:200},9,solids);
  assert(blocked.y<slab.y-9);
  const clear=leaveClosingGates({x,y:slab.y+slab.height/2},solids,9);
  assert(clear.y<slab.y-9||clear.y>slab.y+slab.height+9);
  const opening=gates.find(g=>g.open)!;
  const free=moveBody({x:opening.x+opening.width/2,y:slab.y-65},{x:0,y:200},9,solids);
  assert.equal(free.y,slab.y+135);
  c.tick = gates[0].until + 1;
  d.step(c, false);
  d.reset(c.bossId);
  c.tick++;
  d.step(c, false);
  const rotated = d.cues().find((q) => q.kind === 'gate' && q.open);
  assert(rotated?.kind === 'gate');
  assert.equal(rotated.lane, 1);
});

test('Widow collision prediction uses the same active shutters as the authoritative player step', () => {
  const g = encounter('gate-widow'),
    p = g.players.get('solo')!;
  g.step();
  until(g, () => g.director.solids(g.combatTick).length === 2);
  const slab=g.director.civic.solids(g.combatTick)[0];
  p.x=slab.x+slab.width/2;
  p.y=slab.y-40;
  p.oldX = p.x;
  p.oldY = p.y;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, p.id), p.id);
  for (let sequence = 1; sequence <= 20; sequence++) {
    const input = { ...idleInput(), sequence, moveY: 1 };
    prediction.submit(input, viewOf(g, p.id));
    g.submitInput(p.id, input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-7);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-7);
  }
  assert(p.y < slab.y - 9);
});

test('Ambulance patrols, locks and executes a charge, then exposes its driver for exactly three seconds', () => {
  const g = encounter('black-ambulance');
  const start = { x: g.boss.x, y: g.boss.y };
  for (let n = 0; n < 20; n++) g.step();
  assert(Math.hypot(g.boss.x - start.x, g.boss.y - start.y) > 10);
  until(g, () => g.director.cues().some((c) => c.kind === 'ambulance-lane'));
  const lane = g.director.cues().find((c) => c.kind === 'ambulance-lane')!;
  assert(lane.kind === 'ambulance-lane');
  const locked = { x: g.boss.x, y: g.boss.y };
  while (g.combatTick < lane.at - 1) g.step();
  assert.equal(g.boss.x, locked.x);
  assert.equal(g.boss.y, locked.y);
  until(g, () => g.director.cues().some((c) => c.kind === 'driver'));
  assert(!g.director.cues().some((c) => c.kind === 'trail'));
  const driver = g.director.cues().find((c) => c.kind === 'driver')!;
  assert(driver.kind === 'driver');
  assert.equal(driver.until - g.combatTick, HZ * 3);
  const recovery = { x: g.boss.x, y: g.boss.y },
    before = g.boss.health;
  fire(g, g.boss.x + 80, g.boss.y, -3000, 20);
  g.step();
  assert.equal(before - g.boss.health, 25, 'Recovery must create an actual damage window');
  while (g.combatTick < driver.until - 1) g.step();
  assert.equal(g.boss.x, recovery.x);
  assert.equal(g.boss.y, recovery.y);
  g.step();
  assert(!g.director.cues().some((c) => c.kind === 'driver'));
});

test('each civic boss executes its tier-appropriate phases without a Normal shield event and cleans on victory/deadline', () => {
  for (const id of civicBossIds)
    for (const brutal of [false, true]) {
      const g = encounter(id, brutal);
      g.boss.health = g.boss.maxHealth * 0.2;
      const definition=data.bosses.find(b=>b.id===id)!;
      const total=(brutal?definition.variants.brutal.phases:definition.phases).length;
      until(g, () => g.boss.phase === total-1 && !g.accord, 1400);
      assert.equal(g.phase, 'combat');
      assert.equal(g.boss.variant, brutal ? 'brutal' : 'normal');
      g.boss.health = 0;
      g.step();
      assert.equal(g.director.cues().length, 0);
      const failed = encounter(id, brutal);
      failed.boss.deadline = 1;
      failed.step();
      assert.equal(failed.phase, 'defeat');
      assert.equal(failed.director.cues().length, 0);
    }
  const normal = encounter('chain-marshal'),
    brutal = encounter('chain-marshal', true);
  normal.step();
  brutal.step();
  assert.equal(brutal.boss.maxHealth, normal.boss.maxHealth * 2);
  assert.equal(brutal.director.weakPoints()[0].health, 180);
});

test('Quarantine has four nonrepeating regular choices then an actual route finale and 27 SP', () => {
  for (const seed of [2, 81, 9001]) {
    const g = new Game({ maxPlayers: 1, seed });
    const p = g.addPlayer('solo', 'Mara', 'soldier');
    g.start();
    const seen = new Set<BossId>();
    for (let n = 0; n < 5; n++) {
      assert(!seen.has(g.boss.id));
      seen.add(g.boss.id);
      assert.equal(data.bosses.find((b) => b.id === g.boss.id)!.finale, n === 4);
      assert.equal(g.arena.id, data.modes.find((m) => m.id === 'short')!.arenas[n]);
      if (n === 4) assert.equal(p.totalSp, 27);
      g.boss.health = 0;
      g.step();
      if (n === 4) break;
      while (g.phase !== 'contractVote') g.step();
      assert(
        g.contractCards.every(
          (c) => data.bosses.find((b) => b.id === c.bossId)!.finale === (n === 3),
        ),
      );
      while ((g.phase as string) !== 'combat') g.step();
    }
    if(g.phase==='secretOffer')for(const survivor of g.players.values())g.vote(survivor.id,0);
        assert.equal(g.phase, 'victory');
    assert.equal(seen.size, 5);
  }
});

test('all six arena choices launch real collision layouts and survive a local boundary; old v6 stays Practice only', () => {
  for (const a of data.arenas) {
    const g = encounter('constable', false, a.id);
    assert.equal(g.arena.id, a.id);
    assert.equal(viewOf(g, 'solo').arenaId, a.id);
    assert.throws(() => new Game({ openingArenaId: 'invented' }));
  }
  const g = new Game({ maxPlayers: 1, openingBossId: 'courier' });
  g.addPlayer('solo', 'Mara', 'soldier');
  const save = JSON.parse(JSON.stringify(g.offlineCheckpoint()));
  save.protocolVersion = 6;
  assert.equal(Game.restoreOffline(save).settings.openingBossId, 'courier');
  const online = g.authoritativeCheckpoint()!;
  assert.throws(() => Game.restoreAuthoritative({ ...online, protocolVersion: 6 }));
  assert.equal(implementedBossIds.length, 66);
});
