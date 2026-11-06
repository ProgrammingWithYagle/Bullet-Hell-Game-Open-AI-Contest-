export const bellSoundSpecs = {
  "bell-toll": {
    frequency: 196,
    duration: 0.75,
    ratios: [1, 2.37, 4.13],
    levels: [0.1, 0.055, 0.025],
  },
  "bell-answer": {
    frequency: 293.66,
    duration: 0.65,
    ratios: [1, 2.37, 4.13],
    levels: [0.085, 0.05, 0.022],
  },
  "bell-clapper": {
    frequency: 98,
    duration: 0.45,
    ratios: [1, 3.17, 5.43],
    levels: [0.11, 0.055, 0.02],
  },
} as const;
export function isBellSound(id: string): id is keyof typeof bellSoundSpecs {
  return Object.hasOwn(bellSoundSpecs, id);
}
/** Bounded three-partial metallic cues. Uses the existing effects volume and audio gate. */
export function playBellSound(
  context: AudioContext,
  id: keyof typeof bellSoundSpecs,
  volume: number,
  ended: () => void,
) {
  const spec = bellSoundSpecs[id],
    now = context.currentTime;
  let remaining = spec.ratios.length;
  spec.ratios.forEach((ratio, i) => {
    const tone = context.createOscillator(),
      gain = context.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(spec.frequency * ratio, now);
    tone.frequency.exponentialRampToValueAtTime(
      spec.frequency * ratio * 0.985,
      now + spec.duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume * spec.levels[i]),
      now + 0.005,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    tone.connect(gain).connect(context.destination);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
      if (--remaining === 0) ended();
    };
    tone.start(now);
    tone.stop(now + spec.duration + 0.01);
  });
}
