export const heavyTraverseDurations = {
  "heavy-traverse-shot": 0.115,
  "heavy-traverse-release": 0.07,
} as const;
export type HeavyTraverseSound = keyof typeof heavyTraverseDurations;
export const isHeavyTraverseSound = (id: string): id is HeavyTraverseSound =>
  Object.hasOwn(heavyTraverseDurations, id);
export function heavyTraverseSample(id: HeavyTraverseSound, time: number) {
  const duration = heavyTraverseDurations[id];
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase);
  const tone =
    id === "heavy-traverse-shot"
      ? 0.7 * Math.sin(2 * Math.PI * (112 * time - 120 * time * time)) +
        0.23 * Math.sin(2 * Math.PI * 1760 * time) * Math.exp(-55 * time)
      : 0.55 * Math.sin(2 * Math.PI * 780 * time) * Math.exp(-32 * time) +
        0.35 *
          Math.sin(2 * Math.PI * 1190 * time) *
          Math.exp(-(((time - 0.038) / 0.01) ** 2));
  return Math.max(-0.4, Math.min(0.4, tone * envelope * 0.38));
}
export function playHeavyTraverseSound(
  context: AudioContext,
  id: HeavyTraverseSound,
  volume: number,
  done: () => void,
) {
  const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * heavyTraverseDurations[id]),
      context.sampleRate,
    ),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = heavyTraverseSample(id, i / context.sampleRate);
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
