import fs from "node:fs";
import { writeTextAtomic } from "./write-text-atomic.mjs";
import { bardMessages } from "../locales/source/bard.mjs";
const c = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));
for (const l of c.locales) {
  const file = "locales/" + l.id + ".json",
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  Object.assign(value.messages, bardMessages(l.id, c, value.messages));
  writeTextAtomic(file, JSON.stringify(value, null, 2) + "\n");
}
console.log(
  "Synchronized Bard names, kit contracts and interface copy in fifteen locales. Native-language review remains open.",
);
