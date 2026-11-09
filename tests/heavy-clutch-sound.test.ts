import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  heavyClutchDurations as durations,
  heavyClutchSample as sample,
  isHeavyClutchSound,
  playHeavyClutchSound,
} from "../src/client/heavy-clutch-sound.ts";
test("two acquired Clutch reports are finite bounded distinct PCM at three native rates and reject unrelated ids", () => {
  assert.equal(isHeavyClutchSound("heavy-flak-shot"), false);
  for (const rate of [22050, 44100, 48000]) {
    const hashes = new Set();
    for (const id of Object.keys(durations) as (keyof typeof durations)[]) {
      assert(isHeavyClutchSound(id));
      const pcm = Float32Array.from(
        { length: Math.ceil(rate * durations[id]) },
        (_, i) => sample(id, i / rate),
      );
      assert(pcm.every(Number.isFinite));
      assert(Math.max(...pcm.map(Math.abs)) <= 0.28);
      assert(pcm.some((n) => Math.abs(n) > 0.015));
      assert.equal(sample(id, 0), 0);
      assert.equal(sample(id, durations[id]), 0);
      hashes.add(
        createHash("sha256").update(new Uint8Array(pcm.buffer)).digest("hex"),
      );
    }
    assert.equal(hashes.size, 2);
  }
});
test("each new native voice disconnects both audio nodes and releases its accounting once on completion", () => {
  for (const id of Object.keys(durations) as (keyof typeof durations)[]) {
    let released = 0,
      disconnected = 0;
    const source: any = {
        connect() {},
        disconnect() {
          disconnected++;
        },
        start() {
          this.onended();
        },
      },
      gain = {
        gain: { value: 0 },
        connect() {},
        disconnect() {
          disconnected++;
        },
      },
      context: any = {
        sampleRate: 22050,
        destination: {},
        createBuffer(_channels: number, length: number) {
          return { getChannelData: () => new Float32Array(length) };
        },
        createBufferSource: () => source,
        createGain: () => gain,
      };
    playHeavyClutchSound(context, id, 0.7, () => released++);
    assert.equal(released, 1);
    assert.equal(disconnected, 2);
    assert.equal(gain.gain.value, 0.7);
  }
});
