import assert from "node:assert/strict";
import {
  HZ,
  idleInput,
  validInput,
  type InputFrame,
  type Shot,
} from "../../src/shared/protocol.ts";
import {
  traverseIds as ids,
  heavyTraverseRules as r,
} from "../../src/shared/heavy-traverse.ts";
import {
  heavyOpenLane,
  heavyWait,
  type HeavyFlakAdapter,
} from "./heavy-flak-flow.ts";
export type TraverseVariant = "loose" | "spade" | "floating";
/** Actual ordinary Short3 or Raid12 transport; no checkpoint, state injection, fixture budget or rendered proof. */
export async function heavyTraverseFlow(
  a: HeavyFlakAdapter,
  mode: TraverseVariant,
  options: { purchase?: (item: string) => Promise<void> } = {},
) {
  const view = () => {
      const v = a.view();
      assert(v);
      return v;
    },
    p = () => {
      const owner = view().players.find((p) => p.id === a.owner);
      assert(owner);
      return owner;
    },
    shots = () =>
      a.events
        .flatMap((e) => (e.type === "shots" ? e.shots : []))
        .filter((s) => s.owner === a.owner),
    removed = (id: number) =>
      a.events.some((e) => e.type === "remove" && e.ids.includes(id));
  let sequence = 0;
  const input = (action: Partial<InputFrame> = {}) => {
    const frame = { ...idleInput(), sequence: ++sequence, aim: 0, ...action };
    assert(validInput(frame));
    a.input(frame);
    return sequence;
  };
  const initial = mode === "loose" ? 3 : 12,
    items = [
      "heavy-ordnance-1",
      ids.entry,
      ...(mode === "loose" ? [] : [ids[mode]]),
    ];
  assert.equal(p().sp, initial);
  assert.equal(p().skills.length, 0);
  for (const item of items) {
    await (options.purchase ? options.purchase(item) : a.purchase(item));
    await heavyWait(
      () => p().skills.includes(item),
      "separate actual Traverse ownership view",
    );
  }
  assert.equal(p().sp, initial - (mode === "loose" ? 3 : 5));
  assert.deepEqual(p().skills, items);
  await a.start();
  await heavyWait(() => view().phase === "combat", "ordinary Traverse combat");
  await a.pause(true);
  const tick = view().combatTick,
    ammo = p().ammo;
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    dodge: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(view().combatTick, tick);
  assert.equal(shots().length, 0);
  await a.pause(false);
  const idle = input();
  await heavyWait(
    () => p().ack >= idle,
    "fresh idle after discarded paused actions",
  );
  assert.equal(shots().length, 0);
  assert.equal(p().ammo, ammo);
  const aim = heavyOpenLane(view(), a.owner).aim;
  input({ technique1: true, technique2: true, aim });
  await heavyWait(
    () => shots().length === 1 && (p().kit.heavyTraverseShotAt ?? 0) > 0,
    "actual first paid round event batch and separate status view",
  );
  const born = p().kit.heavyTraverseShotAt!,
    recovery = p().kit.technique1At!,
    first = structuredClone(shots()[0]);
  assert.equal(p().ammo, ammo - 1);
  assert.equal(first.expires, born + Math.ceil(r.lifeSeconds * HZ));
  assert.equal(first.radius, r.radius);
  assert(first.damage >= r.damage);
  assert.equal(first.pierce, 0);
  assert(!first.visual);
  for (const key of [
    "origin",
    "weapon",
    "required",
    "stroke",
    "flights",
    "mode",
  ])
    assert(!(key in first));
  await a.pause(true);
  const pausedTick = view().combatTick,
    until = p().kit.heavyTraverseUntil;
  assert((until ?? 0) > pausedTick);
  await a.lateAndNonHostChecks?.();
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    dodge: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(view().combatTick, pausedTick);
  assert.equal(p().kit.heavyTraverseUntil, until);
  assert.equal(p().kit.technique1At, recovery);
  assert.equal(shots().length, 1);
  await a.pause(false);
  input({ aim });
  await heavyWait(
    () => shots().length === 4 && (p().kit.heavyTraverseUntil ?? 0) === 0,
    "all four actual admission events and completed authoritative stroke",
  );
  assert.equal(p().ammo, ammo - 4);
  assert.equal(p().kit.technique1At, recovery);
  assert.deepEqual(
    shots().map((s) => s.expires - Math.ceil(r.lifeSeconds * HZ)),
    [born, born + 10, born + 20, born + 30],
  );
  assert(shots().every((s) => Math.abs(Math.atan2(s.vy, s.vx) - aim) < 1e-6));
  const alive = shots().filter((s) => !removed(s.id));
  let actualHostExit = false;
  if (a.end) {
    assert(alive.length > 0, "actual live paid flight before host exit");
    await a.end();
    await heavyWait(
      () => alive.every((s) => removed(s.id)),
      "actual host removes paid physical flights and separately delivers owner removals",
    );
    actualHostExit = true;
  } else
    await heavyWait(
      () => shots().every((s) => removed(s.id)),
      "actual finite flight expiry/removal events",
    );
  for (const s of shots()) a.checkOwnerStreams?.(s.id);
  return {
    passed: true,
    mode,
    ordinaryStartingSP: initial,
    actualSkillPurchases: items.length,
    spentSkillSP: mode === "loose" ? 3 : 5,
    remainingSP: p().sp,
    actualAdmissionTicks: shots().map(
      (s) => s.expires - Math.ceil(r.lifeSeconds * HZ),
    ),
    fourSeparatePaidRounds: true,
    finiteSlotsWithoutCatchup: true,
    originalRecovery: recovery,
    pausedRequestsDiscarded: true,
    pausedStrokeClockFrozen: true,
    noCheckpointOrBudgetHealthPositionInjection: true,
    noEmptyBOperation: true,
    actualHostExit,
    shots: shots().map((s) => ({ ...s })),
    limits:
      "Owner/worker/network authority only; a Short3/Raid12 gate is separate from earned9 fitting acquisition and rendered/device/human acceptance.",
  };
}
