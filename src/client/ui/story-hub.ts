import { storyBook, storyDirection } from '../story-book.ts';
import { type SceneSpec, storyScene, storyStructure } from '../story-scenes.ts';
import { storyProgress } from '../story-progress.ts';
import { loadProfile } from '../profile.ts';
import { t, number, locale } from '../i18n.ts';
import { storyReaderMarkup, bindStoryReaders } from './story-reader.ts';
import { escape as e } from './html.ts';
import { chapterText } from '../chapter-text.ts';
import { chapterJournal, exportChapterJournal, importChapterJournal } from '../chapter-journal.ts';
import catalog from '../../../content/catalog.json';
import { chapterParticipation } from '../../shared/story-chapter.ts';
function earnedChapterScenes() {
  const scenes = new Set<number>();
  try {
    for (const record of chapterJournal(localStorage).records) {
      const own = chapterParticipation(record.chapter, record.playerId);
      if (own.includes('gate-constable')) scenes.add(-1);
      if (record.chapter.route !== null && record.training.learned.length)
        scenes.add(record.chapter.route);
      if (own.includes('street-clearance')) scenes.add(3);
      if (own.includes('ward-matron')) scenes.add(4);
    }
  } catch {}
  return scenes;
}
function chapterJournalMarkup() {
  const copy = chapterText(locale);
  let records = '';
  try {
    records = chapterJournal(localStorage)
      .records.slice()
      .reverse()
      .slice(0, 12)
      .map(
        (r) =>
          `<li><bdi>${e(catalog.classes.find((c) => c.id === r.classId)!.survivor)}</bdi> · ${number(chapterParticipation(r.chapter, r.playerId).length)} / 3 · ${e(r.chapter.stage === 'complete' && chapterParticipation(r.chapter, r.playerId).length === 3 ? copy.complete : copy.local)} · ${number(r.training.proofs.length)} ${e(copy.proven)}</li>`,
      )
      .join('');
  } catch {
    records = `<li role="alert">${e(copy.unreadable)}</li>`;
  }
  return `<section class="chapter-journal" lang="${copy.language}" dir="ltr"><h2>${e(copy.journal)}</h2><p>${e(copy.journalHelp)}</p><ul>${records || `<li>${e(copy.noRecords)}</li>`}</ul><div class="chapter-archive">${[
    ...earnedChapterScenes(),
  ]
    .sort((a, b) => a - b)
    .map(
      (i) =>
        `<button data-journey-scene="${i}">${e(i === -1 ? 'The First Return' : copy.scenes[i].title)}</button>`,
    )
    .join(
      '',
    )}</div><div class="actions"><button data-chapter-export>${e(copy.export)}</button><label>${e(copy.import)}<input type="file" data-chapter-import accept="application/json,.json"></label></div><p data-chapter-transfer-status role="status"></p></section>`;
}
export function storyHubMarkup() {
  let clears = 0;
  try {
    clears = storyProgress(loadProfile(localStorage)).clears;
  } catch {}
  const book = storyBook(locale),
    copy = chapterText(locale);
  return `<section class="story-hub"><div class="section-heading"><div><p class="eyebrow">${e(t('ui.storyCampaign'))}</p><h1>${e(t('ui.beginCampaign'))}</h1></div><button data-story-home>${e(t('ui.back'))}</button></div><div class="campaign-modes"><article lang="${copy.language}" dir="ltr"><h2>${e(copy.chapterMode)}</h2><h3>${e(copy.title)}</h3><p>${e(copy.intro)}</p><button data-story-begin class="primary">${e(t('ui.start'))}</button></article></div><div class="actions"><button data-story-prologue>${e(t('ui.readPrologue'))}</button></div>${chapterJournalMarkup()}<details class="original-campaign-archive"><summary lang="${copy.language}">${e(copy.classic)} · ${e(t('ui.chapterArchive'))}</summary><h2 lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(book.title)}</h2><div class="story-chapters">${storyStructure.chapters.map((chapter, i) => `<article><span>${e(t('ui.storyChapter', { number: number(i + 1) }))}</span><h3 lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(book.acts[i].title)}</h3><p>${number(chapter.from + 1)}–${number(chapter.to)} · ${e(t('ui.storyScene', { number: number(5) }))}</p><button data-story-chapter="${i}" ${clears < chapter.from ? 'disabled' : ''}>${e(t(clears < chapter.from ? 'ui.laterChapter' : 'ui.readChapter'))}</button><details><summary>${e(t('ui.chapterArchive'))}</summary>${chapter.scenes.map((n) => `<button data-story-scene="${n}" ${clears <= n ? 'disabled' : ''}>${e(t('ui.storyScene', { number: number(n - chapter.from + 1) }))}</button>`).join('')}</details></article>`).join('')}</div></details><div data-story-hub-reader></div></section>`;
}
export function bindStoryHub(
  host: HTMLElement,
  begin: (chapterId?: 'one-place-left') => void,
  back: () => void,
) {
  const ownerDocument = document;
  host.innerHTML = storyHubMarkup();
  let alive = true,
    reader = bindStoryReaders(host);
  host.querySelector<HTMLButtonElement>('[data-story-begin]')!.onclick = () => {
    if (alive) begin('one-place-left');
  };
  host.querySelector<HTMLButtonElement>('[data-chapter-export]')!.onclick = () => {
    if (!alive) return;
    try {
      const url = URL.createObjectURL(
          new Blob([exportChapterJournal(localStorage)], { type: 'application/json' }),
        ),
        link = document.createElement('a');
      link.href = url;
      link.download = 'grave-accord-chapters.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      host.querySelector<HTMLElement>('[data-chapter-transfer-status]')!.textContent =
        chapterText(locale).importFailed;
    }
  };
  const importer = host.querySelector<HTMLInputElement>('[data-chapter-import]')!;
  importer.onchange = async () => {
    const file = importer.files?.[0];
    if (!file || !alive) return;
    const status = host.querySelector<HTMLElement>('[data-chapter-transfer-status]')!;
    try {
      if (file.size > 300000) throw Error('large');
      const raw = await file.text();
      if (!alive || !host.isConnected) return;
      importChapterJournal(raw, localStorage);
      const scratch = ownerDocument.createElement('div');
      scratch.innerHTML = chapterJournalMarkup();
      for (const selector of ['.chapter-journal ul', '.chapter-archive'])
        host.querySelector<HTMLElement>(selector)!.innerHTML =
          scratch.querySelector<HTMLElement>(selector)!.innerHTML;
      bindJourneyArchive();
      status.textContent = chapterText(locale).imported;
    } catch {
      if (alive && status.isConnected) status.textContent = chapterText(locale).importFailed;
    }
    importer.value = '';
  };
  host.querySelector<HTMLButtonElement>('[data-story-home]')!.onclick = () => {
    if (alive) back();
  };
  const show = (spec: SceneSpec) => {
    if (!alive) return;
    reader();
    host.querySelector<HTMLElement>('[data-story-hub-reader]')!.innerHTML = storyReaderMarkup(
      spec,
      locale,
      'hub',
    );
    reader = bindStoryReaders(host);
    host.querySelector<HTMLButtonElement>('[data-story-hub-reader] [data-vn-open]')?.click();
  };
  host.querySelector<HTMLButtonElement>('[data-story-prologue]')!.onclick = () =>
    show({ kind: 'prologue', index: 0 });
  function bindJourneyArchive() {
    host.querySelectorAll<HTMLButtonElement>('[data-journey-scene]').forEach(
      (button) =>
        (button.onclick = () => {
          const i = Number(button.dataset.journeyScene);
          if (alive && button.isConnected && earnedChapterScenes().has(i))
            show(i === -1 ? { kind: 'report', index: 0 } : { kind: 'journey', index: i });
        }),
    );
  }
  bindJourneyArchive();
  host.querySelectorAll<HTMLButtonElement>('[data-story-chapter]').forEach(
    (button) =>
      (button.onclick = () => {
        const n = Number(button.dataset.storyChapter);
        let clears = 0;
        try {
          clears = storyProgress(loadProfile(localStorage)).clears;
        } catch {}
        if (
          !button.disabled &&
          Number.isInteger(n) &&
          n >= 0 &&
          n < storyStructure.chapters.length &&
          clears >= storyStructure.chapters[n].from
        )
          show({ kind: 'chapter', index: n });
      }),
  );
  host.querySelectorAll<HTMLButtonElement>('[data-story-scene]').forEach((button) => {
    button.onclick = () => {
      if (!alive || button.disabled) return;
      const n = Number(button.dataset.storyScene);
      let clears = 0;
      try {
        clears = storyProgress(loadProfile(localStorage)).clears;
      } catch {}
      if (Number.isInteger(n) && n >= 0 && n < 15 && clears > n) show({ kind: 'report', index: n });
    };
  });
  return () => {
    alive = false;
    reader();
  };
}
