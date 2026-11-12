export const lineworkSoundIds = [
  'linework-shot',
  'linework-anchor',
  'linework-engage',
  'linework-brake',
  'linework-release',
] as const;
export type LineworkSoundId = (typeof lineworkSoundIds)[number];
export const isHeavyLineworkSound = (id: string): id is LineworkSoundId =>
  (lineworkSoundIds as readonly string[]).includes(id);
const durations: Record<LineworkSoundId, number> = {
  'linework-shot': 0.13,
  'linework-anchor': 0.11,
  'linework-engage': 0.16,
  'linework-brake': 0.1,
  'linework-release': 0.085,
};
export const heavyLineworkDuration = (id: LineworkSoundId) => durations[id];
/** Finite mechanical cues; objective sample checks are separate from listening acceptance. */
export function heavyLineworkSample(id: LineworkSoundId, time: number) {
  const duration = durations[id];
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase),
    pitch =
      id === 'linework-shot'
        ? 145
        : id === 'linework-anchor'
          ? 730
          : id === 'linework-engage'
            ? 190
            : id === 'linework-brake'
              ? 320
              : 510,
    fall = id === 'linework-engage' ? 1 + phase * 0.35 : 1 - phase * 0.3;
  return (
    envelope *
    (Math.sin(2 * Math.PI * pitch * fall * time) * 0.22 +
      Math.sin(2 * Math.PI * (pitch * 2.73) * time) * 0.065 +
      Math.sin(2 * Math.PI * (pitch * 7.19) * time) * 0.025)
  );
}
export function playHeavyLineworkSound(
  context: AudioContext,
  id: LineworkSoundId,
  volume: number,
  done: () => void,
) {
  const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * durations[id]),
      context.sampleRate,
    ),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = heavyLineworkSample(id, i / context.sampleRate);
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
