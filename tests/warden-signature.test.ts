import test from "node:test";
import assert from "node:assert/strict";
import {
  WARDEN_SIGNATURE as rule,
  WARDEN_CYCLE_TICKS,
  WardenClock,
  sampleWarden,
  sectorIntersectsCircle,
  wardenCanHit,
  wrappedAngle,
} from "../src/shared/warden-signature.ts";

const origin = { x: 570, y: 360 };
const polar = (angle: number, radius: number) => ({
  x: origin.x + Math.cos(angle) * radius,
  y: origin.y + Math.sin(angle) * radius,
});

test("Warden gives 36 harmless tell ticks, 120 active ticks, then 120 harmless rest ticks", () => {
  const counts = { warning: 0, active: 0, rest: 0 };
  for (let tick = 0; tick < WARDEN_CYCLE_TICKS; tick++) {
    const sample = sampleWarden(tick, origin, 0);
    counts[sample.phase]++;
    assert.equal(
      wardenCanHit(sample, polar(sample.cone.aim, 200), 12),
      sample.phase === "active",
    );
    assert.equal(sample.remainingTicks > 0, true);
  }
  assert.deepEqual(counts, { warning: 36, active: 120, rest: 120 });
  assert.equal(sampleWarden(36, origin, 0).phaseTick, 0);
  assert.equal(sampleWarden(156, origin, 0).phase, "rest");
  assert.equal(sampleWarden(276, origin, 0).phase, "warning");
  assert.equal(sampleWarden(276, origin, 0).cycle, 1);
});

test("the trailing safe wedge stays disjoint from the rotating hazard through angle wrap", () => {
  for (let tick = 36; tick < 156; tick++) {
    const sample = sampleWarden(tick, origin, Math.PI - 0.1);
    for (const fraction of [-0.85, 0, 0.85]) {
      const body = polar(
        sample.trailingSafe.aim + (sample.trailingSafe.arc / 2) * fraction,
        220,
      );
      assert.equal(
        wardenCanHit(sample, body, 4),
        false,
        "marked safe interior must be safe",
      );
    }
    assert(
      Math.abs(
        wrappedAngle(
          sample.cone.aim -
            (Math.PI - 0.1) -
            sample.phaseTick * rule.radiansPerTick,
        ),
      ) < 1e-9,
    );
  }
  const start = sampleWarden(36, origin, 0),
    secondLater = sampleWarden(66, origin, 0);
  assert(
    Math.abs(secondLater.cone.aim - start.cone.aim - (24 * Math.PI) / 180) <
      1e-9,
  );
});

test("sector collision includes body radius at sides, outer arc and endpoint corners", () => {
  const sector = { ...origin, radius: 100, aim: 0, arc: Math.PI / 2 };
  assert(sectorIntersectsCircle(sector, polar(0, 111), 12));
  assert(!sectorIntersectsCircle(sector, polar(0, 113), 12));
  assert(sectorIntersectsCircle(sector, polar(Math.PI / 4 + 0.1, 80), 12));
  assert(!sectorIntersectsCircle(sector, polar(Math.PI / 4 + 0.2, 80), 12));
  assert(sectorIntersectsCircle(sector, polar(Math.PI / 4 + 0.05, 108), 12));
  assert(!sectorIntersectsCircle(sector, polar(Math.PI, 40), 12));
  assert(sectorIntersectsCircle(sector, polar(Math.PI, 10), 12));
  assert(!sectorIntersectsCircle(sector, polar(Math.PI / 2, 100), 0));
});

test("a full warning locks aim instead of chasing the survivor and retargets only next cycle", () => {
  const clock = new WardenClock(origin, polar(0, 200));
  for (let tick = 1; tick < WARDEN_CYCLE_TICKS; tick++) {
    const sample = clock.advance(polar(Math.PI, 200));
    if (sample.phase === "warning") assert.equal(sample.cone.aim, 0);
    if (sample.phase === "active")
      assert(
        Math.abs(sample.cone.aim - sample.phaseTick * rule.radiansPerTick) <
          1e-9,
      );
  }
  assert.equal(clock.advance(polar(Math.PI, 200)).cone.aim, Math.PI);
  clock.reset(polar(-Math.PI / 2, 200));
  assert.equal(clock.tick, 0);
  assert.equal(clock.sample().cone.aim, -Math.PI / 2);
});

test("invalid clocks and nonfinite geometry cannot create invisible or permanent hazards", () => {
  for (const tick of [-1, NaN, Infinity, 0.5])
    assert.throws(() => sampleWarden(tick, origin, 0), RangeError);
  assert.throws(() => sampleWarden(0, origin, NaN), RangeError);
  assert.throws(
    () =>
      sectorIntersectsCircle(
        { ...origin, radius: 2, aim: 0, arc: 0 },
        origin,
        2,
      ),
    RangeError,
  );
  const clock = new WardenClock(origin, polar(0, 200));
  assert.throws(() => clock.advance({ x: NaN, y: 0 }), RangeError);
  assert.equal(clock.tick, 0);
});
