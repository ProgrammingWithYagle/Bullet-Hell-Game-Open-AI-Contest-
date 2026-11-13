import english from "./story/opening/en.json";
import spanish from "./story/opening/es.json";
import arabic from "./story/opening/ar.json";
import catalog from "../../content/catalog.json";
import type { ClassId } from "../shared/protocol.ts";
import type { SceneSpec, StoryScene } from "./story-scenes.ts";

export const openingSceneBindings = [
  {
    id: "gate-cart",
    kind: "prologue",
    index: 0,
    readerId: "prologue",
    chapter: 0,
    arenaId: "gatehouse",
    bossId: "constable",
    timing: "before-encounter",
  },
  {
    id: "first-return",
    kind: "report",
    index: 0,
    readerId: "report-0-",
    chapter: 1,
    arenaId: "gatehouse",
    bossId: "constable",
    timing: "after-clear",
  },
] as const;
export type OpeningEdition = {
  schemaVersion: 1;
  language: string;
  scenes: {
    id: string;
    title: string;
    pages: { focus: string; text: string }[];
  }[];
};
const keys = (
  v: unknown,
  names: readonly string[],
): v is Record<string, unknown> =>
  Boolean(
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v).length === names.length &&
    names.every((k) => Object.hasOwn(v, k)),
  );
const prose = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  v.normalize("NFC") === v;
const classIds = new Set(catalog.classes.map((c) => c.id));
/** Prose editions cannot carry routing, rewards, encounter commands or different mechanics. */
export function validOpeningEdition(
  value: unknown,
  language: string,
): value is OpeningEdition {
  if (
    !keys(value, ["schemaVersion", "language", "scenes"]) ||
    value.schemaVersion !== 1 ||
    value.language !== language ||
    !Array.isArray(value.scenes) ||
    value.scenes.length !== openingSceneBindings.length
  )
    return false;
  return value.scenes.every(
    (scene, index) =>
      keys(scene, ["id", "title", "pages"]) &&
      scene.id === openingSceneBindings[index].id &&
      prose(scene.title, 100) &&
      Array.isArray(scene.pages) &&
      scene.pages.length > 0 &&
      scene.pages.length <= 128 &&
      scene.pages.every(
        (page) =>
          keys(page, ["focus", "text"]) &&
          typeof page.focus === "string" &&
          (page.focus === "" || classIds.has(page.focus)) &&
          prose(page.text, 1200),
      ),
  );
}
const editions: Record<string, OpeningEdition> = {};
for (const [language, edition] of Object.entries({
  en: english,
  es: spanish,
  ar: arabic,
})) {
  if (!validOpeningEdition(edition, language))
    throw Error("Invalid opening narrative edition: " + language);
  editions[language] = edition;
}
export const openingNarrativeLanguages = Object.keys(editions);
export function openingNarrative(
  spec: SceneSpec,
  language: string,
): StoryScene | undefined {
  const binding = openingSceneBindings.find(
    (s) => s.kind === spec.kind && s.index === spec.index,
  );
  if (!binding || spec.ending !== undefined) return undefined;
  const edition = editions[language];
  if (!edition) return undefined;
  const scene = edition.scenes.find((s) => s.id === binding.id)!;
  return {
    id: binding.readerId,
    narrativeId: binding.id,
    language,
    title: scene.title,
    chapter: binding.chapter,
    arenaId: binding.arenaId,
    lines: scene.pages.map((page) => ({
      speaker: "",
      kind: "narration" as const,
      text: page.text,
      ...(page.focus ? { classId: page.focus as ClassId } : {}),
    })),
  };
}
