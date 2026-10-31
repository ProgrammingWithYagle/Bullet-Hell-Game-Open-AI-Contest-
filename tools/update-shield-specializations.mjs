import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyShieldSpecializations } from "../content/source/shield-specializations.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyShieldSpecializations(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/classes.json", c.classes],
  ["content/skills.json", c.skills],
  ["content/rules.json", c.rules],
])
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
fs.writeFileSync(
  "content/revision.json",
  JSON.stringify(
    {
      version: c.rules.contentVersion,
      sha256: createHash("sha256").update(JSON.stringify(c)).digest("hex"),
      authoredDate: "2026-10-31",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Updated two existing shield specializations without changing node IDs, counts, prices or prerequisites.",
);
