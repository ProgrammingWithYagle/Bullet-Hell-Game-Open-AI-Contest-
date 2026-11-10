const operationCase = (name: string, run: () => unknown) => test(name, () => { run(); });
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from "./helpers/heavy-post-game-fixture.ts";
import { lanyardId, traverseIds as ids, clutchId, keyedId, openId, heavyTraverseRules as rules } from "../src/shared/heavy-traverse.ts";
const near = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
operationCase('all three carriages retain omitted handling, Keyed and Open with conserved original slots, actual paid rounds and a copied fixed emission point', () => {
  const rows = [];
  for (const mode of ['loose', 'spade', 'floating'] as const) for (const handling of [undefined, keyedId, openId]) {
    const f = fixture(mode, true, handling); f.step({ technique1: true }); f.step({ technique2: true, fire: handling === openId }); f.step({ technique2: true }); f.step({ technique2: true, moveY: 1 });
    assert.equal(f.status().heavyLanyardAt, 4); const originalUntil = f.status().heavyTraverseUntil; const origin = { x: f.status().heavyLanyardX, y: f.status().heavyLanyardY };
    for (let t = 5; t <= 31; t++) f.step({ moveY: t <= 9 ? 1 : 0, aim: -0.6, fire: true });
    const C = f.shots.filter(s => Math.abs(Math.hypot(s.vx, s.vy) - rules.speed) < 1e-6), primary = f.shots.filter(s => !C.some(c => c.id === s.id));
    assert.deepEqual(C.map(s => s.at), handling === openId ? [1, 21, 31] : [1, 11, 21, 31]);
    assert.equal(primary.length, handling === openId ? 1 : 0); assert.equal(45 - f.p.ammo, 4); assert.equal(originalUntil, 32); assert.equal(f.status().technique1At, 241);
    for (const s of C.slice(1)) { near(s.x, origin.x); near(s.y, origin.y); near(Math.atan2(s.vy, s.vx), 0); }
    rows.push({ mode, handling: handling ?? 'omitted', Cslots: C.map(s => s.at), actualPrimaryRounds: primary.length, actualPaidRounds: 4, fixedOrigin: origin, originalUntil, originalRecovery: 241 });
  }
  return rows;
});
operationCase('actual owner, weapon, entry, fitting, Clutch, used handling and new-operation losses remove dependent paid flights while rostered recovery stays', () => {
  const rows = [];
  for (const loss of ['lanyard', 'clutch', 'keyed', 'entry', 'spade', 'weapon', 'disconnect', 'downed']) {
    const f = fixture('spade', true, keyedId); f.post(); while (f.g.combatTick < 12) f.step(); const first = f.shots[0].id, posted = f.shots[1].id;
    if (['lanyard', 'clutch', 'keyed', 'entry', 'spade'].includes(loss)) { const id = loss === 'lanyard' ? lanyardId : loss === 'clutch' ? clutchId : loss === 'keyed' ? keyedId : loss === 'entry' ? ids.entry : ids.spade; f.p.skills = f.p.skills.filter((s: string) => s !== id); }
    else if (loss === 'weapon') f.p.weapon = 'heavy-1';
    else if (loss === 'disconnect') { f.g.setConnected(f.p.id, false); f.g.setConnected(f.p.id, true); }
    else { f.p.shield = 0; f.p.invulnerableUntil = 0; f.g.damage(f.p, 1e6); }
    f.step({ technique1: true }); assert(!f.g.shots.has(posted)); assert.equal(f.status().heavyTraverseUntil, 0); assert.equal(f.status().technique1At, 241); assert.equal(f.p.ammo, 43);
    const earlierRetained = ['lanyard', 'clutch', 'keyed'].includes(loss); assert.equal(f.g.shots.has(first), earlierRetained);
    rows.push({ loss, first, posted, earlierRetained, postedRemoved: true, recovery: 241 });
  }
  return rows;
});
operationCase('fresh interruptions reject posting or end posted unpaid work without granting damage protection, a new shot or a refund', () => {
  const rows = [];
  for (const when of ['before-post', 'after-post']) for (const action of ['reload', 'dodge', 'ultimate', 'channel']) {
    const f = fixture('spade'); f.step({ technique1: true }); f.step({ technique2: true }); f.step({ technique2: true }); if (when === 'after-post') f.step({ technique2: true });
    if (action === 'channel') f.p.channelUntil = 100;
    f.step({ technique2: true, ...(action === 'channel' ? {} : { [action]: true }) });
    assert.equal(f.status().heavyTraverseUntil, 0); assert.equal(f.status().heavyLanyardAt, 0); assert.equal(f.status().technique1At, 241); assert.equal(f.p.ammo, 44);
    assert.equal(f.shots.filter(s => Math.abs(Math.hypot(s.vx, s.vy) - rules.speed) < 1e-6).length, 1);
    rows.push({ when, action, retainedRecovery: 241, actualPaidCrounds: 1 });
  }
  return rows;
});
operationCase('staking admits no carrier or round; actual later full-pool and empty-magazine rejection ends remaining work without postponement', () => {
  const rows = [];
  for (const rejection of ['pool', 'empty']) {
    const f = fixture('spade'); f.post(); assert.equal(f.g.shots.size, 1); assert.equal(f.p.ammo, 44);
    if (rejection === 'pool') while (f.g.shots.size < 6000) assert(f.g.emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 10));
    else f.p.ammo = 0;
    while (f.g.combatTick < 11) f.step(); assert.equal(f.status().heavyTraverseUntil, 0); assert.equal(f.status().technique1At, 241); assert.equal(f.shots.length, 1); assert.equal(f.p.ammo, rejection === 'pool' ? 44 : 0);
    rows.push({ rejection, actualCrounds: 1, originalRecovery: 241, ammo: f.p.ammo });
  }
  return rows;
});
operationCase('a posted paid flight supplies the actual copied muzzle origin to the issued directional-armor callback after its owner walks away', () => {
  const f = fixture('spade'); Object.assign(f.g.boss, { x: 1000, y: 600 }); const origins: any[] = [];
  f.g.director.district.bodyMultiplier = (p: any) => { origins.push({ x: p.x, y: p.y }); return 0.5; };
  f.post(); for (let t = 5; t <= 11; t++) f.step({ moveY: 1 }); const later = f.shots.find(s => s.at === 11); assert(later);
  f.step({ technique1: true, moveY: 1 }); for (let t = 0; t < 18; t++) f.step({ moveY: 1 });
  assert.equal(origins.length, 2); near(origins[1].x, later.x); near(origins[1].y, later.y); assert(f.p.y > later.y + 100); near(f.p.damageDealt, rules.damage * f.g.stats(f.p).damage);
  return { controlledArmorInstrumentation: 0.5, actualDamage: f.p.damageDealt, actualOrigins: origins, copiedPost: { x: later.x, y: later.y }, ownerAfterTravel: { x: f.p.x, y: f.p.y } };
});
operationCase('actual host exit removes posted shots, and recycled pooled storage cannot move new-operation cleanup onto another owner', () => {
  const f = fixture('spade'); f.post(); while (f.g.combatTick < 12) f.step(); const paid = f.shots.map(s => s.id); assert(f.g.endByHost()); assert(paid.every(id => !f.g.shots.has(id))); assert.equal(f.status().heavyTraverseUntil, 0);
  const reuse = fixture('spade'); reuse.post(); while (reuse.g.combatTick < 11) reuse.step(); const old = reuse.g.shots.get(reuse.shots.at(-1).id), oldId = old.id; reuse.g.removeShot(old);
  const foreign = reuse.g.emitShot(reuse.ally.id, 1400, 900, 0, 0, 1, 1, 0, 10); assert.equal(foreign, old); assert.notEqual(foreign.id, oldId); reuse.g.setConnected(reuse.p.id, false); assert.equal(reuse.g.shots.get(foreign.id), foreign);
  return { actualHostRemoved: paid, retainedForeignOwner: foreign.owner, reusedPhysicalStorage: true, distinctActualId: foreign.id };
});
