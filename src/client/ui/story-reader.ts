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
const positions = new Map<string, number>();
function frame(scene: StoryScene, index: number) {
  const line = scene.lines[index],
    image = line.classId ? assets.portraits[line.classId] : undefined;
  const background =
    assets.arenaWorlds[scene.arenaId] ?? assets.arenaGrounds[scene.arenaId];
  return `<div class="visual-novel" style="--story-background:url('${e(background ?? "")}')"><div class="vn-stage">${image ? `<img class="vn-portrait" src="${e(image)}" alt="" aria-hidden="true">` : ""}<div class="vn-location"><span>${e(scene.chapter === 0 ? t("ui.readPrologue") : t("ui.storyChapter", { number: number(scene.chapter) }))}</span><strong lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${e(scene.title)}</strong></div></div><div class="vn-dialogue" lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${line.speaker ? `<h3><bdi>${e(line.speaker)}</bdi></h3>` : ""}<p data-vn-line aria-live="polite">${e(line.text)}</p></div><nav class="vn-controls" aria-label="${e(t("ui.continueReading"))}"><button data-vn-step="-1" ${index === 0 ? "disabled" : ""}>${e(t("ui.previousScene"))}</button><bdi>${number(index + 1)} / ${number(scene.lines.length)}</bdi><button data-vn-step="1" ${index === scene.lines.length - 1 ? "disabled" : ""}>${e(t("ui.nextScene"))}</button></nav></div><details class="vn-transcript"><summary>${e(t("ui.chapterArchive"))}</summary><div lang="${e(scene.language)}" dir="${storyDirection(scene.language)}">${scene.lines.map((line) => `<p>${line.speaker ? `<bdi><b>${e(line.speaker)}</b></bdi> ` : ""}${e(line.text)}</p>`).join("")}</div></details>`;
}
export function storyReaderMarkup(
  spec: SceneSpec,
  language = locale,
  key = "book",
) {
  const scene = storyScene(spec, language);
  if (spec.arenaId && catalog.arenas.some((a) => a.id === spec.arenaId))
    scene.arenaId = spec.arenaId;
  const id = key + ":" + scene.language + ":" + scene.id,
    index = Math.min(scene.lines.length - 1, positions.get(id) ?? 0);
  return `<section class="story-reader" data-vn-arena="${e(scene.arenaId)}" data-vn-kind="${spec.kind}" data-vn-index="${spec.index}" data-vn-ending="${spec.ending ?? ""}" data-vn-language="${e(language)}" data-vn-key="${e(key)}">${frame(scene, index)}</section>`;
}
/** This controller changes only the local reading cursor. It never votes, pauses a room or writes progress. */
export function bindStoryReaders(host: HTMLElement) {
  let alive = true;
  const readers = [...host.querySelectorAll<HTMLElement>(".story-reader")];
  const bind = (reader: HTMLElement) => {
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
    const key =
      (reader.dataset.vnKey ?? "book") + ":" + scene.language + ":" + scene.id;
    reader.querySelectorAll<HTMLButtonElement>("[data-vn-step]").forEach(
      (button) =>
        (button.onclick = () => {
          if (!alive || !reader.isConnected || button.disabled) return;
          const index = Math.max(
            0,
            Math.min(
              scene.lines.length - 1,
              (positions.get(key) ?? 0) + Number(button.dataset.vnStep),
            ),
          );
          positions.set(key, index);
          if (positions.size > 120)
            positions.delete(positions.keys().next().value!);
          reader.innerHTML = frame(scene, index);
          bind(reader);
          reader
            .querySelector<HTMLButtonElement>(
              '[data-vn-step="' + button.dataset.vnStep + '"]',
            )
            ?.focus({ preventScroll: true });
        }),
    );
  };
  readers.forEach(bind);
  return () => {
    alive = false;
  };
}
