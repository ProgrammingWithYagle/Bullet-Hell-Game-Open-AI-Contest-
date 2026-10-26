import fs from 'node:fs';
import { classTalentMessages } from '../locales/source/class-talents.mjs';
const catalog = JSON.parse(fs.readFileSync('content/catalog.json'));
for (const file of fs
  .readdirSync('locales')
  .filter((f) => f.endsWith('.json'))) {
  const p = 'locales/' + file,
    l = JSON.parse(fs.readFileSync(p));
  Object.assign(l.messages, classTalentMessages(l.meta.locale, catalog));
  fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n');
}
console.log(
  'Synchronized 21 class talent names and descriptions in fifteen locales.',
);
