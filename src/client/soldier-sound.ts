/** Original dry footwork: two finite, quiet cloth/boot transients. */
export type SoldierSound =
  | "soldier-footwork"
  | "soldier-load-start"
  | "soldier-load-round"
  | "soldier-ready"
  | "soldier-step-reject";
export const isSoldierSound = (id: string): id is SoldierSound =>
  [
    "soldier-footwork",
    "soldier-load-start",
    "soldier-load-round",
    "soldier-ready",
    "soldier-step-reject",
  ].includes(id);
export function soldierSamples(rate: number) {
  if (!Number.isFinite(rate) || rate < 8000 || rate > 192000)
    throw Error("Invalid audio rate");
  const samples = new Float32Array(Math.ceil(rate * 0.24));
  let seed = 51283;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate,
      local = t < 0.12 ? t : t - 0.12,
      fade = Math.max(0, 1 - local / 0.105),
      attack = Math.min(1, local / 0.004);
    const noise = (seed / 0x100000000) * 2 - 1,
      tone = Math.sin(2 * Math.PI * (105 * local - 80 * local * local));
    samples[i] =
      (noise * 0.36 + tone * 0.22) *
      attack *
      fade *
      fade *
      (t < 0.12 ? 1 : 0.65);
  }
  return samples;
}
export function playSoldierSound(
  context: AudioContext,
  id: SoldierSound,
  volume: number,
  ended: () => void,
) {
  const samples =
      id === "soldier-footwork"
        ? soldierSamples(context.sampleRate)
        : id === "soldier-ready"
          ? soldierReadySamples(context.sampleRate)
          : id === "soldier-step-reject"
            ? soldierRejectSamples(context.sampleRate)
            : soldierLoadSamples(context.sampleRate, id),
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.065;
  source.connect(gain).connect(context.destination);
  let released = false;
  source.onended = () => {
    if (released) return;
    released = true;
    source.disconnect();
    gain.disconnect();
    ended();
  };
  source.start();
  return source;
}

export function soldierLoadSamples(
  rate: number,
  id: "soldier-load-start" | "soldier-load-round",
) {
  if (!Number.isFinite(rate) || rate < 8000 || rate > 192000)
    throw Error("Invalid audio rate");
  const duration = id === "soldier-load-start" ? 0.12 : 0.075,
    samples = new Float32Array(Math.ceil(rate * duration));
  let seed = 17323;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate,
      fade = Math.max(0, 1 - t / duration),
      attack = Math.min(1, t / 0.002),
      noise = (seed / 0x100000000) * 2 - 1;
    samples[i] =
      (noise * 0.18 +
        Math.sin(2 * Math.PI * (id === "soldier-load-start" ? 510 : 870) * t) *
          0.21) *
      attack *
      fade *
      fade;
  }
  return samples;
}

/** Quiet finite latch/confirmation; shared by earned first and relay openings. */
export function soldierReadySamples(rate: number) {
  if (!Number.isFinite(rate) || rate < 8000 || rate > 192000)
    throw Error("Invalid audio rate");
  const duration = 0.14,
    result = new Float32Array(Math.ceil(rate * duration));
  for (let i = 0; i < result.length; i++) {
    const t = i / rate;
    let value = 0;
    for (const [at, freq, level] of [
      [0, 1080, 0.12],
      [0.055, 730, 0.075],
    ]) {
      const local = t - at;
      if (local < 0 || local > 0.065) continue;
      const fade = Math.max(0, 1 - local / 0.065),
        attack = Math.min(1, local / 0.002);
      value +=
        Math.sin(2 * Math.PI * freq * local) * level * attack * fade * fade;
    }
    result[i] = value;
  }
  return result;
}

export function soldierRejectSamples(rate: number) {
  if (!Number.isFinite(rate) || rate < 8000 || rate > 192000)
    throw Error("Invalid audio rate");
  const duration = 0.07,
    samples = new Float32Array(Math.ceil(rate * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate,
      fade = Math.max(0, 1 - t / duration);
    samples[i] =
      Math.sin(2 * Math.PI * (180 * t - 250 * t * t)) *
      0.09 *
      Math.min(1, t / 0.003) *
      fade *
      fade;
  }
  return samples;
}
