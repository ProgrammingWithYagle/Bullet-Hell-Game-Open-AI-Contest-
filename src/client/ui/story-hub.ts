import { storyBook, storyDirection } from "../story-book.ts";
import { storyScene, storyStructure } from "../story-scenes.ts";
import { storyProgress } from "../story-progress.ts";
import { loadProfile } from "../profile.ts";
import { t, number, locale } from "../i18n.ts";
import { storyReaderMarkup, bindStoryReaders } from "./story-reader.ts";
import { escape as e } from "./html.ts";
export function storyHubMarkup() {
  let clears = 0;
  try {
    clears = storyProgress(loadProfile(localStorage)).clears;
  } catch {}
  const book = storyBook(locale);
  return `<section class="story-hub"><div class="section-heading"><div><p class="eyebrow">${e(t("ui.storyArcs"))} · I</p><h1 lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(book.title)}</h1></div><button data-story-home>${e(t("ui.back"))}</button></div><p>${e(t("mode.story.description"))}</p><div class="actions"><button data-story-begin class="primary">${e(t("ui.beginCampaign"))}</button><button data-story-prologue>${e(t("ui.readPrologue"))}</button></div><div class="story-chapters">${storyStructure.chapters.map((chapter, i) => `<article><span>${e(t("ui.storyChapter", { number: number(i + 1) }))}</span><h2 lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(book.acts[i].title)}</h2><p>${number(chapter.from + 1)}–${number(chapter.to)} · ${e(t("ui.storyScene", { number: number(5) }))}</p><button data-story-chapter="${i}" ${clears < chapter.from ? "disabled" : ""}>${e(t(clears < chapter.from ? "ui.laterChapter" : "ui.readChapter"))}</button><details><summary>${e(t("ui.chapterArchive"))}</summary>${chapter.scenes.map((n) => `<button data-story-scene="${n}" ${clears <= n ? "disabled" : ""}>${e(t("ui.storyScene", { number: number(n - chapter.from + 1) }))}</button>`).join("")}</details></article>`).join("")}</div><div data-story-hub-reader>${storyReaderMarkup({ kind: "prologue", index: 0 }, locale, "hub")}</div></section>`;
}
export function bindStoryHub(
  host: HTMLElement,
  begin: () => void,
  back: () => void,
) {
  host.innerHTML = storyHubMarkup();
  let alive = true,
    reader = bindStoryReaders(host);
  host.querySelector<HTMLButtonElement>("[data-story-begin]")!.onclick = () => {
    if (alive) begin();
  };
  host.querySelector<HTMLButtonElement>("[data-story-home]")!.onclick = () => {
    if (alive) back();
  };
  const show = (index?: number) => {
    if (!alive) return;
    reader();
    host.querySelector<HTMLElement>("[data-story-hub-reader]")!.innerHTML =
      storyReaderMarkup(
        index === undefined
          ? { kind: "prologue", index: 0 }
          : { kind: "chapter", index },
        locale,
        "hub",
      );
    reader = bindStoryReaders(host);
  };
  host.querySelector<HTMLButtonElement>("[data-story-prologue]")!.onclick =
    () => show();
  host.querySelectorAll<HTMLButtonElement>("[data-story-chapter]").forEach(
    (button) =>
      (button.onclick = () => {
        if (!button.disabled) show(Number(button.dataset.storyChapter));
      }),
  );
  return () => {
    alive = false;
    reader();
  };
}
