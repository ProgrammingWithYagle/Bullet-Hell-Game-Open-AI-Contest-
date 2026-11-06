import { storyReadingPosition, saveStoryReading } from "../story-reading.ts";
import catalog from "../../../content/catalog.json";
import {
  storyScene,
  type SceneSpec,
  type StoryScene,
} from "../story-scenes.ts";
import { storyDirection } from "../story-book.ts";
import { assets } from "../assets.ts";
import { t, number, locale } from "../i18n.ts";
import { escape as e } from "./html.ts";

const readingScreens = new Map<string, boolean>();
let activeReader: HTMLDialogElement | undefined;
function rememberScreen(key: string, open: boolean) {
  readingScreens.delete(key);
  readingScreens.set(key, open);
  if (readingScreens.size > 256)
    readingScreens.delete(readingScreens.keys().next().value!);
}
export function storyReaderOpen(ownerDocument: Document = document) {
  return [
    ...ownerDocument.querySelectorAll<HTMLDialogElement>("dialog.story-reader"),
  ].some((reader) => reader.open);
}
function frame(scene: StoryScene, index: number, persistent = true) {
  const line = scene.lines[index],
    image = line.classId ? assets.portraits[line.classId] : undefined;
  const background =
    assets.arenaWorlds[scene.arenaId] ?? assets.arenaGrounds[scene.arenaId];
  return `<button class="vn-return" data-vn-close>${e(t("ui.back"))}</button><div class="visual-novel" style="--story-background:url('${e(background ?? "")}')"><div class="vn-stage">${image ? `<img class="vn-portrait" src="${e(image)}" alt="" aria-hidden="true">` : ""}<div class="vn-location"><span>${e(scene.chapter === 0 ? t("ui.readPrologue") : t("ui.storyChapter", { number: number(scene.chapter) }))}</span><strong lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${e(scene.title)}</strong></div></div><div class="vn-dialogue" data-vn-kind="${line.kind ?? (line.speaker ? "dialogue" : "narration")}" lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${line.speaker ? `<h3><bdi>${e(line.speaker)}</bdi></h3>` : ""}<p data-vn-line aria-live="polite">${e(line.text)}</p></div><nav class="vn-controls" aria-label="${e(t("ui.continueReading"))}"><button data-vn-step="-1" ${index === 0 ? "disabled" : ""}>${e(t("ui.previousScene"))}</button><bdi>${number(index + 1)} / ${number(scene.lines.length)}</bdi><button data-vn-step="1" ${index === scene.lines.length - 1 ? "disabled" : ""}>${e(t("ui.nextScene"))}</button></nav><p class="vn-bookmark">${e(t(persistent ? "ui.readingSaved" : "ui.readingSessionOnly"))}</p></div><details class="vn-transcript"><summary>${e(t("ui.chapterArchive"))}</summary><div lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${scene.lines.map((line) => `<p>${line.speaker ? `<bdi><b>${e(line.speaker)}</b></bdi> ` : ""}${e(line.text)}</p>`).join("")}</div></details>`;
}
export function storyReaderMarkup(
  spec: SceneSpec,
  language = locale,
  key = "book",
  autoOpen = false,
) {
  const scene = storyScene(spec, language);
  if (spec.arenaId && catalog.arenas.some((a) => a.id === spec.arenaId))
    scene.arenaId = spec.arenaId;
  const position = storyReadingPosition(scene);
  return `<section class="story-entry"><button class="vn-read-launch" data-vn-open>${e(t("ui.continueReading"))} · <bdi lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${e(scene.title)}</bdi></button><dialog class="story-reader" aria-modal="true" aria-label="${e(scene.title)}" tabindex="-1" data-vn-auto="${autoOpen ? "true" : "false"}" data-vn-narrative="${e(scene.narrativeId ?? scene.id)}" data-vn-arena="${e(scene.arenaId)}" data-vn-kind="${spec.kind}" data-vn-index="${spec.index}" data-vn-ending="${spec.ending ?? ""}" data-vn-language="${e(language)}" data-vn-key="${e(key)}">${frame(scene, position.index, position.persistent)}</dialog></section>`;
}
/** Reading is a local modal screen. It never votes, pauses a room or grants progress. */
export function bindStoryReaders(host: HTMLElement) {
  const ownerDocument = document;
  let alive = true,
    disposing = false;
  const cleanups: (() => void)[] = [];
  const readers = [
    ...host.querySelectorAll<HTMLDialogElement>("dialog.story-reader"),
  ];
  for (const reader of readers) {
    const spec: SceneSpec = {
      kind: reader.dataset.vnKind as SceneSpec["kind"],
      arenaId: reader.dataset.vnArena,
      index: Number(reader.dataset.vnIndex),
      ...(reader.dataset.vnEnding !== ""
        ? { ending: Number(reader.dataset.vnEnding) }
        : {}),
    };
    const scene = storyScene(spec, reader.dataset.vnLanguage ?? locale);
    if (spec.arenaId && catalog.arenas.some((a) => a.id === spec.arenaId))
      scene.arenaId = spec.arenaId;
    const launch =
      reader.parentElement!.querySelector<HTMLButtonElement>("[data-vn-open]")!;
    const screenKey =
      (reader.dataset.vnKey ?? "book") + ":" + scene.language + ":" + scene.id;
    const valid = () => alive && reader.isConnected && reader.open;
    const syncScroll = () => {
      if (!storyReaderOpen(ownerDocument))
        ownerDocument.documentElement.classList.remove("novel-reading");
    };
    const close = () => {
      if (!valid()) return;
      rememberScreen(screenKey, false);
      reader.close();
    };
    const closed = () => {
      if (activeReader === reader) activeReader = undefined;
      syncScroll();
      if (!disposing && alive) {
        rememberScreen(screenKey, false);
        if (launch.isConnected) launch.focus({ preventScroll: true });
      }
    };
    const bindFrame = () => {
      reader.querySelector<HTMLButtonElement>("[data-vn-close]")!.onclick =
        close;
      reader.querySelectorAll<HTMLButtonElement>("[data-vn-step]").forEach(
        (button) =>
          (button.onclick = () => {
            const delta = Number(button.dataset.vnStep);
            if (
              !valid() ||
              !button.isConnected ||
              button.disabled ||
              (delta !== -1 && delta !== 1)
            )
              return;
            const index = Math.max(
              0,
              Math.min(
                scene.lines.length - 1,
                storyReadingPosition(scene).index + delta,
              ),
            );
            const persistent = saveStoryReading(scene, index);
            reader.innerHTML = frame(scene, index, persistent);
            bindFrame();
            reader
              .querySelector<HTMLButtonElement>(
                '[data-vn-step="' + delta + '"]',
              )
              ?.focus({ preventScroll: true });
          }),
      );
    };
    launch.onclick = () => {
      if (
        !alive ||
        !reader.isConnected ||
        !launch.isConnected ||
        launch.disabled
      )
        return;
      if (reader.open) return;
      if (activeReader?.open) activeReader.close();
      const position = storyReadingPosition(scene);
      reader.innerHTML = frame(scene, position.index, position.persistent);
      bindFrame();
      activeReader = reader;
      rememberScreen(screenKey, true);
      reader.showModal();
      ownerDocument.documentElement.classList.add("novel-reading");
      reader
        .querySelector<HTMLButtonElement>("[data-vn-close]")!
        .focus({ preventScroll: true });
    };
    const cancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    const keydown = (event: KeyboardEvent) => {
      if (!valid() || event.altKey || event.ctrlKey || event.metaKey) return;
      const transcript =
        reader.querySelector<HTMLDetailsElement>(".vn-transcript")!;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation?.();
        if (transcript.open) {
          transcript.open = false;
          transcript.querySelector<HTMLElement>("summary")?.focus();
        } else close();
        return;
      }
      if (transcript.open) return;
      const target = event.target as HTMLElement;
      if (
        (event.key === " " || event.key === "Enter") &&
        (target?.closest("button") || target?.closest("summary"))
      )
        return;
      const delta = ["ArrowLeft", "PageUp"].includes(event.key)
        ? -1
        : ["ArrowRight", "PageDown", " ", "Enter"].includes(event.key)
          ? 1
          : 0;
      if (delta) {
        event.preventDefault();
        event.stopPropagation?.();
        reader
          .querySelector<HTMLButtonElement>('[data-vn-step="' + delta + '"]')
          ?.click();
      }
    };
    reader.addEventListener("cancel", cancel);
    reader.addEventListener("close", closed);
    reader.addEventListener("keydown", keydown);
    cleanups.push(() => {
      if (reader.open) reader.close();
      reader.removeEventListener("cancel", cancel);
      reader.removeEventListener("close", closed);
      reader.removeEventListener("keydown", keydown);
      syncScroll();
    });
    if (
      reader.dataset.vnAuto === "true" &&
      readingScreens.get(screenKey) !== false
    )
      launch.click();
  }
  return () => {
    disposing = true;
    alive = false;
    cleanups.forEach((cleanup) => cleanup());
  };
}
