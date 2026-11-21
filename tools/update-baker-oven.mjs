import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyBakerOven } from "../content/source/baker-oven.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyBakerOven(c);
for (const [name, value] of [
  ["catalog", c],
  ["bosses", c.bosses],
])
  fs.writeFileSync(
    "content/" + name + ".json",
    JSON.stringify(value, null, 2) + "\n",
  );
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
  "Updated Ash Baker: locked rolls, shootable crusts, fresh crumb warnings and advanced batches.",
);
