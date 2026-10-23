import test from "node:test";
import assert from "node:assert/strict";
import {
  WardenRehearsal,
  WARDEN_GROUND,
} from "../src/shared/warden-rehearsal.ts";
import { WARDEN_SIGNATURE as rule } from "../src/shared/warden-signature.ts";
import {
  wardenPose,
  lanternWorld,
  wardenArt,
} from "../src/client/warden-presentation.ts";
import { sampleWarden } from "../src/shared/warden-signature.ts";

test("Warden presentation holds anticipation, channels throughout danger and recovers only in rest", () => {
  for (let tick = 0; tick < 36; tick++) {
    const pose = wardenPose(sampleWarden(tick, WARDEN_GROUND, 0));
    assert.equal(pose.clip, "attack");
    assert(pose.frame < 4);
  }
  assert.deepEqual(wardenPose(sampleWarden(36, WARDEN_GROUND, 0)), {
    clip: "attack",
    frame: 4,
  });
  for (let tick = 40; tick < 156; tick++) {
    const sample = sampleWarden(tick, WARDEN_GROUND, 0);
    assert.equal(wardenPose(sample).clip, "channel");
    assert.deepEqual(wardenPose(sample, true), { clip: "channel", frame: 0 });
  }
  assert.deepEqual(wardenPose(sampleWarden(156, WARDEN_GROUND, 0)), {
    clip: "attack",
    frame: 5,
  });
  assert.equal(wardenPose(sampleWarden(173, WARDEN_GROUND, 0)).clip, "idle");
});

test("all lantern attachments transform with the exact shared scale and foot origin", () => {
  for (const clip of ["idle", "attack", "channel"] as const) {
    for (let frame = 0; frame < wardenArt.clips[clip].frames; frame++) {
      const point = lanternWorld({ clip, frame }, { x: 100, y: 200 });
      const translated = lanternWorld({ clip, frame }, { x: 117, y: 189 });
      assert(Math.abs(translated.x - point.x - 17) < 1e-9);
      assert(Math.abs(translated.y - point.y + 11) < 1e-9);
      assert(
        point.x > 100 && point.y < 200,
        "physical-left lantern stays viewer-right and above feet",
      );
    }
  }
});

test("local rehearsal never damages during tells/rest, caps contact rate and resets cleanly", () => {
  const model = new WardenRehearsal();
  const startAim = model.sample().cone.aim;
  for (let step = 0; step < 200; step++) {
    const before = model.health;
    const nextTick = model.clock.tick + 1;
    const sample = sampleWarden(nextTick, WARDEN_GROUND, startAim);
    // Keep a stationary-per-step body in the cone's interior to isolate hazard cadence.
    model.player = {
      x: WARDEN_GROUND.x + Math.cos(sample.cone.aim) * 200,
      y: WARDEN_GROUND.y + Math.sin(sample.cone.aim) * 200,
    };
    model.step({ x: 0, y: 0 });
    if (sample.phase !== "active") assert.equal(model.health, before);
  }
  assert.equal(model.hits, 8);
  assert.equal(model.health, 100 - 8 * rule.contactDamage);
  model.reset();
  assert.equal(model.health, 100);
  assert.equal(model.hits, 0);
  assert.equal(model.clock.tick, 0);
  const player = { ...model.player };
  assert.throws(() => model.step({ x: NaN, y: 0 }), RangeError);
  assert.deepEqual(model.player, player);
  assert.equal(model.clock.tick, 0);
});

test("rehearsal uses fixed steps, normalizes diagonal travel and stops after defeat", () => {
  const horizontal = new WardenRehearsal(),
    diagonal = new WardenRehearsal();
  const start = { ...horizontal.player };
  horizontal.step({ x: 1, y: 0 });
  diagonal.step({ x: 1, y: 1 });
  assert(
    Math.abs(
      Math.hypot(horizontal.player.x - start.x, horizontal.player.y - start.y) -
        Math.hypot(diagonal.player.x - start.x, diagonal.player.y - start.y),
    ) < 1e-9,
  );
  diagonal.health = 0;
  const tick = diagonal.clock.tick,
    position = { ...diagonal.player };
  diagonal.step({ x: 1, y: 1 });
  assert.equal(diagonal.clock.tick, tick);
  assert.deepEqual(diagonal.player, position);
});
