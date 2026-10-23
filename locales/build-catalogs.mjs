// Stage 1 data authoring utility. This does not implement the game runtime.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { english } from './source/en.mjs';
import additional from './source/additional.mjs';
import { expansionMessages } from './source/boss-expansion.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(path.join(root, 'content/catalog.json'), 'utf8'));
const ids = ['en','zh-Hans','zh-Hant','ja','es','fr','de','pt-BR','ru','hi','ar','bn','id','ur','ko'];
const groupKeys = Object.fromEntries(Object.entries(english).map(([group, rows]) => [group, Object.keys(rows)]));
const sources = {};
for (const id of ids) {
  const source = id === 'en' ? english : (await import(`./source/${id}.mjs`)).default;
  const messages = {};
  for (const [group, keys] of Object.entries(groupKeys)) {
    const rows = source[group];
    if (!rows) throw new Error(`${id}: missing source group ${group}`);
    const values = typeof rows === 'string' ? rows.trim().split('\n').map(x => x.trim()) : Object.values(rows);
    if (values.length !== keys.length) throw new Error(`${id}/${group}: ${values.length} values; expected ${keys.length}`);
    keys.forEach((key, index) => { messages[`${group}.${key}`] = values[index]; });
  }
  Object.assign(messages, additional[id]);
  Object.assign(messages, expansionMessages(id));
  const generic = key => messages[`template.${key}`];
  for (const x of catalog.weapons) messages[`weapon.${x.id}.description`] = generic('weapon');
  for (const x of catalog.skills) messages[`skill.${x.id}.description`] = generic('skill');
  for (const x of catalog.mutations) messages[`mutation.${x.id}.description`] = generic('mutation');
  for (const x of catalog.upgrades) messages[`upgrade.${x.id}.description`] = generic('upgrade');
  // Plurals are separate typed messages, selected through Intl.PluralRules, never English-only suffixes.
  const plurals = (await import(`./source/plurals.mjs`)).default[id];
  for (const [key, forms] of Object.entries(plurals)) messages[`count.${key}`] = { plural: 'count', forms };
  const info = catalog.locales.find(x => x.id === id);
  const output = {
    meta: { schemaVersion: 1, locale: id, nativeName: info.name, direction: info.direction,
      messageFormat: 'grave-accord-messages-v1', sourceLocale: 'en', contentVersion: catalog.rules.contentVersion,
      authorship: 'AI-authored', nativeSpeakerReview: 'pending', uiLayoutReview: 'pending',
      generatedFrom: 'locales/source', brand: 'Grave Accord',
      pluralCategories: new Intl.PluralRules(id).resolvedOptions().pluralCategories },
    messages: Object.fromEntries(Object.entries(messages).sort(([a],[b]) => a.localeCompare(b,'en')))
  };
  await writeFile(path.join(root, 'locales', `${id}.json`), JSON.stringify(output, null, 2) + '\n');
  sources[id] = Object.keys(messages).length;
}
// Keep the owned implementation document's counts tied to the actual generated data.
const docPath = path.join(root, 'docs/LOCALIZATION_IMPLEMENTATION.md');
let document = await readFile(docPath, 'utf8');
const countBlock = `<!-- localization-counts:start -->
- Current content version: **${catalog.rules.contentVersion}**. Every catalog has **${sources.en.toLocaleString('en-US')} flat message keys**, for **${Object.values(sources).reduce((sum,n)=>sum+n,0).toLocaleString('en-US')} localized messages** across **${ids.length} locales**. The count includes three typed plural messages per locale; plural alternatives are additional strings within those messages.
- Coverage includes ${Object.keys(english.ui).length} menu, lobby, connection, HUD, vote, shop, skill-tree, ending, accessibility, settings, changelog and squad-leaderboard strings; all ${catalog.modes.length} modes and ${catalog.difficulties.length} difficulties; all ${catalog.classes.length} classes, ${catalog.classes.reduce((sum,c)=>sum+c.branches.length,0)} branches, ${catalog.classes.reduce((sum,c)=>sum+c.abilities.length,0)} ordinary abilities and ${catalog.classes.length} unique ultimates; all ${catalog.weapons.length} weapons, ${catalog.skills.length} skills, ${catalog.mutations.length} mutations, **${catalog.bosses.length} bosses**, ${catalog.arenas.length} arenas, ${catalog.supplies.length} supplies and ${catalog.upgrades.length} upgrades; ${Object.keys(english.stat).length} stat labels; and every attack kind used by the current content catalog.
<!-- localization-counts:end -->`;
if (!document.includes('<!-- localization-counts:start -->') || !document.includes('<!-- localization-counts:end -->')) throw new Error('Localization document is missing its count markers');
document = document.replace(/<!-- localization-counts:start -->[\s\S]*?<!-- localization-counts:end -->/, countBlock);
await writeFile(docPath, document);
console.log(JSON.stringify({ locales: ids.length, messageCounts: sources }, null, 2));
