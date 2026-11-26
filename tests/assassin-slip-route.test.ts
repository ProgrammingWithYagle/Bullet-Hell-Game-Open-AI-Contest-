import assert from 'node:assert/strict';
import { test } from 'node:test';
import { infiltratorIds, slipRouteId, slipRouteRules } from '../src/shared/assassin-slip-route.ts';
import { Game } from '../src/shared/game.ts';
import { distance, type Rect } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const handle = { technique2: true };
const origin = { x: 550, y: 423 };
const screen = { x: 630, y: 450, width: 80, height: 170 };
const aim = Math.atan2(screen.y - origin.y, screen.x - origin.x);
const position = ({ x, y }: Vec) => ({ x, y });

function scenario(owned = true, decoyVeil = false, fitting?: 'relay' | 'threshold') {
  const game = new Game({ mode: 'short', seed: 41, difficulty: 'normal', arenaSelection: 'fixed', openingArenaId: 'gatehouse', maxPlayers: 2 });
  if (decoyVeil || fitting) game.encounter = 1;
  const owner = game.addPlayer('owner', 'Nyx', 'assassin');
  const ally = game.addPlayer('ally', 'Lane', 'soldier');
  const buy = (item: string) => assert(game.transact(owner.id, { id: item, kind: 'skill', item }).ok, item);
  buy('assassin-ambush-1');
  if (owned) buy(slipRouteId);
  if (decoyVeil) for (const depth of [1, 2, 3]) buy('assassin-ambush-path-2-' + depth);
  if (fitting) {
    buy(infiltratorIds[fitting]);
    const other = infiltratorIds[fitting === 'relay' ? 'threshold' : 'relay'];
    assert.equal(game.transact(owner.id, { id: other, kind: 'skill', item: other }).reason, 'incompatibleItem');
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [{ ...screen }] as Rect[];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(owner, origin);
  Object.assign(ally, { x: 490, y: 700 });
  Object.assign(game.boss, { x: 1290, y: 700, staggerUntil: 5000, deadline: 5000 });
  const hostile = game.minions.spawn(990001, { kind: 'ordinary', x: 755, y: 420, health: 1000,
    speed: 0, radius: 10, damage: 0 }, game.combatTick)!;

  function tick(input: Partial<InputFrame> = {}) {
    for (const actor of [owner, ally]) if (actor.connected) {
      assert(game.submitInput(actor.id, { ...idleInput(), aim, sequence: actor.ack + 1, clientTick: game.combatTick,
        ...(actor === owner ? input : {}) }));
    }
    game.step();
    return game.drainEvents().flatMap(event => event.type === 'sound' && event.owner === owner.id ? [event.id] : []);
  }
  const status = () => game.kitStatus(owner.id).slipRoute;
  const veil = () => game.kitStatus(owner.id).veilUntil;
  const echoes = () => game.classKits.constructs().filter(cue => cue.kind === 'decoy' && cue.owner === owner.id);
  function walkExit() {
    const sounds: string[] = [];
    for (let i = 0; i < 22 && status()?.phase !== 'exit'; i++) sounds.push(...tick({ moveY: 1 }));
    assert(sounds.includes('assassin-slip-break'));
    assert.equal(status()?.phase, 'exit');
  }
  return { game, owner, ally, arena, hostile, tick, status, veil, echoes, walkExit };
}

test('Slip Route uses the ordinary Q on entry and trades only existing veil after a real closed line', () => {
  const trial = scenario();
  const baseline = scenario(false);
  const start = trial.tick(handle);
  baseline.tick({ q: true });
  assert(start.includes('assassin-slip-mark'));
  assert.equal(trial.owner.qAt, baseline.owner.qAt);
  assert.equal(trial.veil(), baseline.veil());
  assert.equal(trial.status()?.phase, 'walk');
  const originalPayment = trial.owner.qAt;
  const originalVeil = trial.veil()!;
  assert.equal(trial.echoes().length, 0);
  assert(!trial.tick(handle).includes('assassin-slip-exchange'));
  trial.walkExit();
  const standing = position(trial.owner);
  assert(distance(standing, origin) >= slipRouteRules.leaveDistance);
  const exchange = trial.tick(handle);
  assert(exchange.includes('assassin-slip-exchange'));
  assert.deepEqual(position(trial.owner), standing);
  assert.equal(trial.owner.qAt, originalPayment);
  assert.equal(trial.status()?.phase, 'idle');
  assert.equal(trial.veil(), trial.game.combatTick + slipRouteRules.retainedVeilTicks);
  const [echo] = trial.echoes();
  assert(echo.slipRouteEcho && echo.until < originalVeil);
  assert.deepEqual(position(echo), origin);
  assert.equal(echo.until, trial.game.combatTick + slipRouteRules.echoTicks);
  assert.equal(echo.health, slipRouteRules.echoHealth);
  assert(trial.game['aimTargets']().some(actor => actor.id === 'decoy:' + echo.id));
  assert(!trial.game['aimTargets']().some(actor => actor.id === trial.owner.id));
  assert(trial.game['emitShot']('hostile', echo.x - 8, echo.y, 0, 30, 14, 4, 0, 1));
  trial.tick();
  assert.equal(trial.echoes()[0].health, slipRouteRules.echoHealth - 14);
});

test('Enemy motion does not give a route break and ordinary abilities retain their old controls', () => {
  const simultaneous = scenario();
  assert(!simultaneous.tick({ ...handle, q: true }).includes('assassin-slip-mark'));
  assert(simultaneous.owner.qAt > 0 && simultaneous.veil()! > 0);
  assert.equal(simultaneous.status()?.phase, 'idle');

  const trial = scenario();
  trial.tick(handle);
  trial.hostile.y = 635;
  for (let i = 0; i < 6; i++) assert(!trial.tick().includes('assassin-slip-break'));
  assert.equal(trial.status()?.bentAt, undefined);
  assert.equal(trial.status()?.progress, 0);
  assert(trial.tick({ ...handle, e: true, aim: Math.PI }).includes('assassin-slip-lost'));
  assert(trial.owner.eAt > 0);
  assert.equal(trial.echoes().length, 0);

  const open = scenario();
  open.arena.obstacles.length = 0;
  assert(!open.tick(handle).includes('assassin-slip-mark'));
  assert.equal(open.owner.qAt, 0);
});

test('Invisibility does not absorb an existing shot and the planned route is owner data', () => {
  const trial = scenario();
  while (trial.game.combatTick < trial.owner.invulnerableUntil) trial.tick();
  assert(trial.tick(handle).includes('assassin-slip-mark'));
  const own = viewOf(trial.game, trial.owner.id);
  const other = viewOf(trial.game, trial.ally.id);
  assert.equal(own.players.find(row => row.id === trial.owner.id)?.kit.slipRoute?.phase, 'walk');
  assert.equal(other.players.find(row => row.id === trial.owner.id)?.kit.slipRoute, undefined);
  const health = trial.owner.health;
  assert(trial.game['emitShot']('hostile', trial.owner.x - 7, trial.owner.y, 0, 30, 14, 4, 0, 1));
  trial.tick();
  assert(trial.owner.health < health);
  trial.game.setConnected(trial.owner.id, false);
  assert.equal(trial.status()?.phase, 'idle');
  assert.equal(trial.echoes().length, 0);
});

test('An earned Decoy Veil is moved as the same wounded body and a destroyed one stays gone', () => {
  const trial = scenario(true, true);
  trial.tick(handle);
  const [decoy] = trial.echoes();
  assert.equal(decoy.health, 60);
  assert(trial.game['emitShot']('hostile', decoy.x - 8, decoy.y, 0, 30, 9, 4, 0, 1));
  trial.tick();
  const health = trial.echoes()[0].health;
  assert(health < 60 && health > 0);
  trial.walkExit();
  const bend = trial.status()!.bentAt!;
  assert(distance(bend, decoy) > 10);
  assert(trial.tick(handle).includes('assassin-slip-exchange'));
  const [moved] = trial.echoes();
  assert.equal(moved.id, decoy.id);
  assert.equal(moved.health, health);
  assert.deepEqual(position(moved), bend);
  trial.game.setConnected(trial.owner.id, false);
  trial.tick();
  assert.equal(trial.echoes().length, 0);

  const lost = scenario(true, true);
  lost.tick(handle);
  lost.game.classKits.hitConstruct(lost.echoes()[0].id, 100);
  for (let i = 0; i < 15; i++) lost.tick({ moveY: 1 });
  const regularVeil = lost.veil();
  assert(!lost.tick(handle).includes('assassin-slip-exchange'));
  assert.equal(lost.veil(), regularVeil);
  assert.equal(lost.echoes().length, 0);
});

test('Footstep Relay advances the same damaged echo along actual steps and stops at a new obstruction', () => {
  const trial = scenario(true, false, 'relay');
  trial.tick(handle);
  trial.walkExit();
  trial.tick(handle);
  assert.equal(trial.status()?.phase, 'relay');
  const [echo] = trial.echoes();
  const until = echo.until;
  const paid = trial.owner.qAt;
  const health = echo.health - 9;
  trial.game.classKits.hitConstruct(echo.id, 9);
  const waypoint = trial.status()!.relayTo!;
  const owner = position(trial.owner);
  assert.equal(distance(waypoint, origin), distance(owner, origin));
  assert(trial.tick(handle).includes('assassin-slip-relay'));
  const first = position(trial.echoes()[0]);
  assert.equal(first.x, origin.x);
  assert.equal(distance(first, origin), slipRouteRules.relayStride);
  assert.equal(trial.status()?.phase, 'relaying');
  const sounds = [];
  for (let i = 0; i < 12 && trial.status()?.phase === 'relaying'; i++) sounds.push(...trial.tick());
  assert(sounds.includes('assassin-slip-arrive'));
  const [moved] = trial.echoes();
  assert.equal(moved.id, echo.id);
  assert.equal(moved.health, health);
  assert.equal(moved.until, until);
  assert.equal(trial.owner.qAt, paid);
  assert.deepEqual(position(trial.owner), owner);
  assert.deepEqual(position(moved), waypoint);

  const blocked = scenario(true, false, 'relay');
  blocked.tick(handle);
  blocked.walkExit();
  blocked.tick(handle);
  blocked.tick(handle);
  const before = position(blocked.echoes()[0]);
  blocked.arena.obstacles.push({ x: before.x - 16, y: before.y + 26, width: 32, height: 13 });
  assert(!blocked.tick().includes('assassin-slip-arrive'));
  const edge = position(blocked.echoes()[0]);
  assert.equal(edge.x, before.x);
  assert(edge.y >= before.y && edge.y < before.y + 8);
  assert.equal(blocked.status()?.phase, 'idle');
});

test('Threshold Echo watches a real incoming body and can be called early on the original veil', () => {
  const trial = scenario(true, false, 'threshold');
  trial.tick(handle);
  trial.walkExit();
  const paid = trial.owner.qAt;
  const priorVeil = trial.veil();
  assert(trial.tick(handle).includes('assassin-slip-arm'));
  assert.equal(trial.status()?.phase, 'watch');
  assert.equal(trial.veil(), priorVeil);
  assert.equal(trial.echoes().length, 0);
  Object.assign(trial.ally, { x: origin.x - 22, y: origin.y });
  const chaser = trial.game.minions.spawn(990002, { kind: 'ordinary', x: origin.x - 114, y: origin.y,
    health: 100, speed: 244, radius: 10, damage: 0 }, trial.game.combatTick)!;
  let sounds: string[] = [];
  for (let i = 0; i < 12 && trial.status()?.phase === 'watch'; i++) sounds.push(...trial.tick());
  assert(sounds.includes('assassin-slip-threshold') && sounds.includes('assassin-slip-exchange'));
  assert(distance(chaser, origin) <= slipRouteRules.thresholdRadius);
  assert.deepEqual(position(trial.echoes()[0]), origin);
  assert.equal(trial.owner.qAt, paid);
  assert(trial.veil()! < priorVeil!);

  const early = scenario(true, false, 'threshold');
  early.tick(handle);
  early.walkExit();
  early.tick(handle);
  const call = early.tick(handle);
  assert(call.includes('assassin-slip-exchange') && !call.includes('assassin-slip-threshold'));
  assert.equal(early.echoes().length, 1);
});
