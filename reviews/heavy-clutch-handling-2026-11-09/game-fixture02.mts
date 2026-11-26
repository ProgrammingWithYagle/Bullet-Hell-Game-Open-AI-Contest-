import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { traverseIds as ids, clutchId, heavyTraverseRules as r } from './handling-candidate01.mts';
import { idleInput } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts';
const stage = path.dirname(fileURLToPath(import.meta.url));
const { Game } = await import(pathToFileURL(stage + '/game-study02.mjs').href);

// Controlled Raid12 purchases and proposed raw handling ownership. This is not earned acquisition or online proof.
export function fixture(mode: 'loose' | 'spade' | 'floating', handling?: string) {
  const g: any = new Game({ mode: 'raid', seed: 41, maxPlayers: 2, arenaSelection: 'fixed', openingArenaId: 'gatehouse' });
  const p = g.addPlayer('owner', 'Hux', 'heavy'), ally = g.addPlayer('ally', 'Mara', 'soldier');
  for (const item of ['heavy-ordnance-1', ids.entry, ...(mode === 'loose' ? [] : [ids[mode]]), clutchId])
    assert(g.transact(p.id, { id: item, kind: 'skill', item }).ok);
  if (handling) p.skills.push(handling);
  assert(g.start());
  g.boss.id = 'constable';
  g.director.reset('constable');
  Object.assign(g.boss, { x: 1200, y: 200, health: 1e6, maxHealth: 1e6, staggerUntil: 1e9, deadline: 1e9 });
  Object.defineProperty(g, 'arena', { value: structuredClone(g.arena) });
  g.arena.obstacles.length = g.arena.lavaPits.length = 0;
  Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600 });
  Object.assign(ally, { x: 1400, y: 900, oldX: 1400, oldY: 900 });
  g.drainEvents();
  let sequence = 0;
  const events: any[] = [], shots: any[] = [], conversions: any[] = [];
  const actualRound = g.traverse.primaryRound.bind(g.traverse);
  g.traverse.primaryRound = (owner: any, c: any) => {
    const before = g.traverse.status(owner, c.tick), accepted = actualRound(owner, c);
    if (accepted) conversions.push({ tick: c.tick, ammo: owner.ammo, beforeNext: before.heavyTraverseNextAt, afterNext: g.traverse.status(owner, c.tick).heavyTraverseNextAt });
    return accepted;
  };
  const step = (input: any = {}) => {
    assert(g.submitInput(p.id, { ...idleInput(), sequence: ++sequence, aim: 0, ...input }));
    g.step();
    const batch = g.drainEvents();
    events.push(...batch);
    for (const e of batch) if (e.type === 'shots') shots.push(...e.shots.filter((s: any) => s.owner === p.id).map((s: any) => ({ ...s, admittedAt: g.combatTick })));
    return batch;
  };
  return { g, p, ally, step, events, shots, conversions,
    status: () => g.traverse.status(p, g.combatTick),
    flights: (): any[] => [...g.shots.values()].filter((s: any) => g.traverse.has(s.id)),
    special: () => shots.filter(s => Math.abs(Math.hypot(s.vx, s.vy) - r.speed) < 1e-6)
  };
}
