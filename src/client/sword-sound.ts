/** Original short steel/cloth cues; no character voice or quoted melody. */
export const swordSoundSpecs = {
  'sword-cut': { frequency: 240, duration: 0.12, endRatio: 0.45, levels: [0.04, 0.012] },
  'sword-counter': { frequency: 620, duration: 0.19, endRatio: 0.6, levels: [0.04, 0.014] },
  'sword-parry': { frequency: 1050, duration: 0.16, endRatio: 0.98, levels: [0.035, 0.016] },
  'sword-guard': { frequency: 390, duration: 0.09, endRatio: 0.8, levels: [0.025, 0.01] },
  'sword-measure': { frequency: 196, duration: 0.23, endRatio: 1.35, levels: [0.035, 0.012] },
  'sword-recover': { frequency: 140, duration: 0.14, endRatio: 0.6, levels: [0.02, 0.008] },
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
