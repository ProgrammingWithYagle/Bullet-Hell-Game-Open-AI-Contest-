import test from "node:test";
import assert from "node:assert/strict";
import {
  isSniperSound,
  sniperSample,
} from "../src/client/soldier-sniper-sound.ts";
test("Sniper preparation and report sounds are finite, distinct and bounded at actual common sample rates", () => {
  assert(isSniperSound("sniper-settle"));
  assert(isSniperSound("sniper-shot"));
  assert(!isSniperSound("sniper-unknown"));
  for (const rate of [22050, 44100, 48000]) {
    const sets = ["sniper-settle", "sniper-shot"].map((id) =>
      Array.from({ length: Math.ceil(rate * 0.2) }, (_, i) =>
        sniperSample(id as any, i / rate),
      ),
    );
    for (const values of sets) {
      assert(values.every(Number.isFinite));
      assert(Math.max(...values.map(Math.abs)) <= 0.5);
      assert(values[0] === 0);
      assert(values.at(-1) === 0);
      assert(values.some((v) => Math.abs(v) > 0.01));
    }
    assert.notDeepEqual(sets[0], sets[1]);
  }
});
