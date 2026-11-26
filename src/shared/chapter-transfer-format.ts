import type { ClassId } from './protocol.ts';
import type { ChapterStage } from './story-chapter.ts';
export const CHAPTER_TRANSFER_KIND = 'grave-accord-local-chapter-checkpoint';
export const CHAPTER_TRANSFER_LIMIT = 65536;
export type ChapterCheckpointSummary = {
  classId: ClassId;
  name: string;
  difficulty: string;
  chapterId: 'one-place-left';
  stage: ChapterStage;
  completedObjectives: number;
  learned: number;
  proven: number;
  prepared: number;
};
export type InspectedChapterCheckpoint = {
  checkpoint: unknown;
  summary: ChapterCheckpointSummary;
};
/** File framing only. Actual game validation happens in the Solo worker. */
export function decodeChapterTransfer(raw: string): unknown {
  if (typeof raw !== 'string' || raw.length > CHAPTER_TRANSFER_LIMIT)
    throw Error('invalidChapterTransfer');
  const v = JSON.parse(raw);
  if (!v || typeof v !== 'object' || Array.isArray(v) ||
      Object.keys(v).length !== 3 || v.schemaVersion !== 1 ||
      v.kind !== CHAPTER_TRANSFER_KIND || !Object.hasOwn(v, 'checkpoint') ||
      !v.checkpoint || typeof v.checkpoint !== 'object' || Array.isArray(v.checkpoint))
    throw Error('invalidChapterTransfer');
  return v.checkpoint;
}
export function encodeChapterTransfer(inspection: InspectedChapterCheckpoint) {
  const raw = JSON.stringify({
    schemaVersion: 1,
    kind: CHAPTER_TRANSFER_KIND,
    checkpoint: inspection.checkpoint,
  }, null, 2);
  if (raw.length > CHAPTER_TRANSFER_LIMIT) throw Error('invalidChapterTransfer');
  return raw;
}
