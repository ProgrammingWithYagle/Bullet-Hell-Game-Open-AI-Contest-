export const heavyPostDuration = 0.096;
export const isHeavyPostSound = (id: string): id is 'heavy-traverse-post' => id === 'heavy-traverse-post';
/** A finite clamp cue for an admitted post; it never announces a future shot. */
export function heavyPostSample(time: number) {
  if (time <= 0 || time >= heavyPostDuration) return 0;
  const phase = time / heavyPostDuration, envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase);
  const clamp = 0.62 * Math.sin(2 * Math.PI * 340 * time) * Math.exp(-18 * time);
  const latch = 0.28 * Math.sin(2 * Math.PI * 1460 * time) * Math.exp(-(((time - 0.052) / 0.012) ** 2));
  return Math.max(-0.28, Math.min(0.28, (clamp + latch) * envelope * 0.36));
}
export function playHeavyPostSound(context: AudioContext, id: 'heavy-traverse-post', volume: number, done: () => void) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * heavyPostDuration), context.sampleRate), channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = heavyPostSample(i / context.sampleRate);
  const source = context.createBufferSource(), gain = context.createGain();
  source.buffer = buffer; gain.gain.value = Math.max(0, Math.min(1, volume));
  source.connect(gain); gain.connect(context.destination);
  source.onended = () => { source.disconnect(); gain.disconnect(); done(); };
  source.start();
}
