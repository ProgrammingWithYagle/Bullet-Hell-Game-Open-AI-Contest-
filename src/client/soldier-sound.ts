/** Original dry footwork: two finite, quiet cloth/boot transients. */
export const isSoldierSound = (id: string): id is "soldier-footwork" =>
  id === "soldier-footwork";
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
  _id: "soldier-footwork",
  volume: number,
  ended: () => void,
) {
  const samples = soldierSamples(context.sampleRate),
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
