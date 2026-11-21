import test from "node:test";
import assert from "node:assert/strict";
import {
  bellSoundSpecs,
  isBellSound,
  playBellSound,
} from "../src/client/bell-sound.ts";
test("primary toll, responding bell and clapper have distinct bounded metallic synthesis specifications", () => {
  assert(isBellSound("bell-toll"));
  assert(isBellSound("bell-answer"));
  assert(isBellSound("bell-clapper"));
  assert(!isBellSound("warning"));
  assert(!isBellSound("__proto__"));
  assert.equal(
    new Set(Object.values(bellSoundSpecs).map((s) => s.frequency)).size,
    3,
  );
  for (const s of Object.values(bellSoundSpecs)) {
    assert(s.duration > 0 && s.duration <= 1);
    assert.equal(s.ratios.length, 3);
    assert(s.levels.reduce((a, b) => a + b, 0) < 0.2);
  }
});
test("each real bell cue schedules exactly three bounded partials and releases its voice once after all nodes disconnect", () => {
  for (const id of ["bell-toll", "bell-answer", "bell-clapper"] as const) {
    const tones: {
        onended: () => void;
        stops: number[];
        starts: number[];
        disconnected: number;
      }[] = [],
      gains: { disconnected: number }[] = [];
    let ended = 0;
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    const context = {
      currentTime: 7,
      destination: {},
      createOscillator() {
        const n = {
          frequency: param,
          type: "sine",
          onended: () => {},
          starts: [] as number[],
          stops: [] as number[],
          disconnected: 0,
          connect(g: unknown) {
            return g;
          },
          start(t: number) {
            this.starts.push(t);
          },
          stop(t: number) {
            this.stops.push(t);
          },
          disconnect() {
            this.disconnected++;
          },
        };
        tones.push(n);
        return n;
      },
      createGain() {
        const n = {
          gain: param,
          disconnected: 0,
          connect() {
            return this;
          },
          disconnect() {
            this.disconnected++;
          },
        };
        gains.push(n);
        return n;
      },
    };
    playBellSound(context as unknown as AudioContext, id, 0.4, () => ended++);
    assert.equal(tones.length, 3);
    assert.equal(gains.length, 3);
    for (const t of tones) {
      assert.deepEqual(t.starts, [7]);
      assert.equal(t.stops.length, 1);
      assert(t.stops[0] > 7 && t.stops[0] < 8.1);
    }
    tones[0].onended();
    tones[1].onended();
    assert.equal(ended, 0);
    tones[2].onended();
    assert.equal(ended, 1);
    assert(tones.every((t) => t.disconnected === 1));
    assert(gains.every((g) => g.disconnected === 1));
  }
});
