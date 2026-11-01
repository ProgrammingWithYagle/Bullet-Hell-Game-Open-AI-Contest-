import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { storyScene } from "../src/client/story-scenes.ts";
import { storyBook } from "../src/client/story-book.ts";
import {
  saveStoryReading,
  storyReadingPosition,
} from "../src/client/story-reading.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";

test("Descriptive chapter, report and ending prose is narration while actual dialogue retains each speaker in all three editions", () => {
  for (const language of ["en", "es", "ar"]) {
    const book = storyBook(language);
    for (let n = 0; n < 3; n++) {
      const scene = storyScene({ kind: "chapter", index: n }, language);
      assert.equal(scene.lines[0].text, book.acts[n].text);
      assert.equal(scene.lines[0].speaker, "");
      assert.equal(scene.lines[0].kind, "narration");
      assert(
        scene.lines[0].classId,
        "A focal portrait is separate from speaking",
      );
      assert(
        scene.lines
          .slice(1)
          .every(
            (line) => line.kind === "dialogue" && line.speaker && line.classId,
          ),
      );
    }
    for (let n = 1; n < 15; n++) {
      const scene = storyScene({ kind: "report", index: n }, language);
      assert.equal(scene.lines[0].kind, "narration");
      assert.equal(scene.lines[0].speaker, "");
      assert(scene.lines[1].speaker);
      if (n === 4 || n === 9) assert.equal(scene.lines[3].kind, "narration");
    }
    for (const ending of [0, 1, 2]) {
      const scene = storyScene({ kind: "report", index: 14, ending }, language);
      assert.equal(scene.lines[3].text, book.endings[ending].text);
      assert.equal(scene.lines[3].speaker, "");
      assert.equal(scene.lines[3].kind, "narration");
      assert.equal(scene.lines[4].kind, "dialogue");
    }
    assert(
      storyScene({ kind: "prologue", index: 0 }, language).lines.every(
        (line) => line.kind === "narration" && line.speaker === "",
      ),
    );
  }
});

test("Actual full-screen reading changes from unlabeled descriptive prose to a named spoken turn, including Arabic direction", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  for (const language of ["en", "es", "ar"]) {
    env.host.innerHTML = ui.storyReaderMarkup(
      { kind: "chapter", index: 1 },
      language,
      "voice-review",
    );
    const dispose = ui.bindStoryReaders(env.host);
    env.host.querySelector("[data-vn-open]")!.click();
    assert.equal(
      env.host.querySelector(".vn-dialogue")!.dataset.vnKind,
      "narration",
    );
    assert(!env.host.querySelector(".vn-dialogue h3"));
    env.host.querySelector('[data-vn-step="1"]')!.click();
    assert.equal(
      env.host.querySelector(".vn-dialogue")!.dataset.vnKind,
      "dialogue",
    );
    assert.equal(
      env.host.querySelector(".vn-dialogue h3")!.textContent,
      "Tamsin Reed",
    );
    assert.equal(
      env.host.querySelector(".vn-dialogue")!.getAttribute("dir"),
      language === "ar" ? "rtl" : "ltr",
    );
    dispose();
  }
});

test("A semantic label alone preserves a reading mark, while changed words or speaking attribution restart it", () => {
  const values = new Map<string, string>(),
    store = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  const scene = storyScene({ kind: "prologue", index: 0 }, "en");
  const old = {
    ...scene,
    lines: scene.lines.map(({ kind: _kind, ...line }) => line),
  };
  assert(saveStoryReading(old, 3, store));
  assert.equal(storyReadingPosition(scene, store).index, 3);
  const changed = {
    ...scene,
    lines: scene.lines.map((line, n) =>
      n ? line : { ...line, speaker: "Mara Rook" },
    ),
  };
  assert.equal(storyReadingPosition(changed, store).index, 0);
  assert.equal(
    storyReadingPosition(
      {
        ...scene,
        lines: scene.lines.map((line, n) =>
          n ? line : { ...line, text: line.text + " Revised." },
        ),
      },
      store,
    ).index,
    0,
  );
});

test("The canonical playable word count counts current ensemble prose once while keeping legacy-only passages separate", () => {
  const words = JSON.parse(
    readFileSync("reviews/story-word-count.json", "utf8"),
  );
  assert.equal(words.openingWords, 3250);
  assert.equal(words.authoredPlayableMainStoryWords, 4731);
  assert.equal(words.totalAuthoredMainStoryIncludingLegacyWords, 6762);
  assert.equal(words.legacyPrototypeOnlyWords, 2031);
  assert.equal(words.targetAchieved, false);
  assert.equal(words.uniquePassages, 10);
});
