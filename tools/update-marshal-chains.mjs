import fs from "node:fs";
import crypto from "node:crypto";
import {
  applyMarshalChains,
  marshalRules,
} from "../content/source/marshal-chains.mjs";
import { marshalMessages } from "../locales/source/marshal-chains.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json"));
applyMarshalChains(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  ["src/shared/marshal-chains-rules.json", marshalRules],
  [
    "src/client/marshal-help.json",
    Object.fromEntries(
      c.locales.map((l) => [l.id, marshalMessages(l.id)]),
    ),
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
      authoredDate: "2026-10-27",
    },
    null,
    2,
  ) + "\n",
);
for (const file of fs
  .readdirSync("locales")
  .filter((f) => f.endsWith(".json"))) {
  const p = "locales/" + file,
    l = JSON.parse(fs.readFileSync(p));
  Object.assign(l.messages, marshalMessages(l.meta.locale));
  fs.writeFileSync(p, JSON.stringify(l, null, 2) + "\n");
}
console.log("Updated Marshal chain sweeps and fifteen-locale phase help.");
