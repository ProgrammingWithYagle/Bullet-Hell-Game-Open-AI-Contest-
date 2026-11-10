import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from "./helpers/heavy-post-game-fixture.ts";
import { postFrame } from "../src/client/heavy-post-presentation.ts";
import { SurvivorActionClock as Clock } from "../src/client/survivor-action-presentation.ts";
import { viewOf } from "../src/shared/view.ts";
const frame = (f: ReturnType<typeof fixture>, local = f.p.id) => { const v = viewOf(f.g, f.ally.id); return postFrame(v.players.find(p => p.id === f.p.id)!, v.phase, v.combatTick, local); };
test('actual muzzle/body values use the actor rather than room host, and the control line remains owner-only', () => {
  const f = fixture('spade'); f.post(); f.step({ moveY: 1 }); const local = frame(f)!; assert(local && local.owner === f.p.id); assert(local.localControlLine); assert(!frame(f, f.ally.id)!.localControlLine); assert.equal(local.origin.x, f.status().heavyLanyardX); assert.equal(local.body.y, f.p.y); assert.notEqual(local.body.y, local.origin.y);
  local.origin.x = -100; assert.equal(frame(f)!.origin.x, f.status().heavyLanyardX); assert(!frame(f)!.firing);
  while (f.g.combatTick < 11) f.step(); assert(frame(f)!.firing); assert.equal(frame(f)!.bearing, Math.atan2(f.shots.at(-1).vy, f.shots.at(-1).vx));
});
test('the actual final paid muzzle frame survives only its paid tick, with no future work or body attack invented', () => {
  const f = fixture('spade'), clock = new Clock(); f.step({ technique1: true }); let v = viewOf(f.g, f.p.id); clock.observe(v); assert(clock.pose(v.players[0], v, false)?.texture.includes('attack'));
  for (let t = 2; t <= 31; t++) { f.step(t <= 4 ? { technique2: true } : {}); v = viewOf(f.g, f.p.id); clock.observe(v); if (t >= 4) assert(!clock.pose(v.players[0], v, false)?.texture.includes('attack')); }
  assert(frame(f)!.firing); assert.equal(f.status().heavyTraverseUntil, 0); f.step({ fire: true }); v = viewOf(f.g, f.p.id); clock.observe(v); assert.equal(frame(f), undefined); assert(clock.pose(v.players[0], v, false)?.texture.includes('attack'));
});
test('phase, ownership, invalid time/coordinates and malformed post state cannot leave a weapon or a private line', () => {
  const f = fixture('floating'); f.post(); const v = viewOf(f.g, f.p.id), p = v.players[0];
  for (const change of [(p: any) => p.skills.pop(), (p: any) => p.connected = false, (p: any) => p.health = 0, (p: any) => p.kit.heavyLanyardX = Infinity, (p: any) => p.kit.heavyLanyardUntil = 1000, (p: any) => p.kit.heavyTraverseUntil = 0, (p: any) => p.x += 100]) { const q = structuredClone(p); change(q); assert.equal(postFrame(q, 'combat', v.combatTick, p.id), undefined); }
  assert.equal(postFrame(p, 'defeat', v.combatTick, p.id), undefined); assert.equal(postFrame(p, 'combat', NaN, p.id), undefined);
});