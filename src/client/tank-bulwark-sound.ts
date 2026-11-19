export const bulwarkSoundIds = [
  'tank-wall-lift',
  'tank-wall-set',
  'tank-wall-pivot',
  'tank-wall-port-open',
  'tank-wall-port-close',
] as const;
export type BulwarkSoundId = (typeof bulwarkSoundIds)[number];
export const isTankBulwarkSound = (id: string): id is BulwarkSoundId =>
  (bulwarkSoundIds as readonly string[]).includes(id);
export const bastionSoundIds = ['tank-gate-plant', 'tank-gate-claim', 'tank-gate-adjust'] as const;
type BastionSoundId = (typeof bastionSoundIds)[number];
export const isTankBastionSound = (id: string): id is BastionSoundId =>
  (bastionSoundIds as readonly string[]).includes(id);
type TankGuardSoundId = BulwarkSoundId | BastionSoundId;
const pitches: Record<TankGuardSoundId, number> = {
  'tank-wall-lift': 170,
  'tank-wall-set': 110,
  'tank-wall-pivot': 260,
  'tank-wall-port-open': 470,
  'tank-wall-port-close': 330,
  'tank-gate-plant': 153,
  'tank-gate-claim': 525,
  'tank-gate-adjust': 294,
};
const durations: Record<TankGuardSoundId, number> = {
  'tank-wall-lift': 0.14,
  'tank-wall-set': 0.1,
  'tank-wall-pivot': 0.19,
  'tank-wall-port-open': 0.085,
  'tank-wall-port-close': 0.075,
  'tank-gate-plant': 0.18,
  'tank-gate-claim': 0.125,
  'tank-gate-adjust': 0.14,
};
export const tankBulwarkDuration = (id: TankGuardSoundId) => durations[id];
/** Finite mechanical cues; objective sample checks are separate from listening acceptance. */
export function tankBulwarkSample(id: TankGuardSoundId, time: number) {
  const duration = durations[id];
  if (time <= 0 || time >= duration) return 0;
  const phase = time / duration,
    envelope = Math.sin(Math.PI * phase) ** 2 * (1 - phase),
    pitch = pitches[id],
    fall = id === 'tank-wall-lift' ? 1 + phase * 0.35 : 1 - phase * 0.3;
  return (
    envelope *
    (Math.sin(2 * Math.PI * pitch * fall * time) * 0.22 +
      Math.sin(2 * Math.PI * (pitch * 2.73) * time) * 0.065 +
      Math.sin(2 * Math.PI * (pitch * 7.19) * time) * 0.025)
  );
}
export function playTankBulwarkSound(
  context: AudioContext,
  id: TankGuardSoundId,
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
    channel[i] = tankBulwarkSample(id, i / context.sampleRate);
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
