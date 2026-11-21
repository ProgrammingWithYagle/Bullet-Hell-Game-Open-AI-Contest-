/** Original bounded bowstring, wooden stake and cloth-like noise. No sampled voice. */
export const rangerSoundSpecs = {
  "ranger-draw": { duration: 0.13, frequency: 175, end: 140, noise: 0.08 },
  "ranger-release": { duration: 0.11, frequency: 260, end: 75, noise: 0.24 },
  "ranger-stakes": { duration: 0.12, frequency: 105, end: 60, noise: 0.5 },
  "ranger-trip": { duration: 0.13, frequency: 340, end: 110, noise: 0.34 },
  "ranger-survey": { duration: 0.2, frequency: 210, end: 270, noise: 0.07 },
  "ranger-replenish": { duration: 0.18, frequency: 95, end: 70, noise: 0.4 },
} as const;
export function isRangerSound(id: string): id is keyof typeof rangerSoundSpecs {
  return Object.hasOwn(rangerSoundSpecs, id);
}
export function playRangerSound(
  context: AudioContext,
  id: keyof typeof rangerSoundSpecs,
  volume: number,
  ended: () => void,
) {
  const spec = rangerSoundSpecs[id],
    now = context.currentTime,
    buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * spec.duration),
      context.sampleRate,
    ),
    samples = buffer.getChannelData(0);
  let seed = 1719;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / context.sampleRate;
    samples[i] =
      (Math.sin(
        2 *
          Math.PI *
          (spec.frequency * t +
            ((spec.end - spec.frequency) * t * t) / (2 * spec.duration)),
      ) *
        (1 - spec.noise) +
        ((seed / 0x100000000) * 2 - 1) * spec.noise) *
      Math.exp(-t * 30);
  }
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.055;
  source.connect(gain).connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    ended();
  };
  source.start(now);
}
