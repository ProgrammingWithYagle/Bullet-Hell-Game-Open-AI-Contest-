import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lineworkFixture,
  attachedLineworkFixture,
  lineworkGeometry as geometry,
} from './helpers/heavy-linework-fixture.ts';
import { encodeEvents, decodeEvents } from '../src/shared/wire-events.ts';
const run = (label: string, fn: () => unknown) =>
  test(label, () => {
    fn();
  });

{
  const fixture = attachedLineworkFixture;
  for (const mode of ['bare', 'yoke', 'sheave'])
    run(mode + ' actual primary-versus-lateral handling', () => {
      const f = fixture(mode),
        original = f.status(),
        from = { x: f.p.x, y: f.p.y },
        tangent = { x: -Math.sin(f.aim), y: Math.cos(f.aim) };
      f.step({ technique2: true });
      const anchorShots = f.emitted.length;
      for (let i = 0; i < 8; i++)
        f.step({ aim: f.aim + Math.PI / 2, moveX: tangent.x, moveY: tangent.y, fire: true });
      const after = f.status(),
        lateral = (f.p.x - from.x) * tangent.x + (f.p.y - from.y) * tangent.y,
        primary = f.emitted.length - anchorShots;
      assert(after.lineworkActive);
      assert.equal(after.lineworkUntil, original.lineworkUntil);
      assert.equal(after.lineworkRecovery, original.lineworkRecovery);
      if (mode === 'yoke') {
        assert(primary > 0);
        assert(Math.abs(lateral) < 1);
      } else {
        assert.equal(primary, 0);
        assert(lateral > 5);
      }
      return {
        mode,
        primaryProjectiles: primary,
        actualLateralMovement: lateral,
        originalUntil: original.lineworkUntil,
        afterUntil: after.lineworkUntil,
        ammoBefore: f.ammo,
        ammoAfter: f.p.ammo,
        canonicalPurchases: true,
      };
    });
  for (const mode of ['bare', 'sheave'])
    run(mode + ' payout and fitting dependency', () => {
      const f = fixture(mode),
        original = f.status(),
        away = { x: -Math.cos(f.aim), y: -Math.sin(f.aim) };
      for (let i = 0; i < 3; i++) f.step({ moveX: away.x, moveY: away.y });
      const paidOut = f.status();
      if (mode === 'bare') assert.equal(paidOut.lineworkUntil, 0);
      else {
        assert.equal(paidOut.lineworkUntil, original.lineworkUntil);
        f.step({ technique2: true });
        assert(f.status().lineworkActive);
        assert.equal(f.status().lineworkUntil, original.lineworkUntil);
        f.p.skills = f.p.skills.filter((id: string) => id !== 'heavy-linework-sheave-1');
        f.step();
        assert.equal(f.status().lineworkUntil, 0);
      }
      assert.equal(f.status().lineworkRecovery, original.lineworkRecovery);
      assert.equal(f.p.ammo, f.ammo - 1);
      return {
        mode,
        original,
        paidOut,
        after: f.status(),
        noRoundRefund: true,
        noClockReset: true,
      };
    });
  for (const action of ['dodge', 'reload', 'ultimate'])
    for (const admitted of [false, true])
      run(
        (admitted ? 'admitted ' : 'blocked ') + action + ' retains issued admission authority',
        () => {
          const f = fixture(),
            original = f.status();
          f.step({ technique2: true });
          assert(f.status().lineworkActive);
          // Explicit controlled admission states. These are not earned-play observations.
          if (!admitted) {
            if (action === 'dodge') {
              f.p.dodgeAt = f.g.combatTick + 1000;
              f.p.dodgeCharges = 0;
            }
            if (action === 'reload') f.p.ammo = f.g.stats(f.p).magazine;
            if (action === 'ultimate') f.p.ultimateAt = f.g.combatTick + 1000;
          }
          f.step({ [action]: true });
          const actual = f.status();
          if (admitted)
            assert.equal(actual.lineworkUntil, 0, 'admitted interruption must release unpaid line');
          else
            assert.equal(
              actual.lineworkUntil,
              original.lineworkUntil,
              'rejected issued action must preserve the existing line',
            );
          assert.equal(actual.lineworkRecovery, original.lineworkRecovery);
          return {
            action,
            admitted,
            originalUntil: original.lineworkUntil,
            actualUntil: actual.lineworkUntil,
            controlledAdmissionFixture: true,
          };
        },
      );
  run('separate C releases unpaid work and retains actual cartridge/recovery', () => {
    const f = fixture(),
      original = f.status();
    f.step({ technique1: true });
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.status().lineworkRecovery, original.lineworkRecovery);
    assert.equal(f.p.ammo, f.ammo - 1);
    return { originalRecovery: original.lineworkRecovery, ammoAfter: f.p.ammo };
  });
}

{
  const fixture = lineworkFixture;
  run('fresh empty magazine admits no anchor, payment or recovery', () => {
    const f = fixture();
    f.p.ammo = 0;
    f.step({ technique1: true });
    assert.equal(f.shots.length, 0);
    assert.equal(f.status().lineworkRecovery, 0);
    return { ammo: f.p.ammo, recovery: f.status().lineworkRecovery };
  });
  run('actual ordinary body consumes paid anchor flight without damage or attachment', () => {
    const f = fixture(),
      from = { x: f.p.x, y: f.p.y },
      target = geometry.example.anchor;
    const minion = f.g.spawnMinion({
      kind: 'ordinary',
      x: (from.x + target.x) / 2,
      y: (from.y + target.y) / 2,
      health: 1000,
      speed: 0,
      radius: 16,
      damage: 0,
    });
    assert(minion);
    f.step({ technique1: true });
    for (let i = 0; i < 25; i++) f.step();
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.g.shots.size, 0);
    assert.equal(minion.health, 1000);
    assert.equal(f.status().lineworkRecovery, 241);
    return { paidRound: 1, bodyHealth: minion.health, attached: false };
  });
  run('controlled temporary solid stops flight without becoming masonry attachment', () => {
    const f = fixture(),
      x = (f.p.x + geometry.example.anchor.x) / 2,
      y = (f.p.y + geometry.example.anchor.y) / 2,
      temporary = { x: x - 12, y: y - 12, width: 24, height: 24 };
    Object.defineProperty(f.g, 'obstacles', { get: () => [...f.g.arena.obstacles, temporary] });
    f.step({ technique1: true });
    for (let i = 0; i < 25; i++) f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.g.shots.size, 0);
    return { controlledTemporarySolid: true, actualGameCollision: true, attached: false };
  });
  run('current original masonry removal permanently releases unpaid work', () => {
    const f = fixture();
    f.attach();
    const wall = geometry.example.actualHitRect,
      n = f.g.arena.obstacles.length;
    f.g.arena.obstacles = f.g.arena.obstacles.filter(
      (r: any) =>
        r.x !== wall.x || r.y !== wall.y || r.width !== wall.width || r.height !== wall.height,
    );
    assert.equal(f.g.arena.obstacles.length, n - 1);
    f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().lineworkRecovery, 241);
    return { removedActualOriginalWall: true, recovery: 241, noRefund: true };
  });
  run('new actual cover across the current lead severs it permanently', () => {
    const f = fixture();
    f.attach();
    const a = f.status().lineworkAnchor;
    f.g.arena.obstacles.push({
      x: (a.x + f.p.x) / 2 - 10,
      y: (a.y + f.p.y) / 2 - 10,
      width: 20,
      height: 20,
    });
    f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.status().lineworkRecovery, 241);
    return { controlledNewCover: true, actualCurrentLineObstruction: true };
  });
  for (const loss of ['entry', 'weapon'])
    run(loss + ' loss removes paid flight and retains rostered recovery', () => {
      const f = fixture();
      f.step({ technique1: true });
      const id = f.shots[0].id;
      if (loss === 'entry')
        f.p.skills = f.p.skills.filter((id: string) => id !== 'heavy-linework-1');
      else f.p.weapon = 'heavy-2';
      f.step();
      assert(!f.g.shots.has(id));
      assert.equal(f.status().lineworkUntil, 0);
      assert.equal(f.status().lineworkRecovery, 241);
      return { loss, removedShotId: id, recovery: 241 };
    });
  run(
    'actual disconnect/reconnect immediately removes dependent flight without erasing recovery',
    () => {
      const f = fixture();
      f.step({ technique1: true });
      const id = f.shots[0].id;
      f.g.setConnected(f.p.id, false);
      assert(
        !f.g.shots.has(id),
        'disconnect must retire actual flight before a same-frame reconnect',
      );
      f.g.setConnected(f.p.id, true);
      f.step();
      assert.equal(f.status().lineworkUntil, 0);
      assert.equal(f.status().lineworkRecovery, 241);
      return { removedShotId: id, recovery: 241 };
    },
  );
  run('actual disconnect/reconnect immediately releases an already attached line', () => {
    const f = fixture();
    f.attach();
    f.step({ technique2: true });
    f.g.setConnected(f.p.id, false);
    assert.equal(f.status().lineworkUntil, 0, 'disconnect must release attached work immediately');
    f.g.setConnected(f.p.id, true);
    f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.status().lineworkRecovery, 241);
    return { recovery: 241 };
  });
  run('unused Yoke loss falls back to bare handling instead of retaining primary privilege', () => {
    const f = fixture('yoke');
    f.attach();
    f.p.skills = f.p.skills.filter((id: string) => id !== 'heavy-linework-yoke-1');
    f.step({ technique2: true, fire: true });
    assert.equal(f.status().lineworkMode, 'bare');
    const old = f.shots.length;
    for (let n = 0; n < 5; n++) f.step({ fire: true });
    assert.equal(f.shots.length, old);
    assert(f.status().lineworkActive);
    return { mode: f.status().lineworkMode, noPrimaryPrivilege: true };
  });
  run('used Yoke loss removes its dependent work while keeping paid recovery', () => {
    const f = fixture('yoke');
    f.attach();
    f.step({ technique2: true });
    f.p.skills = f.p.skills.filter((id: string) => id !== 'heavy-linework-yoke-1');
    f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.status().lineworkRecovery, 241);
    return { recovery: 241 };
  });
  run('brake/reengage never extends original finite lifetime or pays another cartridge', () => {
    const f = fixture();
    f.attach();
    const original = f.status();
    f.step({ technique2: true });
    f.step({ technique2: true });
    assert(!f.status().lineworkActive);
    f.step({ technique2: true });
    assert(f.status().lineworkActive);
    assert.equal(f.status().lineworkUntil, original.lineworkUntil);
    while (f.g.combatTick <= original.lineworkUntil) f.step();
    assert.equal(f.status().lineworkUntil, 0);
    assert.equal(f.status().lineworkRecovery, 241);
    assert.equal(f.p.ammo, 44);
    return { originalUntil: original.lineworkUntil, endedAt: f.g.combatTick, rounds: 1 };
  });
  run('admitted cone brakes the motor without resetting the remaining line or its recovery', () => {
    const f = fixture();
    f.attach();
    f.step({ technique2: true });
    const original = f.status();
    f.step({ q: true });
    assert(f.p.qAt > f.g.combatTick);
    assert(!f.status().lineworkActive);
    assert.equal(f.status().lineworkUntil, original.lineworkUntil);
    assert.equal(f.status().lineworkRecovery, 241);
    return { actualConeAdmitted: true, retainedUntil: original.lineworkUntil, recovery: 241 };
  });
  run('rejected cone preserves current active motor and original deadline', () => {
    const f = fixture();
    f.attach();
    f.step({ technique2: true });
    const original = f.status();
    f.p.qAt = f.g.combatTick + 1000;
    f.step({ q: true });
    assert(f.status().lineworkActive);
    assert.equal(f.status().lineworkUntil, original.lineworkUntil);
    return { coneRejected: true, motorRetained: true };
  });
  run(
    'issued Braced Firing slows actual motor displacement rather than granting an extra movement privilege',
    () => {
      const f = fixture();
      f.attach();
      f.step({ technique2: true });
      const a = { x: f.p.x, y: f.p.y };
      f.step();
      const ordinary = Math.hypot(f.p.x - a.x, f.p.y - a.y);
      f.step({ e: true });
      assert(f.p.braceUntil > f.g.combatTick);
      const b = { x: f.p.x, y: f.p.y };
      f.step();
      const braced = Math.hypot(f.p.x - b.x, f.p.y - b.y);
      assert(braced > 0 && braced < ordinary);
      assert(f.status().lineworkActive);
      return { ordinaryDisplacement: ordinary, bracedDisplacement: braced, issuedEOnly: true };
    },
  );
  run(
    'actual host exit removes tracked flight/work instead of carrying it into another phase',
    () => {
      const f = fixture();
      f.step({ technique1: true });
      const id = f.shots[0].id;
      assert(f.g.endByHost());
      assert(!f.g.shots.has(id));
      assert.equal(f.status().lineworkUntil, 0);
      assert.equal(f.g.phase, 'defeat');
      return { actualHostExit: true, removedShotId: id };
    },
  );
  run('pooled-shot reuse cannot redirect old cleanup onto another owner', () => {
    const f = fixture();
    const ally = f.g.addPlayer('ally', 'Controlled foreign owner', 'soldier');
    f.step({ technique1: true });
    const id = f.shots[0].id,
      storage = f.g.shots.get(id);
    assert(storage);
    f.g.removeShot(storage);
    const foreign = f.g.emitShot(ally.id, f.p.x, f.p.y, 0, 0, 1, 1, 0, 10);
    assert(foreign);
    assert.equal(foreign, storage, 'actual pool storage reused');
    const foreignId = foreign.id;
    assert.notEqual(foreignId, id);
    f.p.skills = f.p.skills.filter((s: string) => s !== 'heavy-linework-1');
    f.step();
    assert.equal(f.g.shots.get(foreignId)?.owner, ally.id);
    return {
      oldId: id,
      foreignId,
      foreignOwnerRetained: ally.id,
      onlyCopiedIdsUsedForCleanupChecks: true,
    };
  });
  for (const when of ['flight', 'attached'])
    run('actual health-loss owner removal during ' + when, () => {
      const f = fixture();
      if (when === 'flight') f.step({ technique1: true });
      else f.attach();
      const ids = f.shots.map((s) => s.id);
      f.p.shield = 0;
      f.p.invulnerableUntil = 0;
      f.g.damage(f.p, 1e6);
      assert(f.p.health <= 0);
      assert(ids.every((id) => !f.g.shots.has(id)));
      assert.equal(f.status().lineworkUntil, 0);
      assert.equal(f.status().lineworkRecovery, 241);
      return { when, removed: ids, recovery: 241, actualDamageApi: true };
    });
}

{
  const fixture = attachedLineworkFixture;
  for (const mode of ['bare', 'yoke'])
    run(mode + ' braking cannot ratchet the original finite cable into free payout', () => {
      const f = fixture(mode),
        original = f.status(),
        anchor = original.lineworkAnchor;
      const smallAway = { moveX: f.away.moveX * 0.25, moveY: f.away.moveY * 0.25 };
      f.step(smallAway);
      for (let n = 0; n < 16 && f.status().lineworkUntil; n++) {
        // Opposing ordinary walking cancels the motor displacement during engagement;
        // a later separate brake permits a small ordinary backstep within slack.
        f.step({ technique2: true, ...f.away });
        f.step({ technique2: true, ...smallAway });
      }
      const maxDistance = Math.max(...f.trace.map((t: any) => t.actualDistance ?? 0)),
        after = f.status();
      assert(
        maxDistance <= original.lineworkPaidLength + 2 + 1e-6,
        'no Sheave purchase: brake/reengage must not manufacture payout beyond original slack; observed ' +
          maxDistance +
          ' from ' +
          original.lineworkPaidLength,
      );
      assert.equal(after.lineworkRecovery, original.lineworkRecovery);
      assert.equal(f.p.ammo, 44);
      return { original, after, maxDistance, anchor, controlledOpposingInput: true };
    });
  run('Sheave finite maximum cannot grow through active brake/reengage slack', () => {
    const f = fixture('sheave'),
      original = f.status(),
      smallAway = { moveX: f.away.moveX * 0.25, moveY: f.away.moveY * 0.25 };
    while (
      f.status().lineworkUntil &&
      Math.hypot(f.p.x - original.lineworkAnchor.x, f.p.y - original.lineworkAnchor.y) < 598
    )
      f.step(smallAway);
    for (let n = 0; n < 5 && f.status().lineworkUntil; n++) {
      f.step({ technique2: true, ...f.away });
      f.step({ technique2: true, ...smallAway });
    }
    const maxDistance = Math.max(...f.trace.map((t: any) => t.actualDistance ?? 0));
    assert(
      maxDistance <= 600 + 1e-6,
      'the actual surviving line may never exceed its finite600px maximum; observed ' + maxDistance,
    );
    assert.equal(f.status().lineworkRecovery, original.lineworkRecovery);
    assert.equal(f.p.ammo, 44);
    return { original, after: f.status(), maxDistance };
  });
}

{
  const fixture = lineworkFixture;
  run(
    'actual6000shot full-pool rejection spends no round/recovery and one freed slot admits the ordinary anchor',
    () => {
      const f = fixture(),
        ids: number[] = [];
      for (let n = 0; n < 6000; n++) {
        const shot = f.g.emitShot(f.p.id, f.p.x, f.p.y, 0, 0, 0, 1, 0, 10);
        assert(shot);
        ids.push(shot.id);
      }
      assert.equal(f.g.shots.size, 6000);
      const ammo = f.p.ammo;
      f.step({ technique1: true });
      assert.equal(f.g.shots.size, 6000);
      assert.equal(f.p.ammo, ammo);
      assert.equal(f.status().lineworkRecovery, 0);
      assert.equal(f.status().lineworkFlight, 0);
      f.g.removeShot(f.g.shots.get(ids[0]));
      f.step({ technique1: true });
      assert.equal(f.g.shots.size, 6000);
      assert.equal(f.p.ammo, ammo - 1);
      assert(f.status().lineworkFlight > 0);
      assert.equal(f.status().lineworkRecovery, 242);
      return {
        actualPoolSize: 6000,
        controlledStationaryFriendlyShots: true,
        deniedRoundCost: 0,
        admittedAfterOneRemovalRoundCost: 1,
        recovery: 242,
      };
    },
  );
  run(
    'empty actual magazine after canonical purchases rejects without a hidden anchor or clock',
    () => {
      const f = fixture();
      f.p.ammo = 0;
      f.step({ technique1: true });
      assert.equal(f.g.shots.size, 0);
      assert.equal(f.status().lineworkRecovery, 0);
      assert.equal(f.status().lineworkFlight, 0);
      return { controlledAmmo: 0, emitted: 0, roundCost: 0, recovery: 0 };
    },
  );
  run(
    'the last actual magazine round pays exactly once and stale input cannot repeat the cast',
    () => {
      const f = fixture();
      f.p.ammo = 1;
      const submitted = f.step({ technique1: true });
      assert.equal(f.p.ammo, 0);
      assert.equal(f.g.shots.size, 1);
      const original = f.status();
      assert(!f.g.submitInput(f.p.id, submitted));
      f.g.step();
      assert.equal(f.p.ammo, 0);
      assert.equal(f.status().lineworkRecovery, original.lineworkRecovery);
      assert.equal(f.g.shots.size, 1);
      return {
        controlledAmmo: 1,
        paid: 1,
        staleCommandRejected: true,
        originalRecovery: original.lineworkRecovery,
      };
    },
  );
  run(
    'simultaneous separateC/B irreversibly releases an attached line without re-engagement or new payment',
    () => {
      const f = fixture();
      f.step({ technique1: true });
      while (f.g.combatTick < 21 && !f.status().lineworkUntil) f.step();
      assert(f.status().lineworkUntil);
      f.step({ technique2: true });
      assert(f.status().lineworkActive);
      const original = f.status();
      f.step({ technique1: true, technique2: true });
      assert.equal(f.status().lineworkUntil, 0);
      assert(!f.status().lineworkActive);
      assert.equal(f.status().lineworkRecovery, original.lineworkRecovery);
      assert.equal(f.p.ammo, 44);
      return { roundCost: 1, recovery: original.lineworkRecovery, released: true };
    },
  );
}

test('the actual paid anchor uses its own validated wire visual and shared physical attachment feedback', () => {
  const f = attachedLineworkFixture();
  const shots = f.shots.filter((s) => s.visual === 'heavy-anchor');
  assert.equal(shots.length, 1);
  assert.equal(shots[0].damage, 0);
  assert.equal(shots[0].radius, 3);
  const native = shots.map(({ at, ...s }) => s),
    wire = encodeEvents([{ type: 'shots', shots: native }]),
    decoded = decodeEvents(wire);
  assert.deepEqual(decoded, [{ type: 'shots', shots: native }]);
  assert.equal(f.events.filter((e) => e.type === 'sound' && e.id === 'linework-anchor').length, 1);
  assert.equal(f.p.ammo, f.initialAmmo - 1);
});

test('lost entry hides owned kit controls while actual rostered recovery remains authoritative', () => {
  const f = lineworkFixture();
  f.step({ technique1: true });
  const recovery = f.status().lineworkRecovery;
  f.p.skills = f.p.skills.filter((id: string) => id !== 'heavy-linework-1');
  f.step();
  assert.equal(f.status().lineworkUntil, 0);
  assert.equal(f.status().lineworkRecovery, recovery);
  assert.equal(f.g.kitStatus(f.p.id).lineworkRecovery, undefined);
  assert.equal(f.g.kitStatus(f.p.id).lineworkConnection, undefined);
});
