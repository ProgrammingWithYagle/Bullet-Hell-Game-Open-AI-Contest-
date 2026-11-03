/** Original, quiet mechanical cues. One bounded mono voice per event; no sampled music or voice. */
export const engineerSoundSpecs = {
  "engineer-order": {
    duration: 0.1,
    frequency: 220,
    end: 160,
    noise: 0.15,
    gain: 0.035,
  },
  "engineer-charge": {
    duration: 0.32,
    frequency: 180,
    end: 490,
    noise: 0.04,
    gain: 0.055,
  },
  "engineer-rail": {
    duration: 0.22,
    frequency: 320,
    end: 55,
    noise: 0.22,
    gain: 0.075,
  },
  "engineer-collapse": {
    duration: 0.38,
    frequency: 90,
    end: 35,
    noise: 0.35,
    gain: 0.08,
  },
  "engineer-salvage": {
    duration: 0.24,
    frequency: 130,
    end: 85,
    noise: 0.5,
    gain: 0.055,
  },
} as const;
export type EngineerSound = keyof typeof engineerSoundSpecs;
export const isEngineerSound = (id: string): id is EngineerSound =>
  Object.hasOwn(engineerSoundSpecs, id);
export function engineerSamples(id: EngineerSound, rate: number) {
  if (!Number.isFinite(rate) || rate < 8000 || rate > 192000)
    throw Error("Invalid audio rate");
  const spec = engineerSoundSpecs[id],
    samples = new Float32Array(Math.ceil(rate * spec.duration));
  let seed = 7703;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate,
      u = t / spec.duration,
      phase =
        2 *
        Math.PI *
        (spec.frequency * t +
          ((spec.end - spec.frequency) * t * t) / (2 * spec.duration));
    const tone =
      (Math.sin(phase) * 0.7 +
        Math.sin(phase * 2.01) * 0.2 +
        Math.sin(phase * 3.97) * 0.1) *
        (1 - spec.noise) +
      ((seed / 0x100000000) * 2 - 1) * spec.noise;
    samples[i] =
      tone * (1 - Math.exp(-t * 160)) * Math.pow(Math.max(0, 1 - u), 2);
  }
  return samples;
}
export function playEngineerSound(
  context: AudioContext,
  id: EngineerSound,
  volume: number,
  ended: () => void,
) {
  const samples = engineerSamples(id, context.sampleRate),
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value =
    Math.max(0, Math.min(1, volume)) * engineerSoundSpecs[id].gain;
  source.connect(gain).connect(context.destination);
  let released = false;
  source.onended = () => {
    if (released) return;
    released = true;
    source.disconnect();
    gain.disconnect();
    ended();
  };
  source.start(context.currentTime);
}
