// Runtime-sized copies of the same drawn poses. Production art is retained separately.
import library from '../../assets/delivery/survivor-motion-v1/library.json';
export const survivorDelivery = library;
const byId = new Map(library.entries.map((entry) => [entry.id, entry]));
type ClipContract = {
  id: string;
  cellSize: number;
  frames: number;
  fps: number;
  origin: number[];
  displayCell: number;
};

export function deliveredSurvivorClip<T extends ClipContract>(clip: T): T {
  const delivery = byId.get(clip.id);
  if (
    !delivery ||
    delivery.sourceCellSize !== clip.cellSize ||
    delivery.frames !== clip.frames ||
    delivery.fps !== clip.fps ||
    delivery.displayCell !== clip.displayCell ||
    delivery.origin.some((value, index) => value !== clip.origin[index])
  ) {
    throw new Error('Survivor delivery contract mismatch: ' + clip.id);
  }
  return {
    ...clip,
    cellSize: delivery.cellSize,
    atlas: delivery.atlas,
    atlasSha256: delivery.atlasSha256,
  };
}
