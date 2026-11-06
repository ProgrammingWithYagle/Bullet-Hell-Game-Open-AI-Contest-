import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { idleInput, CONTENT_REVISION } from '../src/shared/protocol.ts';
import { SurvivorActionClock } from '../src/client/survivor-action-presentation.ts';
import { survivorPose } from '../src/client/survivor-presentation.ts';
import motion from '../assets/production/motion/swordsman-library.json';
function fixture(secondWatch = false) {
  const g = new Game({ mode: 'endless' }),
    p = g.addPlayer('p', 'Dara', 'swordsman');
  if (secondWatch) {
    p.totalSp = 6;
    for (const s of data.skills.filter(
      (s) => s.classId === 'swordsman' && s.subbranchId === 'measure-path-2' && s.depth <= 3,
    ))
      assert(g.transact(p.id, { id: s.id, kind: 'skill', item: s.id }).ok);
  }
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  const clock = new SurvivorActionClock();
  let v = viewOf(g, p.id);
  clock.observe(v);
  const update = () => {
    v = viewOf(g, p.id);
    clock.observe(v);
    return clock.pose(v.players[0], v, true);
  };
  const press = (action: Partial<ReturnType<typeof idleInput>>) => {
    g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, ...action });
    g.step();
    return update();
  };
  return { g, p, clock, update, press, view: () => v };
}
test('Measured Cut uses its locked directional action without an ammo delta, even while moving; dodge cancels its presentation', () => {
  const s = fixture(),
    ammo = s.p.ammo;
  assert.equal(s.press({ q: true, aim: Math.PI })?.action, 'attack');
  assert.equal(s.p.ammo, ammo);
  assert.equal(s.clock.pose(s.view().players[0], s.view(), true)?.facing, 'west');
  s.p.aim = 0;
  s.g.step();
  assert.equal(s.update()?.facing, 'west');
  const windup = s.view().classCues.find((c) => c.kind === 'sword-windup')!;
  while (s.g.combatTick < windup.until) s.g.step();
  const release = s.update()!;
  assert.equal(release.action, 'attack');
  assert(
    release.frame >= 2,
    'Release continues the existing windup strip rather than restarting it',
  );
  assert.equal(s.press({ dodge: true, moveY: 1 })?.action, 'dash');
  while (s.g.combatTick < s.p.dashUntil) s.g.step();
  assert.notEqual(s.update()?.action, 'attack');
});
test('The held guard follows its locked aim, yields during Second Watch quiet time, and ends at the actual quota', () => {
  const s = fixture(true);
  const first = s.press({ e: true, aim: Math.PI / 2 });
  assert.equal(first?.action, 'guard');
  assert.equal(first?.facing, 'south');
  const cue = s.view().classCues.find((c) => c.kind === 'sword-guard')!;
  assert(cue.kind === 'sword-guard');
  s.p.aim = 0;
  s.g.step();
  assert.equal(s.update()?.facing, 'south');
  while (s.g.combatTick < cue.at + 5) s.g.step();
  assert.notEqual(s.update()?.action, 'guard');
  while (s.g.combatTick < cue.at + 10) s.g.step();
  assert.equal(s.update()?.action, 'guard');
  // Exhaustion and inactive windows are presentation-only inputs from authority.
  const v = structuredClone(s.view()),
    guard = v.classCues.find((c) => c.kind === 'sword-guard')!;
  assert(guard.kind === 'sword-guard');
  guard.active = false;
  assert.notEqual(s.clock.pose(v.players[0], v, true)?.action, 'guard');
  guard.active = true;
  guard.remaining = 0;
  assert.notEqual(s.clock.pose(v.players[0], v, true)?.action, 'guard');
});
test('Every independent Swordsman run frame remains selectable at its authored speed', () => {
  for (const clip of motion.entries) {
    const aim = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }[
      clip.direction
    ]!;
    for (let i = 0; i < clip.frames; i++) {
      const pose = survivorPose('swordsman', aim, true, 'active', (i * 30) / clip.fps + 0.001);
      assert.equal(pose.texture, clip.id);
      assert.equal(pose.frame, i);
    }
  }
});
test('An issued Bard save preserves learning and identity, rejects newly invented Sword data, and cannot migrate an authoritative snapshot', () => {
  const g = new Game({ mode: 'story' });
  g.addPlayer('p', 'Iven', 'bard');
  const saved = g.offlineCheckpoint()!;
  const issued = '85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb';
  saved.contentRevision = issued;
  saved.protocolVersion = 47; // Exact issued envelope, not the current protocol.
  const restored = Game.restoreOffline(structuredClone(saved));
  assert.equal(restored.players.get('solo')?.classId, 'bard');
  assert.deepEqual(restored.trainingFor('solo'), g.trainingFor('p'));
  const forged = structuredClone(saved);
  forged.player.classId = 'swordsman';
  assert.throws(() => Game.restoreOffline(forged));
  const forgedSkill = structuredClone(saved);
  forgedSkill.player.skills.push('swordsman-measure-1');
  assert.throws(() => Game.restoreOffline(forgedSkill));
  assert.notEqual(CONTENT_REVISION, issued);
  assert.throws(() =>
    Game.restoreAuthoritative({ ...g.authoritativeCheckpoint(), contentRevision: issued }),
  );
  const quick = new Game({ mode: 'short' }),
    p = quick.addPlayer('p', 'Dara', 'swordsman');
  assert.equal(p.totalSp, 3);
  assert(quick.transact(p.id, { id: 'sp', kind: 'skill', item: 'swordsman-measure-1' }).ok);
  const story = new Game({ mode: 'story' }),
    q = story.addPlayer('p', 'Dara', 'swordsman');
  assert.equal(q.totalSp, 0);
  assert.equal(story.trainingFor(q.id)?.characterId, 'dara-flint');
  assert(!story.transact(q.id, { id: 'sp', kind: 'skill', item: 'swordsman-measure-1' }).ok);
  assert.equal(story.trainingFor(q.id)?.proofs.length, 0);
});
