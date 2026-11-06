export type SniperSound = "sniper-settle" | "sniper-shot" | "sniper-clear";
export const isSniperSound = (id: string): id is SniperSound =>
  id === "sniper-settle" || id === "sniper-shot" || id === "sniper-clear";
export function sniperSample(id: SniperSound, time: number) {
  const duration =
    id === "sniper-clear" ? 0.11 : id === "sniper-shot" ? 0.16 : 0.09;
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase),
    tone =
      id === "sniper-clear"
        ? Math.sin(2 * Math.PI * 420 * time) * 0.35
        : id === "sniper-shot"
          ? Math.sin(2 * Math.PI * (145 * time - 210 * time * time)) +
            0.2 * Math.sin(2 * Math.PI * 1900 * time)
          : Math.sin(2 * Math.PI * 750 * time) * 0.4;
  return Math.max(-1, Math.min(1, tone * envelope * 0.4));
}
export function playSniperSound(
  context: AudioContext,
  id: SniperSound,
  volume: number,
  done: () => void,
) {
  const duration =
      id === "sniper-clear" ? 0.11 : id === "sniper-shot" ? 0.16 : 0.09,
    buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate,
    ),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = sniperSample(id, i / context.sampleRate);
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
