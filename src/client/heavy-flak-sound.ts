export const heavyFlakDurations = {
  "heavy-flak-shot": 0.12,
  "heavy-flak-command": 0.065,
  "heavy-flak-arrest": 0.09,
  "heavy-flak-burst": 0.17,
} as const;
export type HeavyFlakSound = keyof typeof heavyFlakDurations;
export const isHeavyFlakSound = (id: string): id is HeavyFlakSound =>
  Object.hasOwn(heavyFlakDurations, id);
export function heavyFlakSample(id: HeavyFlakSound, time: number) {
  const duration = heavyFlakDurations[id];
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase);
  const tone =
    id === "heavy-flak-arrest"
      ? 0.65 *
          Math.sin(2 * Math.PI * 570 * time) *
          Math.exp(-(((time - 0.021) / 0.012) ** 2)) +
        0.4 *
          Math.sin(2 * Math.PI * 920 * time) *
          Math.exp(-(((time - 0.058) / 0.008) ** 2))
      : id === "heavy-flak-command"
        ? Math.sin(2 * Math.PI * 1350 * time) *
            Math.exp(-(((time - 0.014) / 0.009) ** 2)) +
          0.55 *
            Math.sin(2 * Math.PI * 1850 * time) *
            Math.exp(-(((time - 0.042) / 0.007) ** 2))
        : id === "heavy-flak-shot"
          ? Math.sin(2 * Math.PI * (135 * time - 185 * time * time)) +
            0.23 * Math.sin(2 * Math.PI * 1100 * time) * Math.exp(-45 * time)
          : 0.55 * Math.sin(2 * Math.PI * (260 * time - 220 * time * time)) +
            0.35 *
              Math.sin(
                2 * Math.PI * 3100 * time +
                  1.2 * Math.sin(2 * Math.PI * 470 * time),
              );
  return Math.max(-0.45, Math.min(0.45, tone * envelope * 0.4));
}
export function playHeavyFlakSound(
  context: AudioContext,
  id: HeavyFlakSound,
  volume: number,
  done: () => void,
) {
  const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * heavyFlakDurations[id]),
      context.sampleRate,
    ),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = heavyFlakSample(id, i / context.sampleRate);
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
