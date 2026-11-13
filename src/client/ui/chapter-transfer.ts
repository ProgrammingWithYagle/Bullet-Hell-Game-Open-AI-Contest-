import { t, number, locale } from '../i18n.ts';
import { chapterTransferText } from '../chapter-transfer-text.ts';
import { localChapterCandidate, inspectChapterCandidate, installChapterCheckpoint } from '../chapter-transfer.ts';
import { decodeChapterTransfer, encodeChapterTransfer, CHAPTER_TRANSFER_LIMIT, type InspectedChapterCheckpoint } from '../../shared/chapter-transfer-format.ts';
import { OFFLINE_BOUNDARY_KEY } from '../storage.ts';
import { escape as e } from './html.ts';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
type Inspect = typeof inspectChapterCandidate;
export function chapterTransferMarkup() {
  const copy = chapterTransferText(locale);
  return `<section class="chapter-checkpoint" data-chapter-checkpoint lang="${e(locale)}" dir="${['ar','ur'].includes(locale)?'rtl':'ltr'}"><h2>${e(copy.title)}</h2><p>${e(copy.help)}</p><p data-checkpoint-current></p><div class="actions"><button data-checkpoint-resume>${e(copy.resume)}</button><button data-checkpoint-export>${e(copy.export)}</button><label>${e(copy.choose)}<input type="file" data-checkpoint-import accept="application/json,.json"></label></div><div data-checkpoint-preview hidden></div><div class="actions" data-checkpoint-file-actions hidden><button data-checkpoint-use class="primary">${e(copy.use)}</button><button data-checkpoint-cancel>${e(copy.cancel)}</button></div><p data-checkpoint-status role="status" aria-live="polite"></p><small>${e(copy.local)}</small></section>`;
}
export function bindChapterTransfer(
  host: HTMLElement, resume?: () => void, store: Store = localStorage,
  inspect: typeof inspectChapterCandidate = inspectChapterCandidate,
) {
  const root = host.querySelector<HTMLElement>('[data-chapter-checkpoint]')!;
  const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const importer = q<HTMLInputElement>('[data-checkpoint-import]');
  const exporter = q<HTMLButtonElement>('[data-checkpoint-export]');
  const resumer = q<HTMLButtonElement>('[data-checkpoint-resume]');
  const use = q<HTMLButtonElement>('[data-checkpoint-use]');
  const preview = q<HTMLElement>('[data-checkpoint-preview]');
  const actions = q<HTMLElement>('[data-checkpoint-file-actions]');
  const status = q<HTMLElement>('[data-checkpoint-status]');
  let alive = true, serial = 0, controller: AbortController | undefined;
  let pending: InspectedChapterCheckpoint | undefined, expectedRaw: string | null = null;
  let hasCurrent = false;
  const copy = () => chapterTransferText(locale);
  const clearPreview = () => {
    pending = undefined;preview.innerHTML = '';preview.hidden = actions.hidden = true;
  };
  const refresh = () => {
    try {
      hasCurrent = localChapterCandidate(store) !== null;
      q('[data-checkpoint-current]').textContent = hasCurrent ? copy().saved : copy().empty;
    } catch {
      hasCurrent = false;q('[data-checkpoint-current]').textContent = copy().invalid;
    }
    exporter.disabled = !hasCurrent;resumer.disabled = !hasCurrent || !resume;
    use.disabled = !pending || !resume;
    actions.hidden = !pending;
  };
  const cancel = () => {
    serial++;controller?.abort();controller = undefined;clearPreview();
    importer.value = '';status.textContent = '';refresh();
  };
  const begin = () => {
    cancel();const generation = serial;controller = new AbortController();
    exporter.disabled = resumer.disabled = use.disabled = true;status.textContent = copy().checking;
    actions.hidden = false;
    return {signal:controller.signal,current:()=>alive&&root.isConnected&&serial===generation};
  };
  const describe = (value: InspectedChapterCheckpoint) => {
    const s = value.summary, text = copy();
    const format = (message: string, values: Record<string,string>) =>
      message.replace(/\{([A-Za-z]+)\}/g, (whole,key) => values[key] ?? whole);
    return `<p>${e(format(text.summary,{name:s.name,class:t('class.'+s.classId+'.name'),objectives:number(s.completedObjectives)}))}</p><p>${e(format(text.training,{learned:number(s.learned),proofs:number(s.proven),prepared:number(s.prepared)}))}</p><p>${e(text.replace)}</p>`;
  };
  exporter.onclick = async () => {
    if (!alive || exporter.disabled) return;
    const op = begin();
    try {
      const value = localChapterCandidate(store);if (!value) throw Error('invalidChapterTransfer');
      const result = await inspect(value,op.signal);if (!op.current()) return;
      const url = URL.createObjectURL(new Blob([encodeChapterTransfer(result)],{type:'application/json'}));
      try {
        const link = document.createElement('a');link.href = url;
        link.download = 'grave-accord-chapter-checkpoint.json';link.click();
      } finally { setTimeout(()=>URL.revokeObjectURL(url),0); }
      status.textContent = copy().exported;
    } catch { if (op.current()) status.textContent = copy().invalid; }
    finally { if (op.current()) refresh(); }
  };
  resumer.onclick = async () => {
    if (!alive || resumer.disabled || !resume) return;
    const op = begin();
    try {
      const before = store.getItem(OFFLINE_BOUNDARY_KEY), candidate = localChapterCandidate(store);
      if (!candidate) throw Error('invalidChapterTransfer');
      await inspect(candidate,op.signal);if (!op.current()) return;
      if (store.getItem(OFFLINE_BOUNDARY_KEY)!==before) {status.textContent=copy().changed;return;}
      resume();
    } catch { if (op.current()) status.textContent=copy().invalid; }
    finally { if(op.current())refresh(); }
  };
  importer.onchange = async () => {
    const file = importer.files?.[0];if (!alive || !file) return;
    const op = begin();
    try {
      expectedRaw = store.getItem(OFFLINE_BOUNDARY_KEY);
      if (file.size > CHAPTER_TRANSFER_LIMIT) throw Error('invalidChapterTransfer');
      const raw = await file.text();if (!op.current()) return;
      const result = await inspect(decodeChapterTransfer(raw),op.signal);if (!op.current()) return;
      pending = result;preview.innerHTML = describe(result);preview.hidden = actions.hidden = false;
      status.textContent = '';
    } catch { if (op.current()) status.textContent = copy().invalid; }
    finally { if (op.current()) {importer.value = '';refresh();} }
  };
  use.onclick = () => {
    if (!alive || !root.isConnected || use.disabled || !resume || !pending) return;
    try { installChapterCheckpoint(pending,expectedRaw,store); }
    catch (error) {
      status.textContent = error instanceof Error&&error.message==='chapterCheckpointChanged'?copy().changed:copy().storage;
      clearPreview();refresh();return;
    }
    pending = undefined;use.disabled = true;resume();
  };
  q<HTMLButtonElement>('[data-checkpoint-cancel]').onclick=()=>{if(alive)cancel();};
  refresh();
  return () => {alive=false;serial++;controller?.abort();};
}
