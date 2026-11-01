import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyBard } from "../content/source/bard.mjs";
import { addClassTalents } from "../content/source/class-talents.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyBard(c);
addClassTalents(c);
for (const name of ["classes", "skills", "weapons"])
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
      authoredDate: "2026-11-01",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Materialized eight classes, 432 specialization nodes and 32 weapons.",
);
