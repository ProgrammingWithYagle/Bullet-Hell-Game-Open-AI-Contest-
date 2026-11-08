import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  isHeavyFlakSound,
  heavyFlakDurations,
  heavyFlakSample,
  playHeavyFlakSound,
  type HeavyFlakSound,
} from "../src/client/heavy-flak-sound.ts";
test("the actual launch, mechanical command and finite burst have distinct bounded native PCM at three common rates", () => {
  const ids = Object.keys(heavyFlakDurations) as HeavyFlakSound[];
  assert.equal(ids.length, 4);
  assert(!isHeavyFlakSound("sniper-shot"));
  assert(!isHeavyFlakSound("heavy-flak-unknown"));
  for (const rate of [22050, 44100, 48000]) {
    const hashes = new Set<string>();
    for (const id of ids) {
      assert(isHeavyFlakSound(id));
      const samples = Float32Array.from(
        { length: Math.ceil(rate * 0.2) },
        (_, i) => heavyFlakSample(id, i / rate),
      );
      assert(samples.every(Number.isFinite));
      assert.equal(samples[0], 0);
      assert.equal(samples.at(-1), 0);
      assert(samples.some((v) => Math.abs(v) > 0.01));
      assert(Math.max(...samples.map(Math.abs)) <= 0.45);
      hashes.add(
        createHash("sha256").update(Buffer.from(samples.buffer)).digest("hex"),
      );
    }
    assert.equal(hashes.size, 4);
  }
});
test("Heavy sound playback uses the selected finite buffer and releases its audio nodes once ended", () => {
  for (const id of Object.keys(heavyFlakDurations) as HeavyFlakSound[]) {
    let sourceDisconnected = 0,
      gainDisconnected = 0,
      done = 0,
      started = 0;
    const data = new Float32Array(Math.ceil(48000 * heavyFlakDurations[id])),
      source: any = {
        connect() {},
        disconnect() {
          sourceDisconnected++;
        },
        start() {
          started++;
        },
      },
      gain: any = {
        gain: { value: 0 },
        connect() {},
        disconnect() {
          gainDisconnected++;
        },
      },
      context: any = {
        sampleRate: 48000,
        destination: {},
        createBuffer: (_: number, n: number, rate: number) => {
          assert.equal(n, data.length);
          assert.equal(rate, 48000);
          return { getChannelData: () => data };
        },
        createBufferSource: () => source,
        createGain: () => gain,
      };
    playHeavyFlakSound(context, id, 4, () => done++);
    assert.equal(gain.gain.value, 1);
    assert.equal(started, 1);
    assert(data.some((v) => v !== 0));
    source.onended();
    assert.equal(done, 1);
    assert.equal(sourceDisconnected, 1);
    assert.equal(gainDisconnected, 1);
  }
});
