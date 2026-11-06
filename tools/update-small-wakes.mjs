import fs from "node:fs";
import crypto from "node:crypto";
import { addSmallWakes } from "../content/source/small-wakes.mjs";
import { applyEncounterPacing } from "../content/source/encounter-pacing.mjs";
import { smallWakesMessages } from "../locales/source/small-wakes.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json"));
const previous = new Map(c.bosses.map((b) => [b.id, JSON.stringify(b)]));
addSmallWakes(c.bosses, c.bossPools);
applyEncounterPacing(c);
for (const b of c.bosses)
  if (previous.has(b.id) && previous.get(b.id) !== JSON.stringify(b))
    throw Error("Existing encounter changed: " + b.id);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  ["content/bossPools.json", c.bossPools],
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
      authoredDate: "2026-10-26",
    },
    null,
    2,
  ) + "\n",
);
for (const f of fs.readdirSync("locales").filter((f) => f.endsWith(".json"))) {
  const file = "locales/" + f,
    l = JSON.parse(fs.readFileSync(file));
  Object.assign(l.messages, smallWakesMessages(l.meta.locale));
  fs.writeFileSync(file, JSON.stringify(l, null, 2) + "\n");
}
fs.writeFileSync(
  "src/client/small-wakes-help.json",
  JSON.stringify(
    Object.fromEntries(c.locales.map((l) => [l.id, smallWakesMessages(l.id)])),
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    bosses: c.bosses.length,
    ordinary: c.bosses.filter((b) => !b.secret).length,
    priorEncountersPreserved: previous.size,
    localeHelp: 15,
  }),
);
