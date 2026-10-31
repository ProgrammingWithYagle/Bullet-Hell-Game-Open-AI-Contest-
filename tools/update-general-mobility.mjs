import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyGeneralMobility } from "../content/source/general-mobility.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyGeneralMobility(c);
for (const [name, value] of [
  ["catalog", c],
  ["generalSkills", c.generalSkills],
  ["rules", c.rules],
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
  "Updated two shared General purchases; existing class-skill IDs and counts remain.",
);
