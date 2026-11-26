import fs from "node:fs";
import crypto from "node:crypto";
import { applyStitchwork } from "../content/source/stitchwork.mjs";
import { stitchworkMessages } from "../locales/source/stitchwork.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyStitchwork(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  [
    "src/client/stitch-help.json",
    Object.fromEntries(c.locales.map((l) => [l.id, stitchworkMessages(l.id)])),
  ],
])
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
fs.writeFileSync(
  "content/revision.json",
  JSON.stringify(
    {
      version: c.rules.contentVersion,
      sha256: crypto
        .createHash("sha256")
        .update(JSON.stringify(c))
        .digest("hex"),
      authoredDate: "2026-10-31",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Updated Stitchwright authored content and exact content revision.",
);
