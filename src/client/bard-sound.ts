/** Original short reed-like cues, synthesized locally. No samples, speech or music quotation. */
export const bardSoundSpecs = {
  "weapon-concertina": { notes: [293.66], duration: 0.13 },
  "bard-phrase-0": { notes: [293.66], duration: 0.26 },
  "bard-phrase-1": { notes: [349.23], duration: 0.26 },
  "bard-phrase-2": { notes: [440], duration: 0.32 },
  "bard-encore-0": { notes: [293.66, 440], duration: 0.35 },
  "bard-encore-1": { notes: [349.23, 523.25], duration: 0.35 },
  "bard-encore-2": { notes: [440, 587.33], duration: 0.4 },
  "bard-cut": { notes: [587.33], duration: 0.11 },
} as const;
export function isBardSound(id: string): id is keyof typeof bardSoundSpecs {
  return Object.hasOwn(bardSoundSpecs, id);
}
export function playBardSound(
  context: AudioContext,
  id: keyof typeof bardSoundSpecs,
  volume: number,
  ended: () => void,
) {
  const spec = bardSoundSpecs[id],
    now = context.currentTime;
  let remaining = spec.notes.length;
  for (const frequency of spec.notes) {
    const voice = context.createOscillator(),
      gain = context.createGain();
    voice.type = "triangle";
    voice.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(
      Math.max(0.0001, (Math.min(1, volume) * 0.075) / spec.notes.length),
      now + 0.025,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    voice.connect(gain).connect(context.destination);
    voice.onended = () => {
      voice.disconnect();
      gain.disconnect();
      if (--remaining === 0) ended();
    };
    voice.start(now);
    voice.stop(now + spec.duration + 0.015);
  }
}
