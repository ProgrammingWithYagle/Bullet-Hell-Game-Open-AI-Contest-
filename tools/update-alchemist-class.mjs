import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { applyAlchemist } from '../content/source/alchemist-class.mjs';
import { applyOpeningChapter } from '../content/source/opening-chapter.mjs';
import { addClassTalents } from '../content/source/class-talents.mjs';
const c = JSON.parse(fs.readFileSync('content/catalog.json', 'utf8'));
for (const name of ['classes', 'skills', 'weapons']) c[name] = c[name].filter(v => v.id !== 'alchemist' && v.classId !== 'alchemist');
applyAlchemist(c);
applyOpeningChapter(c);
addClassTalents(c);
for (const name of ['rules', 'classes', 'skills', 'weapons', 'storyChapters']) fs.writeFileSync('content/' + name + '.json', JSON.stringify(c[name], null, 2) + '\n');
fs.writeFileSync('content/catalog.json', JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync('content/revision.json', JSON.stringify({version: c.rules.contentVersion, sha256: createHash('sha256').update(JSON.stringify(c)).digest('hex'), authoredDate: '2026-11-02'}, null, 2) + '\n');
console.log('Materialized Alchemist candidate; integration and release gates remain required.');

// Current editable tables are materialized alongside JSON; earlier class rows stay byte-identical.
const csvRow = row => row.map(v => '"'+String(v??'').replaceAll('"','""')+'"').join(',');
const replaceAlchemyRows = (file,rows) => {
  const old=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(v=>v&&!v.startsWith('"alchemist-'));
  fs.writeFileSync(file,old.join('\n')+'\n'+rows.map(csvRow).join('\n')+'\n');
};
const english=JSON.parse(fs.readFileSync('locales/en.json','utf8')).messages;
replaceAlchemyRows('docs/balance/skills.csv',c.skills.filter(s=>s.classId==='alchemist').map(s=>[
  s.id,s.classId,s.branchName,s.subbranchName,s.name,s.depth,s.cost,s.grade,s.prerequisite??'',s.capstone,JSON.stringify(s.effects),s.transform??'',s.transform?english['talent.'+s.transform+'.description']:''
]));
replaceAlchemyRows('docs/balance/weapons.csv',c.weapons.filter(w=>w.classId==='alchemist').map(w=>[
  w.id,w.classId,w.name,w.damage,w.fireRate,w.magazine,w.reloadTime,w.projectileSpeed,w.pellets,w.spreadDegrees,w.pierce,w.price,w.baselineSustainedDps
]));
