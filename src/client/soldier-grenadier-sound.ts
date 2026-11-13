export type GrenadierSound =
  | "grenadier-prime"
  | "grenadier-pin"
  | "grenadier-throw"
  | "grenadier-contact"
  | "grenadier-blast";
const ids: readonly string[] = [
  "grenadier-prime",
  "grenadier-pin",
  "grenadier-throw",
  "grenadier-contact",
  "grenadier-blast",
];
export const isGrenadierSound = (id: string): id is GrenadierSound =>
  ids.includes(id);
export function grenadierSamples(rate: number, id: GrenadierSound) {
  if (
    !Number.isFinite(rate) ||
    rate < 8000 ||
    rate > 192000 ||
    !isGrenadierSound(id)
  )
    throw Error("Invalid grenade audio request");
  const blast = id === "grenadier-blast",
    duration = blast ? 0.18 : id === "grenadier-throw" ? 0.09 : 0.075,
    samples = new Float32Array(Math.ceil(rate * duration));
  let seed = blast ? 70591 : 18217;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate,
      fade = Math.max(0, 1 - t / duration),
      attack = Math.min(1, t / 0.003),
      noise = (seed / 4294967296) * 2 - 1,
      freq = blast
        ? 65
        : id === "grenadier-prime"
          ? 1240
          : id === "grenadier-pin"
            ? 820
            : id === "grenadier-contact"
              ? 360
              : 180;
    samples[i] =
      (Math.sin(2 * Math.PI * (freq * t + (blast ? -70 : 160) * t * t)) *
        (blast ? 0.28 : 0.22) +
        noise * (blast ? 0.22 : 0.09)) *
      attack *
      fade *
      fade;
  }
  return samples;
}
export function playGrenadierSound(
  context: AudioContext,
  id: GrenadierSound,
  volume: number,
  ended: () => void,
) {
  const samples = grenadierSamples(context.sampleRate, id),
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.08;
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
