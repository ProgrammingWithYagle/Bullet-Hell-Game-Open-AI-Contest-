import fs from 'node:fs';
import crypto from 'node:crypto';
import { addClassTalents } from '../content/source/class-talents.mjs';
const c = JSON.parse(fs.readFileSync('content/catalog.json'));
addClassTalents(c);
fs.writeFileSync(
  'content/skills.json',
  JSON.stringify(c.skills, null, 2) + '\n',
);
fs.writeFileSync('content/catalog.json', JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync(
  'content/revision.json',
  JSON.stringify(
    {
      version: c.rules.contentVersion,
      sha256: crypto
        .createHash('sha256')
        .update(JSON.stringify(c))
        .digest('hex'),
      authoredDate: '2026-10-25',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    transformations: c.skills.filter((s) => s.transform).length,
  }),
);
