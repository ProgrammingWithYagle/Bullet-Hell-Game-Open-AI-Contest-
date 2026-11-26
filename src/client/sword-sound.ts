/** Original short steel/cloth cues; no character voice or quoted melody. */
export const swordSoundSpecs = {
  'sword-cut': { frequency: 240, duration: 0.12, endRatio: 0.45, levels: [0.04, 0.012] },
  'sword-counter': { frequency: 620, duration: 0.19, endRatio: 0.6, levels: [0.04, 0.014] },
  'sword-parry': { frequency: 1050, duration: 0.16, endRatio: 0.98, levels: [0.035, 0.016] },
  'sword-guard': { frequency: 390, duration: 0.09, endRatio: 0.8, levels: [0.025, 0.01] },
  'sword-measure': { frequency: 196, duration: 0.23, endRatio: 1.35, levels: [0.035, 0.012] },
  'sword-recover': { frequency: 140, duration: 0.14, endRatio: 0.6, levels: [0.02, 0.008] },
  'sword-held-edge-set': { frequency: 164, duration: 0.12, endRatio: 0.72, levels: [0.031, 0.009] },
  'sword-held-edge-turn': { frequency: 232, duration: 0.104, endRatio: 0.86, levels: [0.028, 0.012] },
  'sword-held-edge-cut': { frequency: 308, duration: 0.16, endRatio: 0.49, levels: [0.044, 0.016] },
  'sword-held-edge-follow': { frequency: 405, duration: 0.086, endRatio: 1.16, levels: [0.018, 0.009] },
  'sword-held-edge-second': { frequency: 355, duration: 0.12, endRatio: 0.63, levels: [0.031, 0.013] },
  'sword-drawn-reply-guard': { frequency: 202, duration: 0.102, endRatio: 0.69, levels: [0.025, 0.011] },
  'sword-drawn-reply-catch': { frequency: 721, duration: 0.142, endRatio: 0.91, levels: [0.037, 0.014] },
  'sword-drawn-reply-cut': { frequency: 278, duration: 0.155, endRatio: 0.49, levels: [0.041, 0.015] },
  'sword-drawn-reply-needle': { frequency: 535, duration: 0.091, endRatio: 1.13, levels: [0.027, 0.009] },
  'sword-drawn-reply-back': { frequency: 240, duration: 0.173, endRatio: 0.55, levels: [0.038, 0.013] },
  'sword-pursuit-passing': { frequency: 338, duration: 0.144, endRatio: 0.59, levels: [0.036, 0.013] },
  'sword-pursuit-through': { frequency: 407, duration: 0.119, endRatio: 0.47, levels: [0.034, 0.009] },
  'sword-pursuit-cross': { frequency: 263, duration: 0.167, endRatio: 0.72, levels: [0.039, 0.014] },
  'sword-pursuit-open-through': { frequency: 649, duration: 0.096, endRatio: 1.13, levels: [0.021, 0.009] },
  'sword-pursuit-open-cross': { frequency: 524, duration: 0.107, endRatio: 1.15, levels: [0.023, 0.009] },
} as const;
export function isSwordSound(id: string): id is keyof typeof swordSoundSpecs {
  return Object.hasOwn(swordSoundSpecs, id);
}
export function playSwordSound(
  context: AudioContext,
  id: keyof typeof swordSoundSpecs,
  volume: number,
  ended: () => void,
) {
  const s = swordSoundSpecs[id],
    now = context.currentTime;
  let remaining = 2;
  for (let i = 0; i < 2; i++) {
    const voice = context.createOscillator(),
      gain = context.createGain(),
      frequency = s.frequency * (i ? 2.71 : 1);
    voice.type = i ? 'sine' : 'triangle';
    voice.frequency.setValueAtTime(frequency, now);
    voice.frequency.exponentialRampToValueAtTime(frequency * s.endRatio, now + s.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(
      Math.max(0.0001, Math.min(1, volume) * s.levels[i]),
      now + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + s.duration);
    voice.connect(gain).connect(context.destination);
    voice.onended = () => {
      voice.disconnect();
      gain.disconnect();
      if (--remaining === 0) ended();
    };
    voice.start(now);
    voice.stop(now + s.duration + 0.015);
  }
}
