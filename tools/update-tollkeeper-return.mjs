import fs from "node:fs";
import crypto from "node:crypto";
import {
  applyTollkeeperReturn,
  tollkeeperReturnRules,
} from "../content/source/tollkeeper-return.mjs";
import { tollkeeperReturnMessages } from "../locales/source/tollkeeper-return.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json"));
applyTollkeeperReturn(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  ["src/shared/tollkeeper-return-rules.json", tollkeeperReturnRules],
  [
    "src/client/tollkeeper-help.json",
    Object.fromEntries(
      c.locales.map((l) => [l.id, tollkeeperReturnMessages(l.id)]),
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
  Object.assign(l.messages, tollkeeperReturnMessages(l.meta.locale));
  fs.writeFileSync(p, JSON.stringify(l, null, 2) + "\n");
}
console.log("Updated Tollkeeper banked returns and fifteen-locale phase help.");
