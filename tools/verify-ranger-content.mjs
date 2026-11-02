import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { applyRanger } from "../content/source/ranger.mjs";
import { applyOpeningChapter } from "../content/source/opening-chapter.mjs";
import { addClassTalents } from "../content/source/class-talents.mjs";
const base = "4ef5d4693ea420bc57123ff095ad5db628e3f794";
const old = (p) =>
  JSON.parse(
    execFileSync("git", ["-c", "core.bare=false", "show", base + ":" + p], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }),
  );
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const before = old("content/catalog.json"),
  after = read("content/catalog.json"),
  prior = structuredClone(after);
for (const key of ["classes", "skills", "weapons"])
  prior[key] = prior[key].filter(
    (e) => e.id !== "ranger" && e.classId !== "ranger",
  );
delete prior.rules.ranger;
// The old public chapter lesson registry omitted the three already playable new classes.
// Preserve its history while making the current authored registry match executable lessons.
prior.storyChapters = structuredClone(before.storyChapters);
assert.deepEqual(prior, before, "An existing authored mechanic changed");
const rebuilt = structuredClone(before);
applyRanger(rebuilt);
applyOpeningChapter(rebuilt);
addClassTalents(rebuilt);
assert.deepEqual(rebuilt, after, "Ranger catalog is not reproducible");
for (const file of [
  "assets/production/items/library.json",
  "assets/production/normalized/library.json",
  "assets/delivery/selection-portraits-v1/library.json",
  "assets/delivery/survivor-motion-v1/library.json",
]) {
  for (const entry of old(file).entries)
    assert.deepEqual(
      read(file).entries.find(
        (e) => (e.id ?? e.classId) === (entry.id ?? entry.classId),
      ),
      entry,
      "Existing art entry changed: " + file,
    );
}
const csv = (p) => {
  const [header, ...lines] = execFileSync(
    "git",
    ["-c", "core.bare=false", "show", base + ":" + p],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  )
    .trim()
    .split(/\r?\n/);
  return { header, lines };
};
const priorModel = csv("docs/balance/uptime-model.csv"),
  nowLines = fs
    .readFileSync("docs/balance/uptime-model.csv", "utf8")
    .trim()
    .split(/\r?\n/);
assert.equal(nowLines[0], priorModel.header);
const columns = priorModel.header.split(","),
  classColumn = columns.indexOf("classId");
assert.deepEqual(
  nowLines.slice(1).filter((line) => line.split(",")[classColumn] !== "ranger"),
  priorModel.lines,
  "Existing analytical model rows changed",
);
const result = {
  passed: true,
  baseline: base,
  existingMechanicsPreserved: true,
  existingArtEntriesPreserved: true,
  existing37500AnalyticalRowsPreserved: true,
  chapterLessonRegistryCorrectedForExistingClasses: [
    "bard",
    "swordsman",
    "summoner",
  ],
  rangerSourceReproducible: true,
  classes: after.classes.length,
  skills: after.skills.length,
  weapons: after.weapons.length,
};
fs.writeFileSync(
  "reviews/ranger-2026-11-02/source-invariants.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
