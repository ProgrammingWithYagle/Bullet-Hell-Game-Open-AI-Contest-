import test from "node:test";
import assert from "node:assert/strict";
import {
  engineerSoundSpecs,
  engineerSamples,
  isEngineerSound,
  playEngineerSound,
} from "../src/client/engineer-sound.ts";
test("Original Engineer cues are distinct finite mono waveforms with quiet, click-free envelopes", () => {
  const signatures = new Set<string>();
  for (const [id, spec] of Object.entries(engineerSoundSpecs)) {
    assert(isEngineerSound(id));
    assert(spec.duration > 0 && spec.duration <= 0.4);
    assert(spec.gain > 0 && spec.gain <= 0.08);
    for (const rate of [44100, 48000]) {
      const samples = engineerSamples(
        id as keyof typeof engineerSoundSpecs,
        rate,
      );
      assert.equal(samples.length, Math.ceil(rate * spec.duration));
      let peak = 0,
        energy = 0;
      for (const value of samples) {
        assert(Number.isFinite(value));
        peak = Math.max(peak, Math.abs(value));
        energy += value * value;
      }
      assert(peak > 0 && peak <= 1);
      assert(energy / samples.length > 0.001);
      assert.equal(Math.abs(samples[0]), 0);
      assert(Math.abs(samples.at(-1)!) < 1e-6);
      signatures.add(
        Buffer.from(samples.buffer).subarray(0, 256).toString("hex"),
      );
    }
  }
  assert.equal(signatures.size,Object.keys(engineerSoundSpecs).length*2);
  assert(!isEngineerSound("engineer-unknown"));
  assert.throws(() => engineerSamples("engineer-rail", NaN));
});
test("Each Engineer sound starts one bounded source and releases its voice and gain exactly once", () => {
  for (const id of Object.keys(
    engineerSoundSpecs,
  ) as (keyof typeof engineerSoundSpecs)[]) {
    let created = 0,
      released = 0,
      disconnected = 0,
      started = 0;
    const source: any = {
        buffer: null,
        onended: null,
        connect: () => ({ connect() {} }),
        disconnect() {
          disconnected++;
        },
        start(at: number) {
          assert.equal(at, 17);
          started++;
        },
      },
      gain = {
        gain: { value: 0 },
        disconnect() {
          disconnected++;
        },
      };
    const context = {
      sampleRate: 48000,
      currentTime: 17,
      destination: {},
      createBuffer(channels: number, size: number, rate: number) {
        assert.equal(channels, 1);
        assert.equal(rate, 48000);
        const samples = new Float32Array(size);
        return { getChannelData: () => samples };
      },
      createBufferSource() {
        created++;
        return source;
      },
      createGain: () => gain,
    } as unknown as AudioContext;
    playEngineerSound(context, id, 2, () => released++);
    assert.equal(created, 1);
    assert.equal(started, 1);
    assert.equal(gain.gain.value, engineerSoundSpecs[id].gain);
    source.onended();
    source.onended();
    assert.equal(released, 1);
    assert.equal(disconnected, 2);
  }
});
