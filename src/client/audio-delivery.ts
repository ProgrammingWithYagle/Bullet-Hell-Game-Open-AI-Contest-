export type DecodedMusic = { length: number; sampleRate: number };
export function validMusicDuration(buffer: DecodedMusic, frames: number, rate: number) {
  return (
    Number.isSafeInteger(buffer.length) &&
    buffer.length > 0 &&
    Number.isFinite(buffer.sampleRate) &&
    buffer.sampleRate > 0 &&
    Number.isSafeInteger(frames) &&
    frames > 0 &&
    Number.isFinite(rate) &&
    rate > 0 &&
    Math.abs(buffer.length / buffer.sampleRate - frames / rate) <= 2 / buffer.sampleRate
  );
}
export async function chooseMusicBuffer<T extends DecodedMusic>(
  pair: { compressed: string; master: string; frames: number; rate: number },
  load: (url: string) => Promise<T>,
  failed: Set<string>,
  invalidate: (url: string) => void,
) {
  for (const url of [pair.compressed, pair.master]) {
    if (url === pair.compressed && failed.has(url)) continue;
    try {
      const buffer = await load(url);
      if (validMusicDuration(buffer, pair.frames, pair.rate)) return { url, buffer };
    } catch {}
    invalidate(url);
    if (url === pair.compressed) failed.add(url);
  }
  throw Error('Audio unavailable');
}
