import assert from 'node:assert/strict';
import { Game } from '../../src/shared/game.ts';
import { lanyardId, traverseIds as ids, clutchId } from '../../src/shared/heavy-traverse.ts';
import { idleInput } from '../../src/shared/protocol.ts';
/** Controlled late-Endless27SP purchases and body/boss geometry. Earned transport is separate. */
export function fixture(mode: 'loose' | 'spade' | 'floating' = 'loose', posted = true, handling?: string) {
  const g: any = new Game({ mode: 'endless', seed: 41, maxPlayers: 2, arenaSelection: 'fixed', openingArenaId: 'gatehouse' });
  g.encounter = 9;
  const p = g.addPlayer('owner', 'Hux', 'heavy'), ally = g.addPlayer('ally', 'Mara', 'soldier');
  assert.equal(p.totalSp, 27);
  for (const item of ['heavy-ordnance-1', ids.entry, ...(mode === 'loose' ? [] : [ids[mode]]), clutchId, ...(handling ? [handling] : []), ...(posted ? [lanyardId] : [])]) {
    assert(g.transact(p.id, { id: item, kind: 'skill', item }).ok, item);
  }
  assert(g.start());g.boss.id = 'constable';g.director.reset('constable');
  Object.assign(g.boss, { x: 1200, y: 200, health: 1e6, maxHealth: 1e6, staggerUntil: 1e9, deadline: 1e9 });
  Object.defineProperty(g, 'arena', { value: structuredClone(g.arena) });g.arena.obstacles.length = g.arena.lavaPits.length = 0;
  Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600, shield: 0, invulnerableUntil: 0 });
  Object.assign(ally, { x: 1400, y: 900, oldX: 1400, oldY: 900 });g.drainEvents();
  let sequence = 0;const shots: any[] = [], sounds: any[] = [], events: any[] = [];
  const step = (input: any = {}) => {
    assert(g.submitInput(p.id, { ...idleInput(), sequence: ++sequence, aim: 0, ...input }));g.step();
    for (const event of g.drainEvents()) {
      events.push(structuredClone(event));
      if (event.type === 'shots') shots.push(...event.shots.filter((s: any) => s.owner === p.id).map((s: any) => ({ ...s, at: g.combatTick })));
      if (event.type === 'sound' && event.owner === p.id) sounds.push({ ...event, at: g.combatTick });
    }
  };
  const status = () => g.traverse.status(p, g.combatTick);
  const target = (x: number, y: number, health = 1000) => g.spawnMinion({ kind: 'ordinary', x, y, health, speed: 0, radius: 16, damage: 0 })!;
  const post = () => { step({ technique1: true });step({ technique2: true });step({ technique2: true });step({ technique2: true }); };
  return { g, p, ally, step, status, target, shots, sounds, events, post };
}
