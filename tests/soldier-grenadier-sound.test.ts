import test from "node:test";
import assert from "node:assert/strict";
import {
  grenadierSamples,
  isGrenadierSound,
  playGrenadierSound,
  type GrenadierSound,
} from "../src/client/soldier-grenadier-sound.ts";
test("Grenadier mechanical sounds are finite, deterministic, bounded and release each native voice exactly once", () => {
  const ids: GrenadierSound[] = [
    "grenadier-prime",
    "grenadier-pin",
    "grenadier-throw",
    "grenadier-contact",
    "grenadier-blast",
  ];
  for (const id of ids) {
    assert(isGrenadierSound(id));
    for (const rate of [8000, 44100, 48000, 96000, 192000]) {
      const samples = grenadierSamples(rate, id);
      assert.deepEqual(samples, grenadierSamples(rate, id));
      assert(samples.every(Number.isFinite));
      assert(samples.some((v) => v !== 0));
      assert(samples.every((v) => Math.abs(v) < 0.51));
      assert(samples[0] === 0);
      assert(Math.abs(samples.at(-1)!) < 0.001);
      assert(samples.length < rate * 0.2);
    }
    assert.throws(() => grenadierSamples(1, id));
    let source: any,
      ended = 0,
      disconnected = 0;
    const gain = {
        gain: { value: 0 },
        connect() {
          return this;
        },
        disconnect() {
          disconnected++;
        },
      },
      context: any = {
        sampleRate: 48000,
        destination: {},
        createBuffer: (_a: number, n: number) => ({
          getChannelData: () => new Float32Array(n),
        }),
        createBufferSource: () =>
          (source = {
            connect() {
              return gain;
            },
            disconnect() {
              disconnected++;
            },
            start() {},
            onended: null,
          }),
        createGain: () => gain,
      };
    playGrenadierSound(context, id, 0.5, () => ended++);
    source.onended();
    source.onended();
    assert.equal(ended, 1);
    assert.equal(disconnected, 2);
  }
  assert(!isGrenadierSound("soldier-bank"));
  assert(!isGrenadierSound("unknown"));
});
