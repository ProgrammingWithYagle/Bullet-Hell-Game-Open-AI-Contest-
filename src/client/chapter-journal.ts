import type { View } from '../shared/view.ts';
import {
  validStoryChapter,
  chapterParticipation,
  type StoryChapterState,
} from '../shared/story-chapter.ts';
import { validStoryTraining, type StoryTrainingState } from '../shared/story-training.ts';
import { CONTENT_REVISION, implementedClassIds, type ClassId } from '../shared/protocol.ts';
export const CHAPTER_JOURNAL_KEY = 'ga-story-chapters-v1';
export type ChapterRecord = {
  runId: string;
  playerId: string;
  classId: ClassId;
  difficulty: string;
  source: 'offline' | 'room';
  contentRevision: string;
  chapter: StoryChapterState;
  training: StoryTrainingState;
};
type Journal = { schemaVersion: 1; records: ChapterRecord[] };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const identifier = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);
function validRecord(value: unknown): value is ChapterRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as ChapterRecord;
  if (
    Object.keys(r).length !== 8 ||
    !identifier(r.runId, 100) ||
    !identifier(r.playerId, 64) ||
    !implementedClassIds.includes(r.classId) ||
    !['baby', 'easy', 'normal', 'hard', 'insane', 'hellish'].includes(r.difficulty) ||
    !['offline', 'room'].includes(r.source) ||
    !/^[a-f0-9]{64}$/.test(r.contentRevision) ||
    !validStoryChapter(r.chapter) ||
    r.chapter.stage === 'combat' ||
    !validStoryTraining(r.training, r.classId)
  )
    return false;
  if (
    Object.keys(r.chapter.participation).some((id) => id !== r.playerId) ||
    (r.training.proofs.length > 0 &&
      !chapterParticipation(r.chapter, r.playerId).includes('street-clearance')) ||
    (r.chapter.completedNodes.length === 0 && r.training.learned.length > 0)
  )
    return false;
  return true;
}
function decode(raw: string): Journal {
  if (raw.length > 300000) throw Error('invalidChapterJournal');
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.records) ||
    value.records.length > 128 ||
    !value.records.every(validRecord) ||
    new Set(value.records.map((r: ChapterRecord) => r.runId + ':' + r.playerId)).size !==
      value.records.length
  )
    throw Error('invalidChapterJournal');
  return value;
}
export function chapterJournal(store: Pick<Storage, 'getItem'>): Journal {
  const raw = store.getItem(CHAPTER_JOURNAL_KEY);
  return raw === null ? { schemaVersion: 1, records: [] } : decode(raw);
}
export function recordChapterView(view: View, playerId: string, store: Store, online = false) {
  if (!view.chapter || view.phase === 'combat') return;
  const p = view.players.find((p) => p.id === playerId);
  if (!p?.training) return;
  const journal = chapterJournal(store),
    kept = journal.records.filter((r) => r.runId !== view.run.id || r.playerId !== playerId);
  if (!view.run.testingModified) {
    const chapter = structuredClone(view.chapter);
    chapter.participation = Object.hasOwn(chapter.participation, playerId)
      ? { [playerId]: chapter.participation[playerId] }
      : {};
    const record: ChapterRecord = {
      runId: view.run.id,
      playerId,
      classId: p.classId,
      difficulty: view.run.difficulty,
      source: online ? 'room' : 'offline',
      contentRevision: CONTENT_REVISION,
      chapter,
      training: structuredClone(p.training),
    };
    if (!validRecord(record)) throw Error('invalidChapterJournal');
    kept.push(record);
  }
  const raw = JSON.stringify({ schemaVersion: 1, records: kept.slice(-128) });
  decode(raw);
  store.setItem(CHAPTER_JOURNAL_KEY, raw);
}
export function exportChapterJournal(store: Pick<Storage, 'getItem'>) {
  return JSON.stringify(chapterJournal(store), null, 2);
}
/** Local display/history only. No imported field is sent to the authority as a proof. */
export function importChapterJournal(raw: string, store: Store) {
  const incoming = decode(raw),
    current = chapterJournal(store);
  const records = new Map(current.records.map((r) => [r.runId + ':' + r.playerId, r]));
  for (const r of incoming.records) {
    const key = r.runId + ':' + r.playerId,
      old = records.get(key);
    if (
      !old ||
      r.chapter.completedNodes.length > old.chapter.completedNodes.length ||
      (r.chapter.completedNodes.length === old.chapter.completedNodes.length &&
        ((r.chapter.stage === 'complete' && old.chapter.stage !== 'complete') ||
          (old.chapter.stage !== 'complete' &&
            (r.training.proofs.length > old.training.proofs.length ||
              r.training.prepared.length > old.training.prepared.length ||
              r.training.learned.length > old.training.learned.length))))
    )
      records.set(key, r);
  }
  const merged = JSON.stringify({ schemaVersion: 1, records: [...records.values()].slice(-128) });
  decode(merged);
  store.setItem(CHAPTER_JOURNAL_KEY, merged);
}
