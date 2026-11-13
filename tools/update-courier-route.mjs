import fs from "node:fs";
import crypto from "node:crypto";
import {
  applyCourierRoute,
  courierRouteRules,
} from "../content/source/courier-route.mjs";
import { courierRouteMessages } from "../locales/source/courier-route.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json"));
applyCourierRoute(c);
for (const [file, value] of [
  ["content/catalog.json", c],
  ["content/bosses.json", c.bosses],
  ["src/shared/courier-route-rules.json", courierRouteRules],
  [
    "src/client/courier-help.json",
    Object.fromEntries(
      c.locales.map((l) => [l.id, courierRouteMessages(l.id)]),
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
      authoredDate: "2026-10-26",
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
  Object.assign(l.messages, courierRouteMessages(l.meta.locale));
  fs.writeFileSync(p, JSON.stringify(l, null, 2) + "\n");
}
console.log("Updated Courier routes and fifteen-locale phase help.");
