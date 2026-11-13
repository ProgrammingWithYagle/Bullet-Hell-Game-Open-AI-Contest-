import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyLamplightWatch } from "../content/source/lamplight-watch.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyLamplightWatch(c);
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
  "Updated Lamplighter: reachable bankable shadows, distinct watches and freshly warned advanced echoes.",
);
