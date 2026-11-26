import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { applyBard } from "../content/source/bard.mjs";
import { addClassTalents } from "../content/source/class-talents.mjs";
const base = "8fc470663ece1ec3be82de1095c4a524b3e6b107";
const old = (path) =>
  JSON.parse(
    execFileSync("git", ["-c", "core.bare=false", "show", base + ":" + path], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }),
  );
const current = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const baseline = old("content/catalog.json"),
  c = current("content/catalog.json");
const withoutBard = structuredClone(c);
for (const key of ["classes", "skills", "weapons"])
  withoutBard[key] = withoutBard[key].filter(
    (v) => v.id !== "bard" && v.classId !== "bard",
  );
assert.deepEqual(withoutBard, baseline, "Existing authored mechanics changed");
const rebuilt = structuredClone(baseline);
applyBard(rebuilt);
addClassTalents(rebuilt);
assert.deepEqual(c, rebuilt, "Bard is not reproducible from authored source");
for (const path of [
  "assets/production/items/library.json",
  "assets/production/normalized/library.json",
  "assets/delivery/selection-portraits-v1/library.json",
  "assets/delivery/survivor-motion-v1/library.json",
]) {
  const before = old(path).entries,
    after = current(path).entries;
  for (const entry of before)
    assert.deepEqual(
      after.find((v) => (v.id ?? v.classId) === (entry.id ?? entry.classId)),
      entry,
      "Existing art contract changed: " + path,
    );
}
console.log(
  JSON.stringify({
    passed: true,
    baseline: base,
    existingMechanicsPreserved: true,
    existingArtEntriesPreserved: true,
    authoredBardReproducible: true,
    classes: c.classes.length,
    skills: c.skills.length,
    weapons: c.weapons.length,
  }),
);
