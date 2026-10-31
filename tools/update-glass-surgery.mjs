import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyGlassSurgery } from "../content/source/glass-surgery.mjs";
import { glassSurgeryMessages } from "../locales/source/glass-surgery.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyGlassSurgery(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  [
    "src/client/glass-help.json",
    Object.fromEntries(
      c.locales.map((l) => [l.id, glassSurgeryMessages(l.id)]),
    ),
  ],
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
  "Updated Glass Surgeon refraction patterns and all fifteen help catalogs.",
);
