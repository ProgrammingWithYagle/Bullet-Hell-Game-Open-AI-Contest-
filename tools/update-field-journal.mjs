import fs from "node:fs";
import { fieldJournalMessages } from "../locales/source/field-journal.mjs";
const locales = JSON.parse(
  fs.readFileSync("content/catalog.json", "utf8"),
).locales;
fs.writeFileSync(
  "src/client/field-journal-messages.json",
  JSON.stringify(
    Object.fromEntries(locales.map((l) => [l.id, fieldJournalMessages(l.id)])),
    null,
    2,
  ) + "\n",
);
console.log("Updated fifteen runtime Field Journal message sets.");
