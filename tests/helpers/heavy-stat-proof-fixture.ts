// Controlled actual-Game stat regression only; not an earned or transport fixture.
import assert from 'node:assert/strict';
import { Game } from '../../src/shared/game.ts';
import { viewOf } from '../../src/shared/view.ts';
import { traverseIds as ids, clutchId } from '../../src/shared/heavy-traverse.ts';
import type { HeavyFlakAdapter } from './heavy-flak-flow.ts';
export function statAdapter(mode: 'loose' | 'spade' | 'floating', operation: 'entry' | 'clutch', mutation: 'lifeline' | 'iron-rain') {
  const g: any = new Game({ mode: mode === 'loose' && operation === 'entry' ? 'short' : 'raid', seed: 41, maxPlayers: 1, arenaSelection: 'fixed', openingArenaId: 'gatehouse' });
  const p = g.addPlayer('owner', 'Hux', 'heavy');
  g.mutations.push({ id: mutation, remaining: 2 });
  let paused = true, simulationError: unknown;
  const events: HeavyFlakAdapter['events'] = [];
  const drain = () => events.push(...g.drainEvents());
  const start = async () => {
    assert(g.start());
    g.boss.id = 'constable'; g.director.reset('constable');
    Object.assign(g.boss, { x: 1200, y: 200, health: 1e6, maxHealth: 1e6, staggerUntil: 1e9, deadline: 1e9 });
    Object.defineProperty(g, 'arena', { value: structuredClone(g.arena) });
    g.arena.obstacles.length = g.arena.lavaPits.length = 0;
    Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600 });
    g.drainEvents(); paused = false;
  };
  const adapter: HeavyFlakAdapter = { owner: p.id, events, bursts: new Map(),
    view: () => { assert.ifError(simulationError); return viewOf(g, p.id); },
    input: i => { if (!paused) assert(g.submitInput(p.id, i)); },
    purchase: async item => { assert(g.transact(p.id, { id: item, kind: 'skill', item }).ok); },
    start,
    pause: async value => { g.clearInputs(); paused = value; },
    end: async () => { assert(g.endByHost()); drain(); },
  };
  const timer = setInterval(() => { if (!paused && !simulationError) try { g.step(); drain(); } catch (e) { simulationError = e; } }, 1000 / 30);
  return { g, p, adapter, start, dispose: () => clearInterval(timer), prepareClutch: async () => {
    for (const item of ['heavy-ordnance-1', ids.entry, ...(mode === 'loose' ? [] : [ids[mode]]), clutchId]) await adapter.purchase(item);
    await start();
  } };
}
