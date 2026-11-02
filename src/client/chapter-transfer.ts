import { decodeChapterTransfer, type InspectedChapterCheckpoint } from '../shared/chapter-transfer-format.ts';
import { OFFLINE_BOUNDARY_KEY } from './storage.ts';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function localChapterCandidate(store: Pick<Storage, 'getItem'>): unknown | null {
  const raw = store.getItem(OFFLINE_BOUNDARY_KEY);
  if (raw === null) return null;
  if (raw.length > 32768) throw Error('invalidChapterTransfer');
  const value = JSON.parse(raw);
  return value?.practiceOnly === true && value?.settings?.mode === 'story' &&
    value?.settings?.storyChapterId === 'one-place-left' ? value : null;
}
/** An isolated worker runs the same complete restore checks used when resuming Solo. */
export function inspectChapterCandidate(value: unknown, signal?: AbortSignal): Promise<InspectedChapterCheckpoint> {
  if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./offline.worker.ts', import.meta.url), {type:'module'});
    let finished = false;
    const finish = (result?: InspectedChapterCheckpoint, error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      error ? reject(error) : resolve(result!);
    };
    const cancel = () => finish(undefined, new DOMException('Cancelled', 'AbortError'));
    const timeout = setTimeout(() => finish(undefined, Error('invalidChapterTransfer')), 10000);
    signal?.addEventListener('abort', cancel, {once:true});
    worker.onmessage = ({data}) => {
      if (data?.type !== 'chapterCheckpointInspection') return;
      if (data.ok === true && data.value?.checkpoint && data.value?.summary)
        finish(data.value);
      else finish(undefined, Error('invalidChapterTransfer'));
    };
    worker.onerror = () => finish(undefined, Error('invalidChapterTransfer'));
    try { worker.postMessage({type:'inspectChapterCheckpoint',value}); }
    catch (error) { finish(undefined, error); }
  });
}
export function inspectChapterTransfer(raw: string, signal?: AbortSignal) {
  return inspectChapterCandidate(decodeChapterTransfer(raw), signal);
}
/** Explicit user selection replaces the single local resume slot, after validation. */
export function installChapterCheckpoint(inspection: InspectedChapterCheckpoint, expectedRaw: string | null, store: Store) {
  if (store.getItem(OFFLINE_BOUNDARY_KEY) !== expectedRaw) throw Error('chapterCheckpointChanged');
  const raw = JSON.stringify(inspection.checkpoint);
  if (raw.length > 32768) throw Error('invalidChapterTransfer');
  store.setItem(OFFLINE_BOUNDARY_KEY, raw);
}
