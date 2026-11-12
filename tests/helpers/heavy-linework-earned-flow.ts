import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { data } from '../../src/shared/game.ts';
import { runtimeArena } from '../../src/shared/arena-layouts.ts';
import { gateObstacles } from '../../src/shared/civic-director.ts';
import { endlessSolids } from '../../src/shared/endless-director.ts';
import { constructHit } from '../../src/shared/class-kits.ts';
import { moveBody, segmentCircle, segmentRect } from '../../src/shared/geometry.ts';
import {
  heavyLineworkRules as rules,
  lineworkIds,
  lineworkTemporaryConstructs,
} from '../../src/shared/heavy-linework.ts';
import { HZ, type Event, type InputFrame, type Result } from '../../src/shared/protocol.ts';
import type { View } from '../../src/shared/view.ts';
import { restWait } from './sniper-rest-flow.ts';
import { restRaidInput, type ObservedRestShot } from './sniper-rest-raid-policy.ts';
import { lineworkMenu, spentLineworkSP } from './heavy-linework-menu-flow.ts';

export type LineworkFitting = 'bare' | 'yoke' | 'sheave';
type Purchase = { kind: 'skill' | 'weapon' | 'upgrade' | 'supply'; item: string };
export type LineworkTransport = {
  id: string;
  view(): View | undefined;
  events: Event[];
  observed: Map<number, ObservedRestShot>;
  input(input: Partial<InputFrame>): number;
  purchase(request: Purchase): Promise<Result>;
  start(): void;
  vote(index: number): void;
  pause(value: boolean): void;
  paused(): boolean;
  end?(): void;
  allyPolicy?(): void;
  stopAlly?(): void;
  checkObservers?(anchorId: number, until: number): Promise<void>;
};

/** Pick a manual ray from public geometry and visible bodies. */
function anchorBearing(view: View, id: string) {
  const player = view.players.find((p) => p.id === id)!;
  const arena = runtimeArena(view.arenaId, view.run.difficulty);
  const solids = [
    ...arena.obstacles,
    ...gateObstacles(view.bossCues, view.combatTick),
    ...endlessSolids(view.bossCues, view.combatTick),
  ];
  const bodies = [
    { ...view.boss, radius: data.bosses.find((b) => b.id === view.boss.id)!.radius + 35 },
    ...view.players
      .filter((p) => p.id !== id && p.connected && p.status === 'active')
      .map((p) => ({ ...p, radius: 16 })),
    ...view.minions.map((p) => ({ ...p, radius: p.radius + 22 })),
    ...(view.retinue ?? []),
  ];
  const constructs = lineworkTemporaryConstructs(view.classCues, view.combatTick);
  const candidates = Array.from({ length: 144 }, (_, index) => (index * Math.PI) / 72 - Math.PI)
    .flatMap((aim) => {
      const x = Math.cos(aim),
        y = Math.sin(aim),
        end = { x: player.x + x * 560, y: player.y + y * 560 };
      const hits = solids
        .flatMap((wall, index) => {
          const hit = segmentRect(player, end, wall, rules.radius);
          return hit ? [{ ...hit, index }] : [];
        })
        .sort((a, b) => a.t - b.t);
      const hit = hits[0];
      if (!hit || hit.index >= arena.obstacles.length || hit.t * 560 < 135 || hit.t * 560 > 480)
        return [];
      const contact = { x: player.x + x * 560 * hit.t, y: player.y + y * 560 * hit.t };
      const bounds = arena.bounds;
      if (
        contact.x < bounds.x + rules.radius ||
        contact.y < bounds.y + rules.radius ||
        contact.x > bounds.x + bounds.width - rules.radius ||
        contact.y > bounds.y + bounds.height - rules.radius
      )
        return [];
      if (
        bodies.some(
          (body) => segmentCircle(player, contact, body, body.radius + rules.radius) !== null,
        ) ||
        constructs.some((body) => constructHit(player, contact, body, rules.radius) !== null)
      )
        return [];
      const retreat = moveBody(player, { x: -x * 26, y: -y * 26 }, data.rules.playerRadius, solids);
      if (Math.hypot(retreat.x - player.x, retreat.y - player.y) < 18) return [];
      if (
        arena.lavaPits.some(
          (lava) => segmentCircle(retreat, contact, lava, lava.radius + 16) !== null,
        )
      )
        return [];
      const incidence = Math.abs(x * hit.normal.x + y * hit.normal.y);
      if (incidence < 0.5) return [];
      return [{ aim, score: Math.abs(hit.t * 560 - 235) + (1 - incidence) * 140 }];
    })
    .sort((a, b) => a.score - b.score);
  assert(
    candidates.length,
    'Actual arena has a clear manually aimed Lineworker route from the current position',
  );
  return candidates[0].aim;
}

export async function earnedLineworkFlow(transport: LineworkTransport, fitting: LineworkFitting) {
  const view = () => {
    const current = transport.view();
    assert(current, 'Missing authoritative view');
    return current;
  };
  const player = () => {
    const current = view().players.find((p) => p.id === transport.id);
    assert(current);
    return current;
  };
  const earned = () => player().sp + spentLineworkSP(player());
  const acknowledge = async (input: Partial<InputFrame>, label: string) => {
    const sequence = transport.input(input);
    await restWait(() => player().ack >= sequence, label);
    return sequence;
  };
  const ownedShots = () =>
    transport.events.flatMap((event) =>
      event.type === 'shots' ? event.shots.filter((s) => s.owner === transport.id) : [],
    );
  const removed = (id: number) =>
    transport.events.some((event) => event.type === 'remove' && event.ids.includes(id));
  const sounded = (id: string) =>
    transport.events.some(
      (event) => event.type === 'sound' && event.owner === transport.id && event.id === id,
    );
  const menu = await lineworkMenu(player);
  async function buy(item: string) {
    await menu.inspect(item, true, async () => {
      const result = await transport.purchase({ kind: 'skill', item });
      assert(result.ok, JSON.stringify(result));
    });
  }
  async function equip() {
    const weapons = data.weapons
      .filter((w) => w.classId === 'heavy')
      .sort((a, b) => b.tier - a.tier);
    for (const weapon of weapons) {
      if (player().weapon === weapon.id) break;
      if ((await transport.purchase({ kind: 'weapon', item: weapon.id })).ok) break;
    }
    for (const item of ['damage', 'health', 'fire-rate', 'reload', 'magazine'])
      await transport.purchase({ kind: 'upgrade', item });
    await transport.purchase({ kind: 'supply', item: 'medkit' });
  }
  async function attach() {
    await acknowledge({}, 'Stopped policy input before selecting an actual wall');
    const aim = anchorBearing(view(), transport.id),
      ammo = player().ammo,
      previous = ownedShots().length;
    const sequence = await acknowledge(
      { aim, technique1: true },
      'Actual Lineworker cast acknowledged',
    );
    await restWait(
      () =>
        ownedShots()
          .slice(previous)
          .some((s) => s.visual === 'heavy-anchor'),
      'Paid anchor trajectory arrives in its separate owner batch',
    );
    const shot = ownedShots()
      .slice(previous)
      .find((s) => s.visual === 'heavy-anchor')!;
    const castAt = shot.expires - rules.flightTicks;
    assert.equal(shot.damage, 0);
    assert.equal(player().ammo, ammo - 1);
    await restWait(
      () => !!player().kit.lineworkConnection && removed(shot.id),
      'Physical masonry attachment and separate flight removal',
    );
    const line = player().kit.lineworkConnection!,
      recovery = player().kit.lineworkRecovery!;
    assert.equal(line.until, castAt + rules.lineTicks);
    assert.equal(
      recovery,
      castAt + Math.ceil(rules.cooldown * (player().kit.lineworkCooldownScale ?? 1) * HZ),
    );
    assert.equal(player().kit.lineworkCastSequence, sequence);
    await restWait(() => sounded('linework-anchor'), 'Physical attachment sound reaches the owner');
    return { aim, ammo, shot, castAt, recovery, line };
  }
  try {
    assert.equal(earned(), 3);
    assert.deepEqual(player().skills, []);
    await buy('heavy-ordnance-1');
    await buy(lineworkIds.entry);
    await menu.inspect(lineworkIds.yoke, false);
    await menu.inspect(lineworkIds.sheave, false);
    await equip();
    transport.start();
    await restWait(() => view().phase === 'combat', 'Ordinary Short starts combat');
    const first = await attach();
    await acknowledge({ aim: first.aim, technique2: true }, 'Separate base haul command');
    assert(player().kit.lineworkActive);
    await acknowledge({ aim: first.aim, technique1: true }, 'Separate base release command');
    assert(!player().kit.lineworkConnection);
    assert.equal(player().kit.lineworkRecovery, first.recovery);

    const clearDeadline = Date.now() + 200_000;
    while (view().phase === 'combat') {
      assert(Date.now() < clearDeadline, 'Ordinary Short first-clear policy bound');
      transport.input(restRaidInput(view(), player(), [...transport.observed.values()]));
      transport.allyPolicy?.();
      await sleep(25);
    }
    transport.stopAlly?.();
    assert.notEqual(view().phase, 'defeat');
    assert.equal(view().encounter, 1);
    assert.equal(earned(), 9);
    assert.equal(player().progress.clears, 1);
    console.log(
      JSON.stringify({
        fitting,
        actualEarnedSP: earned(),
        actualClears: player().progress.clears,
        combatTick: view().combatTick,
      }),
    );
    const shopDeadline = Date.now() + 90_000;
    while (view().phase !== 'shop') {
      assert(
        Date.now() < shopDeadline && view().phase !== 'defeat',
        'Original reward clocks reach the first shop',
      );
      if (['mutationVote', 'contractVote'].includes(view().phase)) transport.vote(0);
      await sleep(25);
    }
    if (fitting !== 'bare') {
      await buy(lineworkIds[fitting]);
      await menu.inspect(lineworkIds[fitting === 'yoke' ? 'sheave' : 'yoke'], false);
    } else await menu.inspect(lineworkIds.sheave, true);
    const spent = spentLineworkSP(player());
    assert.equal(spent, fitting === 'bare' ? 3 : 5);
    await equip();
    const deployDeadline = Date.now() + 90_000;
    while (view().phase !== 'combat') {
      assert(
        Date.now() < deployDeadline && view().phase !== 'defeat',
        'Original shop and deployment clocks reach combat',
      );
      await sleep(25);
    }
    assert.equal(earned(), 9);
    assert(!view().run.testingModified && !view().run.customized);
    const second = await attach();
    let payout = 0;
    if (fitting === 'sheave') {
      const initial = second.line.initialLength;
      const out = { aim: second.aim, moveX: -Math.cos(second.aim), moveY: -Math.sin(second.aim) };
      const begin = view().combatTick;
      await acknowledge(out, 'Ordinary walk pays out the braked line');
      await restWait(() => view().combatTick >= begin + 3, 'Observe actual braked walking');
      await acknowledge({ aim: second.aim }, 'Stop after payout');
      const line = player().kit.lineworkConnection!;
      assert.equal(line.requiresFitting, lineworkIds.sheave);
      assert.equal(line.until, second.line.until);
      payout = Math.hypot(player().x - line.origin.x, player().y - line.origin.y) - initial;
      assert(payout > rules.slack);
    }
    const start = { x: player().x, y: player().y },
      beforePrimary = ownedShots().length,
      beforeAmmo = player().ammo;
    const begin = view().combatTick;
    await acknowledge(
      { aim: second.aim, technique2: true, fire: true },
      'Separate acquired haul command',
    );
    assert(player().kit.lineworkActive);
    await restWait(
      () => view().combatTick >= begin + 8,
      'Observe actual motor and primary handling',
    );
    await acknowledge({ aim: second.aim }, 'Stop requesting primary');
    const walked = Math.hypot(player().x - start.x, player().y - start.y),
      primary = ownedShots()
        .slice(beforePrimary)
        .filter((s) => !s.visual);
    assert(walked > 8);
    assert.equal(player().kit.lineworkUntil, second.line.until);
    if (fitting === 'yoke') {
      assert(primary.length > 0);
      assert(player().ammo < beforeAmmo);
    } else {
      assert.equal(primary.length, 0);
      assert.equal(player().ammo, beforeAmmo);
    }

    transport.pause(true);
    await restWait(() => transport.paused(), 'Actual pause acknowledgement');
    const frozenTick = view().combatTick,
      frozenAmmo = player().ammo,
      frozenAck = player().ack;
    transport.input({ aim: second.aim, technique1: true, fire: true });
    await sleep(90);
    assert.equal(view().combatTick, frozenTick);
    assert.equal(player().ammo, frozenAmmo);
    assert.equal(player().ack, frozenAck);
    assert.equal(player().kit.lineworkUntil, second.line.until);
    await transport.checkObservers?.(second.shot.id, second.line.until);
    transport.pause(false);
    await restWait(() => !transport.paused(), 'Actual unpause acknowledgement');
    if (transport.end) {
      transport.end();
      await restWait(() => view().phase === 'defeat', 'Real room host exit');
    } else
      await acknowledge(
        { aim: second.aim, technique1: true },
        'Actual Solo release clears the line',
      );
    assert(!player().kit.lineworkConnection);
    assert(!player().kit.lineworkFlight);
    return {
      passed: true,
      fitting,
      actualEarnedSequence: [3, 9],
      actualClears: 1,
      spent,
      walked,
      payout,
      paidPrimaryProjectiles: primary.length,
      firstAnchorId: first.shot.id,
      secondAnchorId: second.shot.id,
      originalLifetimeTicks: rules.lineTicks,
      menuObservations: menu.observations,
    };
  } catch (error) {
    const current = transport.view(),
      actor = current?.players.find((p) => p.id === transport.id);
    console.error(
      JSON.stringify({
        phase: current?.phase,
        encounter: current?.encounter,
        combatTick: current?.combatTick,
        actor,
        fitting,
      }),
    );
    throw error;
  } finally {
    await menu.close();
  }
}
