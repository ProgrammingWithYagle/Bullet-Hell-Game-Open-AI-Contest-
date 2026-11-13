import fs from "node:fs";
import { createHash } from "node:crypto";
import { applyStoryCampaign } from "../content/source/story-campaign.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
applyStoryCampaign(c);
for (const [name, value] of [
  ["catalog", c],
  ["modes", c.modes],
  ["bossPools", c.bossPools],
  ["leaderboards", c.leaderboards],
  ["storyCampaign", c.storyCampaign],
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
  "Updated Story campaign:15 encounters,3 acts,14 party decisions and3 endings.",
);
