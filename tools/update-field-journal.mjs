import fs from "node:fs";
import { writeTextAtomic } from './write-text-atomic.mjs';
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
for(const l of locales){
  const file='locales/'+l.id+'.json',value=JSON.parse(fs.readFileSync(file,'utf8'));
  Object.assign(value.messages,fieldJournalMessages(l.id));
  writeTextAtomic(file,JSON.stringify(value,null,2)+'\n');
}
