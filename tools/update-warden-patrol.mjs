import fs from 'node:fs';
import crypto from 'node:crypto';
import { applyWardenPatrol } from '../content/source/warden-patrol.mjs';
import { wardenMessages } from '../locales/source/warden-patrol.mjs';
const c = JSON.parse(fs.readFileSync('content/catalog.json'));
applyWardenPatrol(c);
for (const [file, value] of [
  ['content/bosses.json', c.bosses],
  ['content/catalog.json', c],
])
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
fs.writeFileSync(
  'content/revision.json',
  JSON.stringify(
    {
      version: c.rules.contentVersion,
      sha256: crypto
        .createHash('sha256')
        .update(JSON.stringify(c))
        .digest('hex'),
      authoredDate: '2026-10-26',
    },
    null,
    2,
  ) + '\n',
);
for (const f of fs.readdirSync('locales').filter((f) => f.endsWith('.json'))) {
  const p = 'locales/' + f,
    l = JSON.parse(fs.readFileSync(p));
  Object.assign(l.messages, wardenMessages(l.meta.locale));
  fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n');
}
fs.writeFileSync(
  'src/client/warden-help.json',
  JSON.stringify(
    Object.fromEntries(c.locales.map((l) => [l.id, wardenMessages(l.id)])),
    null,
    2,
  ) + '\n',
);
console.log('Updated Warden patrol/signature policy and fifteen-locale help.');
