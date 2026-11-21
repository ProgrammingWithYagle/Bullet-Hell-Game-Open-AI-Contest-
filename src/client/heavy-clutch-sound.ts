export const heavyClutchDurations = {
  "heavy-clutch-lift": 0.064,
  "heavy-clutch-engage": 0.082,
} as const;
export type HeavyClutchSound = keyof typeof heavyClutchDurations;
export const isHeavyClutchSound = (id: string): id is HeavyClutchSound =>
  Object.hasOwn(heavyClutchDurations, id);
export function heavyClutchSample(id: HeavyClutchSound, time: number) {
  const duration = heavyClutchDurations[id];
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase);
  const tone =
    id === "heavy-clutch-lift"
      ? 0.65 * Math.sin(2 * Math.PI * (880 * time - 900 * time * time)) +
        0.25 * Math.sin(2 * Math.PI * 1530 * time) * Math.exp(-55 * time)
      : 0.55 * Math.sin(2 * Math.PI * 460 * time) +
        0.35 *
          Math.sin(2 * Math.PI * 1120 * time) *
          Math.exp(-(((time - 0.046) / 0.012) ** 2));
  return Math.max(-0.28, Math.min(0.28, tone * envelope * 0.34));
}
export function playHeavyClutchSound(
  context: AudioContext,
  id: HeavyClutchSound,
  volume: number,
  done: () => void,
) {
  const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * heavyClutchDurations[id]),
      context.sampleRate,
    ),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = heavyClutchSample(id, i / context.sampleRate);
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1, volume));
  source.connect(gain);
  gain.connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    done();
  };
  source.start();
}
