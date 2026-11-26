import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyRanger } from "../content/source/ranger.mjs";
import { applyOpeningChapter } from "../content/source/opening-chapter.mjs";
import { addClassTalents } from "../content/source/class-talents.mjs";
import { rangerTalentMessages } from "../locales/source/ranger.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
for (const name of ["classes", "skills", "weapons"])
  c[name] = c[name].filter((v) => v.id !== "ranger" && v.classId !== "ranger");
applyRanger(c);
applyOpeningChapter(c);
addClassTalents(c);
for (const name of ["rules", "classes", "skills", "weapons", "storyChapters"])
  fs.writeFileSync(
    "content/" + name + ".json",
    JSON.stringify(c[name], null, 2) + "\n",
  );
fs.writeFileSync("content/catalog.json", JSON.stringify(c, null, 2) + "\n");
fs.writeFileSync(
  "content/revision.json",
  JSON.stringify(
    {
      version: c.rules.contentVersion,
      sha256: createHash("sha256").update(JSON.stringify(c)).digest("hex"),
      authoredDate: "2026-11-02",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Materialized eleven-class Ranger candidate; release integration and gates remain required.",
);
const csvRow = (row) =>
  row.map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"').join(",");
const appendRanger = (file, rows) => {
  const old = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((v) => v && !v.startsWith('"ranger-'));
  fs.writeFileSync(
    file,
    old.join("\n") + "\n" + rows.map(csvRow).join("\n") + "\n",
  );
};
const messages = rangerTalentMessages("en");
appendRanger(
  "docs/balance/skills.csv",
  c.skills
    .filter((s) => s.classId === "ranger")
    .map((s) => [
      s.id,
      s.classId,
      s.branchName,
      s.subbranchName,
      s.name,
      s.depth,
      s.cost,
      s.grade,
      s.prerequisite ?? "",
      s.capstone,
      JSON.stringify(s.effects),
      s.transform ?? "",
      s.transform ? messages["talent." + s.transform + ".description"] : "",
    ]),
);
appendRanger(
  "docs/balance/weapons.csv",
  c.weapons
    .filter((w) => w.classId === "ranger")
    .map((w) => [
      w.id,
      w.classId,
      w.name,
      w.damage,
      w.fireRate,
      w.magazine,
      w.reloadTime,
      w.projectileSpeed,
      w.pellets,
      w.spreadDegrees,
      w.pierce,
      w.price,
      w.baselineSustainedDps,
    ]),
);
