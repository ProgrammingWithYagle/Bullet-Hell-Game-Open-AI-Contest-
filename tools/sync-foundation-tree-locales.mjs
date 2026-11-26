import fs from "node:fs";
import { writeTextAtomic } from "./write-text-atomic.mjs";
import { foundationTreeMessages } from "../locales/source/foundation-tree.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
for (const { id } of c.locales) {
  const file = "locales/" + id + ".json",
    v = JSON.parse(fs.readFileSync(file, "utf8"));
  Object.assign(v.messages, foundationTreeMessages());
  writeTextAtomic(file, JSON.stringify(v, null, 2) + "\n");
}
console.log(
  "Foundation workbook and shared footwork synchronized as English pilot copy; translation review remains pending.",
);
