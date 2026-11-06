/** Original quiet wood/glass calls. No sampled character voice or borrowed melody. */
export const summonerSoundSpecs = {
  "summoner-beacon": { tones: [392, 1176], duration: 0.11, endRatio: 0.85 },
  "summoner-call": { tones: [294, 441], duration: 0.24, endRatio: 1.12 },
  "summoner-gather": { tones: [330, 495], duration: 0.22, endRatio: 0.78 },
  "summoner-muster": { tones: [196, 588], duration: 0.32, endRatio: 1.2 },
  "summoner-rebind": { tones: [160, 480], duration: 0.12, endRatio: 0.7 },
} as const;
export function isSummonerSound(
  id: string,
): id is keyof typeof summonerSoundSpecs {
  return Object.hasOwn(summonerSoundSpecs, id);
}
export function playSummonerSound(
  context: AudioContext,
  id: keyof typeof summonerSoundSpecs,
  volume: number,
  ended: () => void,
) {
  const spec = summonerSoundSpecs[id],
    now = context.currentTime;
  let voices = spec.tones.length;
  for (const [i, frequency] of spec.tones.entries()) {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = i ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * spec.endRatio,
      now + spec.duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(
      Math.max(0.0001, Math.min(1, volume) * (i ? 0.009 : 0.028)),
      now + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (--voices === 0) ended();
    };
    oscillator.start(now);
    oscillator.stop(now + spec.duration + 0.015);
  }
}
