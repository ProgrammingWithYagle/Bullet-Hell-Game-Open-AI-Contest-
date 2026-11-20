import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, type Player } from '../src/shared/game.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { precautionRules, precautionWrapId, preventiveCareIds } from '../src/shared/medic-preventive-care.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Fixture = { allies?: boolean; secondMedic?: boolean; owned?: boolean; surgery?: boolean; difficulty?: string; fitting?: 'doorstep' | 'layered' };
const wrap = { technique3: true };
const exact = (actual: number, wanted: number) => assert(Math.abs(actual - wanted) < 1e-6, `${actual} vs ${wanted}`);

function study({ allies = false, secondMedic = false, owned = true, surgery = false, difficulty = 'normal', fitting }: Fixture = {}) {
  const game = new Game({ mode: 'short', seed: 73, difficulty, maxPlayers: 1 + Number(allies) + Number(secondMedic),
    openingArenaId: 'gatehouse', arenaSelection: 'fixed' });
  game.encounter = fitting || surgery ? 1 : 0;
  const medic = game.addPlayer('medic', 'Iona', 'medic');
  const ally = allies ? game.addPlayer('ally', 'Adelaide', 'soldier') : undefined;
  const other = secondMedic ? game.addPlayer('other', 'Relief', 'medic') : undefined;
  for (const player of [medic, other].filter((p): p is Player => !!p)) {
    assert.equal(player.totalSp, fitting || surgery ? 9 : 3);
    const buy = (item: string) => game.transact(player.id, { id: item, kind: 'skill', item });
    assert(buy('medic-chemistry-1').ok);
    if (owned) assert(buy(precautionWrapId).ok);
    if (surgery && player === medic) {
      assert(buy('medic-triage-1').ok);
      assert(buy(fieldSurgeryIds.entry).ok);
    }
    if (fitting && player === medic) {
      assert(buy(preventiveCareIds[fitting]).ok);
      const excluded = fitting === 'doorstep' ? 'layered' : 'doorstep';
      assert.equal(buy(preventiveCareIds[excluded]).reason, 'incompatibleItem');
    }
  }
  assert(game.start());
  game.boss.staggerUntil = game.boss.deadline = 10000;
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(medic, { x: 660, y: 610 });
  if (ally) Object.assign(ally, { x: 730, y: 610 });
  if (other) Object.assign(other, { x: 730, y: 550 });
  function frame(main: Partial<InputFrame> = {}, partner: Partial<InputFrame> = {}, relief: Partial<InputFrame> = {}) {
    for (const p of game.players.values()) {
      if (p.connected) assert(game.submitInput(p.id, { ...idleInput(), aim: 0, sequence: p.ack + 1, clientTick: game.combatTick,
        ...(p === medic ? main : p === ally ? partner : relief) }));
    }
    game.step();
  }
  function wait(count: number) { for (let i = 0; i < count; i++) frame(); }
  wait(Math.max(...[...game.players.values()].map(p => p.invulnerableUntil)));
  function shoot(target: Player, damage: number, source = 'hostile') {
    const shot = game['emitShot'](source, target.x, target.y + 21, -Math.PI / 2, 900, damage, 3);
    assert(shot);
    frame();
    return shot.id;
  }
  return { game, medic, ally, other, arena, frame, wait, shoot,
    status: () => game.kitStatus(medic.id).precautionWrap,
    cues: () => game.classCues().filter(cue => cue.kind === 'medic-precaution-wrap' ||
      cue.kind === 'medic-precaution-dose' || cue.kind === 'medic-precaution-station') };
}

test('Precaution Wrap prepares a full-health patient and pays the issued clock when an actual hit triggers it', () => {
  const f = study({ allies: true });
  const baseline = study({ owned: false });
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'armed');
  assert.equal(f.status()?.patient, f.ally!.id);
  assert.equal(f.ally!.health, f.ally!.maxHealth);
  assert.equal(f.medic.healing, 0);
  assert.equal(f.medic.qAt, 0);
  assert.equal(f.game.fields.length, 0);
  const hidden = viewOf(f.game, f.ally!.id).players.find(p => p.id === f.medic.id)?.kit.precautionWrap;
  assert.equal(hidden, undefined);
  for (const id of [f.medic.id, f.ally!.id]) assert(viewOf(f.game, id).classCues.some(cue => cue.kind === 'medic-precaution-wrap' && cue.patient === f.ally!.id));
  f.ally!.shield = 0;
  f.shoot(f.ally!, 20);
  baseline.frame({ q: true });
  assert.equal(f.status()?.phase, 'settling');
  assert.equal(f.medic.qAt - f.game.combatTick, baseline.medic.qAt - baseline.game.combatTick);
  assert.equal(f.game.fields.length, 0);
});

test('A real direct hit removes its ordinary health before one smaller delayed dose', () => {
  const f = study(), { medic, game } = f;
  f.frame(wrap);
  const before = medic.health, debit = medic.damageTaken;
  f.shoot(medic, 24);
  const paid = medic.qAt;
  assert(paid > game.combatTick);
  const loss = before - medic.health;
  assert(loss > 0);
  exact(medic.damageTaken - debit, loss);
  assert.equal(f.status()?.phase, 'settling');
  assert.equal(f.status()?.until, game.combatTick + precautionRules.settleTicks);
  f.wait(precautionRules.settleTicks - 1);
  exact(medic.health, before - loss);
  f.frame();
  exact(medic.health, before - loss * (1 - precautionRules.acceptedLossFraction));
  assert.equal(medic.qAt, paid);
  assert.equal(f.status()?.phase, 'idle');
  assert.equal(f.cues().filter(cue => cue.kind === 'medic-precaution-dose').length, 1);
  f.wait(6);
  const beforeNext = medic.health;
  f.shoot(medic, 10);
  assert(medic.health < beforeNext);
  const subsequent = medic.health;
  f.wait(precautionRules.settleTicks + 1);
  assert.equal(medic.health, subsequent);
});

test('A marked boss impact can spend the wrap after an ordinary hazard leaves it armed', () => {
  const f = study({ allies: true }), { game, medic, ally } = f;
  assert(ally);
  ally.shield = 0;
  f.frame(wrap);
  const full = ally.health, context = game['signatureContext']();
  context.damage(ally.id, 12);
  assert(ally.health < full);
  assert.equal(medic.qAt, 0);
  assert.equal(f.status()?.phase, 'armed');
  f.wait(7);
  const beforeImpact = ally.health;
  game['signatureContext']().damage(ally.id, 20, 'direct');
  const damaged = ally.health, recovery = medic.qAt;
  assert(damaged < beforeImpact && recovery > game.combatTick);
  assert.equal(f.status()?.phase, 'settling');
  f.wait(precautionRules.settleTicks);
  assert.equal(medic.qAt, recovery);
  assert(ally.health > damaged);
  assert(ally.health - damaged <= (beforeImpact - damaged) * precautionRules.acceptedLossFraction + 1e-6);
});

test('Shield-only and friendly contacts leave the reserve for its intended damage', () => {
  const f = study(), { medic } = f;
  f.frame(wrap);
  const health = medic.health;
  medic.shield = 20;
  f.shoot(medic, 12);
  assert.equal(medic.health, health);
  assert.equal(f.status()?.phase, 'armed');
  f.wait(6);
  f.shoot(medic, 12, medic.id);
  assert.equal(medic.health, health);
  assert.equal(f.status()?.phase, 'armed');
  f.game.damage(medic, 15, false, true);
  assert(medic.health < health);
  assert.equal(f.status()?.phase, 'armed');
  f.wait(precautionRules.settleTicks);
  assert.equal(medic.healing, 0);
});

test('Expiry, lethal injury and connection loss release an unused reservation', () => {
  for (const ending of ['expiry','lethal','disconnect'] as const) {
    const f = study({ allies: true }), { medic, ally, game } = f;
    f.frame(wrap);
    const recovery = medic.qAt;
    if (ending === 'expiry') f.wait(precautionRules.wearTicks);
    if (ending === 'disconnect') game.setConnected(ally!.id, false);
    f.shoot(ally!, ending === 'lethal' ? 1000 : 20);
    f.wait(precautionRules.settleTicks + 2);
    assert.equal(medic.healing, 0, ending);
    assert.equal(medic.qAt, recovery, ending);
    assert.equal(f.status()?.phase, 'idle', ending);
    assert.equal(f.cues().length, 0, ending);
    if (ending === 'lethal') assert.equal(ally!.status, 'downed');
  }
});

test('A real hit pays even when the recipient goes down or disconnects before the follow-up', () => {
  for (const ending of ['downed','disconnect'] as const) {
    const f = study({ allies: true }), { medic, ally, game } = f;
    f.frame(wrap);
    ally!.shield = 0;
    f.shoot(ally!, 20);
    const paid = medic.qAt;
    assert(paid > game.combatTick);
    if (ending === 'disconnect') game.setConnected(ally!.id, false);
    else {
      ally!.invulnerableUntil = 0;
      game.damage(ally!, 1000, false, true);
      assert.equal(ally!.status, 'downed');
    }
    f.wait(precautionRules.settleTicks + 1);
    assert.equal(f.medic.healing, 0);
    assert.equal(f.medic.qAt, paid);
    assert.equal(f.cues().length, 0);
  }
});

test('An unused wrap has a brief rearm while ordinary Q remains available', () => {
  const f = study(), { medic, game } = f;
  f.frame(wrap);
  const plantedAt = game.combatTick;
  f.wait(precautionRules.wearTicks);
  assert.equal(f.status()?.phase, 'idle');
  assert.equal(f.status()?.until, plantedAt + precautionRules.wearTicks + precautionRules.retryTicks);
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'idle');
  assert.equal(medic.qAt, 0);
  f.wait(precautionRules.retryTicks);
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'armed');
  f.frame({ q: true });
  assert.equal(game.fields.length, 1);
  assert.equal(f.status()?.phase, 'idle');
  const paid = medic.qAt;
  f.shoot(medic, 20);
  // There may be Healing Field healing, but the wrap no longer owns the wound.
  assert.equal(f.status()?.phase, 'idle');
  f.wait(precautionRules.settleTicks);
  assert.equal(f.cues().length, 0);
  assert.equal(medic.qAt, paid);
});

test('Baby and Hellish both retain the safety cap on a direct nonlethal health loss', () => {
  for (const difficulty of ['baby','hellish']) {
    const f = study({ difficulty }), { medic } = f;
    f.frame(wrap);
    const before = medic.health;
    f.shoot(medic, 20);
    const loss = before - medic.health;
    assert(loss > 0);
    f.wait(precautionRules.settleTicks);
    exact(medic.healing, loss * precautionRules.acceptedLossFraction);
    assert(medic.health < before);
    assert.equal(medic.progress.rescues, 0);
    assert.equal(medic.shield, 0);
  }
});

test('Clear reach, planting and action priority guard the paid reserve', () => {
  const f = study({ allies: true }), { medic, game } = f;
  f.arena.obstacles = [{ x: 690, y: 575, width: 15, height: 70 }];
  f.frame(wrap);
  assert.equal(medic.qAt, 0);
  assert.equal(f.status()?.phase, 'idle');
  f.arena.obstacles = [];
  f.frame({ ...wrap, moveY: 1 });
  assert.equal(medic.qAt, 0);
  f.frame({ ...wrap, q: true });
  assert(medic.qAt > game.combatTick);
  assert.equal(f.status()?.phase, 'idle');
  assert.equal(game.fields.length, 1);
});

test('Two Medics cannot spend two wraps on the same active patient', () => {
  const f = study({ allies: true, secondMedic: true }), { other, ally } = f;
  f.frame(wrap, {}, { technique3: true, aim: Math.PI / 2 });
  assert.equal(f.status()?.patient, ally!.id);
  assert.equal(other!.qAt, 0);
  assert.equal(f.cues().length, 1);
});

test('A qualifying wrap spends the shared Q clock before an unpaid Field Dressing can give its first dose', () => {
  const f = study({ allies: true, surgery: true }), { game, medic, ally } = f;
  assert(ally);
  f.frame(wrap);
  assert.equal(f.status()?.patient, ally.id);
  medic.shield = 0;
  f.shoot(medic, 20);
  const medicWounded = medic.health;
  f.frame({ technique1: true, aim: Math.PI });
  assert.equal(game.kitStatus(medic.id).fieldDressing?.phase, 'preparing');
  assert.equal(medic.qAt, 0);
  ally.shield = 0;
  f.shoot(ally, 20);
  const paid = medic.qAt, allyWounded = ally.health;
  assert(paid > game.combatTick);
  f.wait(22);
  assert.equal(medic.qAt, paid);
  assert.equal(medic.health, medicWounded);
  assert(ally.health > allyWounded);
  assert.equal(game.kitStatus(medic.id).fieldDressing?.phase, 'idle');
  assert.equal(game.fieldSurgery.hasTreatments, false);
});

test('A Solo player can leave and walk into Doorstep Kit, with the original deadline and Q payment', () => {
  const f = study({ fitting: 'doorstep' }), { medic, game } = f;
  f.frame(wrap);
  const until = f.status()?.until;
  assert(f.status()?.canPlace);
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'station');
  const station = f.cues().find(cue => cue.kind === 'medic-precaution-station');
  assert(station);
  assert.equal(station.until, until);
  assert.equal(station.x, medic.x);
  f.wait(5);
  assert.equal(f.status()?.phase, 'station');
  for (let i = 0; i < 5; i++) f.frame({ moveX: 1 });
  assert(medic.x - station.x > station.radius);
  f.frame({ moveX: -1, dodge: true });
  while (medic.dashUntil > game.combatTick) f.frame();
  assert.equal(f.status()?.phase, 'station');
  assert(medic.x < station.x - station.radius);
  for (let i = 0; i < 24 && f.status()?.phase === 'station'; i++) f.frame({ moveX: 1 });
  assert.equal(f.status()?.phase, 'armed');
  assert.equal(f.status()?.patient, medic.id);
  assert.equal(f.status()?.until, until);
  assert.equal(medic.qAt, 0);
  assert.equal(f.status()?.canPlace, false);
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'armed');
  assert.equal(f.cues().find(cue => cue.kind === 'medic-precaution-wrap')?.id, station.id);
  f.shoot(medic, 20);
  assert(medic.qAt > game.combatTick);
  f.wait(precautionRules.settleTicks);
  assert(medic.healing > 0);
});

test('Doorstep Kit goes to the earliest actual crossing and stays inactive under a raid pull', () => {
  const f = study({ fitting: 'doorstep', allies: true, secondMedic: true }), { game, medic, ally, other } = f;
  f.frame({ ...wrap, aim: Math.PI });
  f.frame({ ...wrap, aim: Math.PI });
  assert.equal(f.status()?.phase, 'station');
  const spot = f.cues().find(cue => cue.kind === 'medic-precaution-station')!;
  Object.assign(ally!, { x: spot.x + spot.radius + 3, y: spot.y });
  game['director'].raids['shapes'].push({ kind: 'raid-lane', style: 'pull', id: 75001,
    x1: spot.x - 45, y1: spot.y, x2: spot.x + 80, y2: spot.y, width: 100, damage: 0, forceX: -45, forceY: 0,
    disabled: false, dependencies: [], index: 0, at: game.combatTick + 1, until: game.combatTick + 2 });
  f.frame({}, { moveX: -1 });
  assert(ally!.x < spot.x + spot.radius);
  assert.equal(f.status()?.phase, 'station');
  Object.assign(ally!, { x: spot.x + spot.radius + 5, y: spot.y });
  Object.assign(other!, { x: spot.x - spot.radius - 3, y: spot.y });
  f.frame({}, { moveX: -1 }, { moveX: 1 });
  assert.equal(f.status()?.phase, 'armed');
  assert.equal(f.status()?.patient, other!.id);
  assert.equal(f.status()?.until, spot.until);
  assert.equal(medic.qAt, 0);
  f.shoot(ally!, 20);
  assert.equal(medic.qAt, 0);
  f.shoot(other!, 20);
  assert(medic.qAt > game.combatTick);
});

test('A failed Doorstep placement near masonry keeps the same personal wrap', () => {
  const f = study({ fitting: 'doorstep' });
  f.frame(wrap);
  const active = f.status();
  f.arena.obstacles = [{ x: f.medic.x + 16, y: f.medic.y - 20, width: 30, height: 40 }];
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'armed');
  assert.equal(f.status()?.until, active?.until);
  assert.equal(f.status()?.canPlace, false);
  assert.equal(f.cues().filter(c => c.kind === 'medic-precaution-station').length, 0);
});

test('Layered Wrap records two distinct wounds then releases one bounded dose on the paid clock', () => {
  const f = study({ fitting: 'layered' }), { medic, game } = f;
  f.frame(wrap);
  assert(f.status()?.canLayer);
  const until = f.status()?.until;
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'layered');
  assert.equal(f.status()?.until, until);
  assert.equal(f.status()?.capturedHits, 0);
  f.shoot(medic, 8);
  const recovery = medic.qAt;
  assert(recovery > game.combatTick);
  assert.equal(f.status()?.capturedHits, 1);
  f.wait(6);
  f.shoot(medic, 10);
  assert.equal(f.status()?.capturedHits, 2);
  f.wait(6);
  f.shoot(medic, 12);
  assert.equal(f.status()?.capturedHits, 2);
  assert.equal(medic.healing, 0);
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'settling');
  f.wait(precautionRules.settleTicks);
  exact(medic.healing, (8 + 10) * precautionRules.acceptedLossFraction);
  assert.equal(medic.qAt, recovery);
});

test('Layered release requires the original patient and clear reach', () => {
  const f = study({ allies: true, fitting: 'layered' });
  f.frame(wrap);
  f.frame(wrap);
  f.ally!.shield = 0;
  f.shoot(f.ally!, 24);
  const before = f.ally!.health, paid = f.medic.qAt;
  f.arena.obstacles = [{ x:690, y:570, width:12, height:80 }];
  f.frame(wrap);
  assert.equal(f.status()?.phase, 'layered');
  assert.equal(f.status()?.ready, false);
  assert.equal(f.ally!.health, before);
  f.arena.obstacles = [];
  f.frame(wrap);
  f.wait(precautionRules.settleTicks);
  exact(f.ally!.health - before, 24 * precautionRules.acceptedLossFraction);
  assert.equal(f.medic.qAt, paid);
});
