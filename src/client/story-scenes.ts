import { openingNarrative } from "./story-opening.ts";
import dialogue from "./story/dialogue.json";
import { storyBook } from "./story-book.ts";
import { storyCampaign } from "../shared/story-campaign.ts";
import catalog from "../../content/catalog.json";
import type { ClassId } from "../shared/protocol.ts";
export type StoryLine = {
  speaker: string;
  classId?: ClassId;
  text: string;
  kind?: "narration" | "dialogue";
};
export type StoryScene = {
  id: string;
  narrativeId?: string;
  language: string;
  title: string;
  chapter: number;
  arenaId: string;
  lines: StoryLine[];
};
export type SceneSpec = {
  arenaId?: string;
  kind: "prologue" | "chapter" | "report";
  index: number;
  ending?: number;
};
const survivors = new Map(
  catalog.classes.map((c) => [c.survivor, c.id as ClassId]),
);
export const storyStructure = {
  arcId: "the-open-ledger",
  chapters: [
    { from: 0, to: 5, scenes: [0, 1, 2, 3, 4] },
    { from: 5, to: 10, scenes: [5, 6, 7, 8, 9] },
    { from: 10, to: 15, scenes: [10, 11, 12, 13, 14] },
  ],
};
export function storyScene(spec: SceneSpec, language: string): StoryScene {
  const book = storyBook(language),
    extra = dialogue[book.language as keyof typeof dialogue] ?? dialogue.en;
  const opening = openingNarrative(spec, book.language);
  if (opening) return opening;
  const line = (text: string, focus = ""): StoryLine => ({
    text,
    speaker: "",
    kind: "narration",
    ...(survivors.has(focus) ? { classId: survivors.get(focus) } : {}),
  });
  const spoken = (rows: string[][]) =>
    rows.map(([classId, text]) => ({
      speaker: catalog.classes.find((c) => c.id === classId)!.survivor,
      kind: "dialogue" as const,
      classId: classId as ClassId,
      text,
    }));
  if (spec.kind === "prologue")
    return {
      id: "prologue",
      language: book.language,
      title: book.title,
      chapter: 0,
      arenaId: "gatehouse",
      lines: [line(book.intro), ...spoken(extra.prologue)],
    };
  if (spec.kind === "chapter") {
    const n = Math.max(0, Math.min(2, spec.index)),
      chapter = book.acts[n];
    return {
      id: "chapter-" + n,
      language: book.language,
      title: chapter.title,
      chapter: n + 1,
      arenaId: ["gatehouse", "bell-foundry", "crown-crypt"][n],
      lines: [
        line(chapter.text, chapter.speaker),
        ...spoken(extra.chapters[n]),
      ],
    };
  }
  const n = Math.max(0, Math.min(14, spec.index)),
    beat = book.beats[n],
    chapter = Math.floor(n / 5),
    lines = [line(beat.text, beat.speaker), ...spoken(extra.beats[n])];
  if (n === 4 || n === 9) {
    const next = book.acts[chapter + 1];
    lines.push(
      line(next.text, next.speaker),
      ...spoken(extra.chapters[chapter + 1]),
    );
  }
  if (
    spec.ending !== undefined &&
    Number.isInteger(spec.ending) &&
    spec.ending >= 0 &&
    spec.ending < 3
  ) {
    const end = book.endings[spec.ending];
    lines.push(
      line(end.text, end.speaker),
      ...spoken(extra.endings[spec.ending]),
    );
  }
  return {
    id: "report-" + n + "-" + (spec.ending ?? ""),
    language: book.language,
    title: beat.title,
    chapter: chapter + 1,
    arenaId: storyCampaign.beats[n - 1]?.choices[0]?.arenaId ?? "gatehouse",
    lines,
  };
}
