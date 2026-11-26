import fs from "node:fs";
import crypto from "node:crypto";
import { applyCrazedHorizon } from "../content/source/crazed-horizon.mjs";
import { crazedHorizonMessages } from "../locales/source/crazed-horizon.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json"));
applyCrazedHorizon(c);
for (const key of ["rules", "bosses", "difficulties"])
  fs.writeFileSync(
    "content/" + key + ".json",
    JSON.stringify(c[key], null, 2) + "\n",
  );
fs.writeFileSync("content/catalog.json", JSON.stringify(c, null, 2) + "\n");
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
for (const file of fs
  .readdirSync("locales")
  .filter((f) => f.endsWith(".json"))) {
  const path = "locales/" + file,
    l = JSON.parse(fs.readFileSync(path));
  Object.assign(l.messages, crazedHorizonMessages(l.meta.locale));
  fs.writeFileSync(path, JSON.stringify(l, null, 2) + "\n");
}
console.log(
  JSON.stringify({
    bosses: c.bosses.length,
    crazed: c.bosses.filter((b) => b.variants.crazed).length,
  }),
);
