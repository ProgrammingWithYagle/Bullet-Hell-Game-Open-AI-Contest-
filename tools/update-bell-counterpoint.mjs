import fs from "node:fs";
import crypto from "node:crypto";
import {
  applyBellCounterpoint,
  bellCounterpointRules,
} from "../content/source/bell-counterpoint.mjs";
import { bellCounterpointMessages as bellMessages } from "../locales/source/bell-counterpoint.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyBellCounterpoint(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  ["content/rules.json", c.rules],
  ["src/shared/bell-carillon-rules.json", bellCounterpointRules],
  [
    "src/client/bell-help.json",
    Object.fromEntries(c.locales.map((l) => [l.id, bellMessages(l.id)])),
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
      authoredDate: "2026-10-28",
    },
    null,
    2,
  ) + "\n",
);
for (const l of c.locales) {
  const file = "locales/" + l.id + ".json",
    v = JSON.parse(fs.readFileSync(file, "utf8"));
  v.meta.contentVersion = c.rules.contentVersion;
  delete v.contentVersion;
  Object.assign(v.messages, bellMessages(l.id));
  fs.writeFileSync(file, JSON.stringify(v, null, 2) + "\n");
}
console.log(
  "Updated Bell Counterpoint rules, exact content revision and fifteen-locale help.",
);
