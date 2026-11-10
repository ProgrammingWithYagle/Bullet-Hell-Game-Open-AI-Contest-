import test from "node:test";
import assert from "node:assert/strict";
import { handlingGameFixture } from "./helpers/heavy-clutch-handling-game-fixture.ts";
import { heavyClutchHandlingOperation } from "./helpers/heavy-clutch-handling-flow.ts";
import { openId } from "../src/shared/heavy-traverse.ts";
import { viewOf } from "../src/shared/view.ts";

// Controlled late Endless27, raw Iron Rain and optional held-fire debt isolate the test adapter's round ledger.
// These do not replace the ordinary earned Short/actual non-host peer cases.
async function operation(
  mode: "loose" | "spade" | "floating",
  delayedDebt = false,
) {
  const f = handlingGameFixture(mode, openId);
  f.g.mutations.push({ id: "iron-rain", remaining: 2 });
  f.g.statsCache.clear();
  const events: any[] = [],
    pending = new Set<ReturnType<typeof setTimeout>>();
  let paused = false,
    debtApplied = false,
    simulationError: unknown;
  const drain = () => {
    const batch = f.g.drainEvents();
    if (
      delayedDebt &&
      batch.some(
        (e: any) =>
          e.type === "sound" &&
          e.owner === f.p.id &&
          e.id === "weapon-heavy-lmg",
      )
    ) {
      const handle = setTimeout(() => {
        pending.delete(handle);
        events.push(...batch);
      }, 120);
      pending.add(handle);
    } else events.push(...batch);
  };
  const timer = setInterval(() => {
    if (paused || simulationError) return;
    try {
      if (
        delayedDebt &&
        !debtApplied &&
        f.p.input.fire &&
        f.g.traverse.openFeed(f.p.id)
      ) {
        f.p.wasFiring = true;
        f.p.fireAt = f.g.combatTick - 10;
        debtApplied = true;
      }
      f.g.step();
      drain();
    } catch (e) {
      simulationError = e;
    }
  }, 1000 / 30);
  try {
    const result = await heavyClutchHandlingOperation(
      {
        owner: f.p.id,
        view: () => {
          assert.ifError(simulationError);
          return viewOf(f.g, f.p.id);
        },
        events,
        bursts: new Map(),
        input: (frame) => {
          if (!paused) assert(f.g.submitInput(f.p.id, frame));
        },
        purchase: async () => assert.fail("No operation purchase"),
        start: async () => assert.fail("No restart"),
        pause: async (value) => {
          f.g.clearInputs();
          paused = value;
        },
      },
      mode,
      openId,
    );
    assert.equal(
      result.actualPrimaryRoundFiringEvents,
      result.actualPrimaryRounds,
    );
    assert.equal(
      result.actualPrimaryProjectiles,
      2 * result.actualPrimaryRounds,
    );
    assert.equal(result.actualTradedSlots, f.conversions.length);
    assert.equal(
      result.actualCrounds +
        result.actualTradedSlots +
        result.actualPassedSlots,
      4,
    );
    assert.equal(
      result.actualPaidRounds,
      result.actualCrounds + result.actualPrimaryRounds,
    );
    assert.equal(
      result.actualPrimaryRounds,
      result.actualTradedSlots + result.actualPostStrokePrimaryRounds,
    );
    assert.equal(result.originalUntil - result.originalBorn, 31);
    if (delayedDebt) {
      assert(debtApplied);
      assert.equal(result.actualTradedSlots, 3);
      assert(result.actualPostStrokePrimaryRounds >= 1);
    } else {
      assert.equal(result.actualTradedSlots, 1);
      assert.equal(result.actualPostStrokePrimaryRounds, 0);
    }
  } finally {
    clearInterval(timer);
    for (const handle of pending) clearTimeout(handle);
  }
}

for (const mode of ["loose", "spade", "floating"] as const)
  test(
    "operation proof counts paid Iron Rain rounds separately from physical projectiles: " +
      mode,
    { timeout: 15000 },
    async () => {
      await operation(mode);
    },
  );
test(
  "delayed separate event delivery preserves three actual conversions and separately counts ordinary primary after the stroke is exhausted",
  { timeout: 15000 },
  async () => {
    await operation("loose", true);
  },
);
