import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { fixture } from './game-fixture01.mts';
import { traverseIds as ids, clutchId, keyedId, openId, heavyTraverseRules as r } from './handling-candidate01.mts';

const stage = path.dirname(fileURLToPath(import.meta.url));
const report: any = { checkedAt: new Date().toISOString(), registered: false, canonicalFilesWritten: false, onlineProof: false, countsAs2093Tests: false, controlledProposedOwnershipOnly: true, binding: JSON.parse(fs.readFileSync(stage + '/game-study02-binding.json', 'utf8')), cases: [] };
const near = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function check(name: string, run: () => unknown) {
  try { report.cases.push({ name, passed: true, details: run() }); }
  catch (e: any) { report.cases.push({ name, passed: false, error: e.stack }); }
}
check('losing either used handling removes only later dependent C flight/recoil; the earlier base round keeps issued authority', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) {
    const f = fixture('floating', handling);
    f.step({ technique1: true });
    const earlier = f.flights()[0].id;
    f.step({ technique2: true }); f.step({ technique2: true });
    while (f.g.combatTick < 12) f.step();
    const later = f.flights().find(s => s.id !== earlier).id;
    const paidRecoil = f.g.traverse.recoil(f.p, 13);
    assert(Math.hypot(paidRecoil.x, paidRecoil.y) > 0);
    f.p.skills = f.p.skills.filter((id: string) => id !== handling);
    near(Math.hypot(...Object.values(f.g.traverse.recoil(f.p, 13)) as [number, number]), 0);
    f.step();
    assert(f.g.shots.has(earlier)); assert(!f.g.shots.has(later));
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.status().heavyTraverseShotAt, 0);
    assert.equal(f.status().technique1At, 241); assert.equal(f.p.ammo, 43);
    rows.push({ handling, earlierRetained: earlier, laterRemoved: later, dependentRecoilRemoved: true, actualPaidRounds: 2, recovery: 241 });
  }
  return rows;
});
check('Open loss retains the admitted ordinary primary round while cancelling dependent unpaid work', () => {
  const f = fixture('spade', openId);
  f.step({ technique1: true }); f.step({ technique2: true, fire: true, aim: Math.PI });
  const primary = f.shots.find(s => s.admittedAt === 2);
  assert(primary && f.g.shots.has(primary.id));
  assert.equal(f.conversions.length, 1);
  f.p.skills = f.p.skills.filter((id: string) => id !== openId);
  f.step();
  assert(f.g.shots.has(primary.id)); assert.equal(f.status().heavyTraverseUntil, 0);
  assert.equal(f.p.ammo, 43); assert.equal(f.status().technique1At, 241);
  return { ordinaryShotRetained: primary.id, paidRoundNotRefunded: true, conversionCount: 1, recovery: 241 };
});
check('real entry, fitting, weapon, owner loss and downing remove actual dependent flights; roster recovery survives reconnect', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) for (const loss of ['entry', 'clutch', 'fitting', 'weapon', 'disconnect', 'downed']) {
    const f = fixture('floating', handling);
    f.step({ technique1: true }); const earlier = f.flights()[0].id;
    f.step({ technique2: true }); f.step({ technique2: true });
    while (f.g.combatTick < 12) f.step();
    const later = f.flights().find(s => s.id !== earlier).id;
    if (['entry', 'clutch', 'fitting'].includes(loss)) {
      const remove = loss === 'entry' ? ids.entry : loss === 'clutch' ? clutchId : ids.floating;
      f.p.skills = f.p.skills.filter((id: string) => id !== remove);
    } else if (loss === 'weapon') f.p.weapon = 'heavy-1';
    else if (loss === 'disconnect') f.g.setConnected(f.p.id, false);
    else { f.p.shield = 0; f.p.invulnerableUntil = 0; f.g.damage(f.p, 1e6); }
    if (loss === 'disconnect') f.g.setConnected(f.p.id, true);
    f.step({ technique1: true });
    assert(!f.g.shots.has(later));
    assert.equal(f.g.shots.has(earlier), loss === 'clutch');
    assert.equal(f.status().technique1At, 241); assert.equal(f.p.ammo, 43);
    assert.equal(f.status().heavyTraverseUntil, 0);
    rows.push({ handling, loss, earlierRetained: loss === 'clutch', laterRemoved: true, recovery: 241, noNewCastOnReconnect: loss === 'disconnect' });
  }
  return rows;
});
check('reload, dodge, ultimate and active channel cancel lifted work on each carriage without adding or refunding a C round', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) for (const mode of ['loose', 'spade', 'floating'] as const) for (const action of ['reload', 'dodge', 'ultimate', 'channel']) {
    const f = fixture(mode, handling);
    f.step({ technique1: true }); const paid = f.flights()[0].id;
    f.step({ technique2: true });
    if (action === 'channel') f.p.channelUntil = 100;
    f.step(action === 'channel' ? {} : { [action]: true, technique2: true });
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.status().technique1At, 241);
    assert.equal(f.p.ammo, 44); assert.equal(f.conversions.length, 0);
    assert(f.g.shots.has(paid));
    rows.push({ handling, mode, action, actualCrounds: 1, recovery: 241 });
  }
  return rows;
});
check('C wins a same-frame B request; ordinary fire after cancellation keeps its issued payment and converts no abandoned slot', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) {
    const f = fixture('spade', handling);
    f.step({ technique1: true }); f.step({ technique2: true });
    f.step({ technique1: true, technique2: true, fire: true });
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.conversions.length, 0); assert.equal(f.special().length, 1);
    assert.equal(f.shots.length, 2); assert.equal(f.p.ammo, 43);
    assert(!f.events.some(e => e.type === 'sound' && e.id === 'heavy-clutch-engage'));
    assert.equal(f.status().technique1At, 241);
    rows.push({ handling, Crounds: 1, issuedPrimaryAt: f.shots[1].admittedAt, conversions: 0, actualPaidRounds: 2 });
  }
  return rows;
});
check('both handling choices still require a stationary Spade replant at the actual moved body; later external movement breaks that post', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) {
    const f = fixture('spade', handling);
    f.step({ technique1: true });
    f.step({ technique2: true, moveY: 1 });
    f.step({ technique2: true, moveY: 1 });
    assert(f.status().heavyClutchLifted);
    const at = { x: f.p.x, y: f.p.y };
    f.step({ technique2: true });
    assert(!f.status().heavyClutchLifted);
    near(f.status().heavyTraversePostX, at.x); near(f.status().heavyTraversePostY, at.y);
    f.g.director.services.movement = () => ({ multiplier: 1, x: 30, y: 0 });
    f.step();
    assert(f.p.x > at.x); assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 44); assert.equal(f.status().technique1At, 241);
    rows.push({ handling, actualReplant: at, displacedBodyX: f.p.x, actualCrounds: 1, recovery: 241 });
  }
  return rows;
});
check('a later dependent C round uses its copied emission origin for actual directional armor after the owner walks away', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) {
    const f = fixture('floating', handling);
    Object.assign(f.g.boss, { x: 1000, y: 600 });
    const origins: any[] = [];
    f.g.director.district.bodyMultiplier = (p: any) => { origins.push({ x: p.x, y: p.y }); return 0.5; };
    f.step({ technique1: true }); f.step({ technique2: true }); f.step({ technique2: true });
    while (f.g.combatTick < 11) f.step();
    const second = f.special().find(s => s.admittedAt === 11);
    assert(second);
    f.step({ technique1: true, moveY: 1 });
    for (let i = 0; i < 18; i++) f.step({ moveY: 1 });
    assert.equal(origins.length, 2);
    near(origins[1].x, second.x); near(origins[1].y, second.y);
    assert(f.p.y > second.y + 100);
    near(f.p.damageDealt, r.damage * f.g.stats(f.p).damage);
    rows.push({ handling, actualOrigins: origins, ownerAfterTravel: { x: f.p.x, y: f.p.y }, actualArmoredDamage: f.p.damageDealt, laterEmission: { x: second.x, y: second.y } });
  }
  return rows;
});
check('empty Open primary admits no conversion; the actual reload interrupts remaining unpaid work with original recovery', () => {
  const f = fixture('spade', openId);
  f.step({ technique1: true }); f.step({ technique2: true });
  f.p.ammo = 0; // Controlled empty-magazine rejection fixture, not a claimed earned ammunition sequence.
  f.step({ fire: true });
  assert.equal(f.conversions.length, 0); assert.equal(f.shots.length, 1);
  assert.equal(f.status().heavyTraverseUntil, 0); assert.equal(f.status().technique1At, 241);
  assert(f.p.reloadAt > f.g.combatTick); assert.equal(f.p.ammo, 0);
  return { controlledEmptyMagazine: true, actualReloadAt: f.p.reloadAt, conversions: 0, originalRecovery: 241 };
});
check('actual host exit removes physical handled C work, while pooled object reuse remains another owner\'s authority', () => {
  const rows = [];
  for (const handling of [keyedId, openId]) {
    const first = fixture('floating', handling);
    first.step({ technique1: true }); first.step({ technique2: true }); first.step({ technique2: true });
    while (first.g.combatTick < 12) first.step();
    const ids = first.flights().map(s => s.id);
    assert.equal(ids.length, 2); assert(first.g.endByHost());
    assert(ids.every(id => !first.g.shots.has(id)));
    assert.equal(first.status().heavyTraverseUntil, 0);
    const second = fixture('spade', handling);
    second.step({ technique1: true }); second.step({ technique2: true });
    const old = second.flights()[0], oldId = old.id;
    second.g.removeShot(old);
    const reused = second.g.emitShot(second.ally.id, 1400, 900, 0, 0, 1, 1, 0, 10);
    assert.equal(reused, old); assert.notEqual(reused.id, oldId);
    second.g.setConnected(second.p.id, false);
    assert.equal(second.g.shots.get(reused.id), reused);
    rows.push({ handling, actualHostRemoved: ids, foreignPooledIdRetained: reused.id, owner: reused.owner });
  }
  return rows;
});
report.passed = report.cases.every((c: any) => c.passed);
report.passedCount = report.cases.filter((c: any) => c.passed).length;
report.failedCount = report.cases.length - report.passedCount;
fs.writeFileSync(path.resolve(stage, '../../outputs/Heavy-clutch-handling-game-authority01.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, passedCount: report.passedCount, failedCount: report.failedCount, cases: report.cases.map((c: any) => ({ name: c.name, passed: c.passed, error: c.error })) }));
if (!report.passed) process.exitCode = 1;
