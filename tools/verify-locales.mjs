import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {smallWakesIds} from '../content/source/small-wakes.mjs';
import {smallWakesMessages} from '../locales/source/small-wakes.mjs';
import { wardenMessages } from '../locales/source/warden-patrol.mjs';
import { classTalentMessages } from '../locales/source/class-talents.mjs';
import { english } from '../locales/source/en.mjs';
import additional from '../locales/source/additional.mjs';
import { difficultyRuleMessages } from '../locales/source/difficulty-rules.mjs';
import { skillMapMessages } from '../locales/source/skill-map.mjs';
import { earlyWatchMessages } from '../locales/source/early-watch.mjs';
import { bossExpansionIds, expansionMessages } from '../locales/source/boss-expansion.mjs';
import { interfaceMessages } from '../locales/source/interface-expansion.mjs';
import { contractMessages } from '../locales/source/contract-ui.mjs';
import { suppliesMessages } from '../locales/source/supplies-ui.mjs';
import { capacityMessages, playtestMessages } from '../locales/source/capacity-ui.mjs';
import { recoveryMessages } from '../locales/source/recovery-ui.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const launchLocales = ['en','zh-Hans','zh-Hant','ja','es','fr','de','pt-BR','ru','hi','ar','bn','id','ur','ko'];
const placeholderPattern = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
export function placeholders(text) {
  return [...new Set([...text.matchAll(placeholderPattern)].map(x => x[1]))].sort();
}
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const kind = value => typeof value === 'string' ? 'text' : value && typeof value === 'object' && !Array.isArray(value) ? 'plural' : 'invalid';
const tokens = value => kind(value) === 'text' ? placeholders(value) : kind(value) === 'plural' ? [...new Set(Object.values(value.forms ?? {}).filter(x=>typeof x==='string').flatMap(placeholders))].sort() : [];
const commonEnglishKeys = new Set(['ui.brand','template.effect','template.effectFlat','template.effectMultiplier','template.effectPercent','template.percent','template.perSecond','template.seconds']);
// Explicit cognates and loanwords. An unlisted verbatim English message is an error.
const cognates = {
  es:['ui.variantBrutal','branch.control','difficulty.normal','threat.1','ui.audio','ui.no'],
  fr:['attack.charge.name','branch.bastion','branch.endurance','branch.protection','branch.suppression','branch.triage','class.assassin.name','class.mage.name','class.tank.name','difficulty.normal','stat.grade','supply.antidote.name','threat.1','threat.2','threat.4','threat.8','ui.audio','ui.boss','ui.leaderboardScore','ui.pause','ui.phase','ui.version'],
  de:['branch.triage','difficulty.baby','difficulty.normal','stat.radius','threat.1','ui.audio','ui.boss','ui.pause','ui.phase','ui.region','ui.version','ui.vibration'],
  'pt-BR':['difficulty.normal','threat.1'],
  id:['attack.spiral.name','difficulty.normal','stat.radius','threat.1','ui.abstain','ui.audio']
};

function expectedContentKeys(content) {
  const keys = [];
  for (const [field, prefix] of [['weapons','weapon'],['skills','skill'],['mutations','mutation'],['bosses','boss'],['arenas','arena'],['supplies','supply'],['upgrades','upgrade'],['modes','mode']]) {
    for (const item of content[field]) keys.push(`${prefix}.${item.id}.name`,`${prefix}.${item.id}.description`);
  }
  for (const item of content.classes) {
    keys.push(`class.${item.id}.name`,`class.${item.id}.role`,`class.${item.id}.lore`);
    for (const branch of item.branches) keys.push(`branch.${branch.id}`);
    for (const ability of [...item.abilities,item.ultimate]) keys.push(`ability.${ability.id}.name`,`ability.${ability.id}.description`);
  }
  for (const item of content.difficulties) keys.push(`difficulty.${item.id}`);
  for (let n=1;n<=content.threats.length;n++) keys.push(`threat.${n}`);
  const effects = new Set([
    ...content.skills.flatMap(x=>Object.keys(x.effects)), ...content.mutations.flatMap(x=>Object.keys(x.modifiers)),
    ...content.upgrades.map(x=>x.effect)
  ]);
  for (const effect of effects) keys.push(`stat.${effect}`);
  for (const attack of new Set(content.bosses.flatMap(b=>b.phases.flatMap(p=>p.attacks.map(a=>a.kind))))) {
    keys.push(`attack.${attack}.name`,`attack.${attack}.description`);
  }
  return [...new Set(keys)].sort();
}

export function validateOne(document, canonical, content, locale) {
  const errors = [];
  const fail = (message) => errors.push(`${locale}: ${message}`);
  if (!document || typeof document !== 'object' || Array.isArray(document)) return [`${locale}: invalid document`];
  const meta = document.meta;
  const info = content.locales.find(x=>x.id===locale);
  if (!meta || typeof meta !== 'object') fail('missing metadata');
  else {
    if (meta.schemaVersion !== 1) fail('invalid schemaVersion');
    if (meta.locale !== locale || !launchLocales.includes(meta.locale)) fail('invalid locale metadata');
    if (meta.nativeName !== info?.name) fail('invalid nativeName metadata');
    if (meta.direction !== (['ar','ur'].includes(locale)?'rtl':'ltr')) fail('invalid direction metadata');
    if (meta.messageFormat !== 'grave-accord-messages-v1' || meta.sourceLocale !== 'en') fail('invalid message format metadata');
    if (meta.contentVersion !== content.rules.contentVersion) fail('contentVersion mismatch');
    if (meta.authorship !== 'AI-authored') fail('authorship must identify AI-authored text');
    if (!['pending','reviewed'].includes(meta.nativeSpeakerReview) || !['pending','reviewed'].includes(meta.uiLayoutReview)) fail('invalid review metadata');
    if (meta.brand !== 'Grave Accord') fail('invalid brand metadata');
    const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories.slice().sort();
    if (!Array.isArray(meta.pluralCategories) || !same([...meta.pluralCategories].sort(),categories)) fail('plural category metadata mismatch');
  }
  const messages = document.messages;
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return [...errors,`${locale}: invalid messages object`];
  const canonicalMessages = canonical.messages;
  const actualKeys=Object.keys(messages).sort(), requiredKeys=Object.keys(canonicalMessages).sort();
  if (locale==='en') {
    const sourceKeys = new Set([
      ...Object.entries(english).flatMap(([group,rows])=>Object.keys(rows).map(k=>`${group}.${k}`)),
      ...Object.keys(additional.en),
      ...Object.keys(expansionMessages('en')),
      ...Object.keys(earlyWatchMessages('en')),
      ...Object.keys(smallWakesMessages('en')),
      ...Object.keys(classTalentMessages('en',content)),
      ...Object.keys(wardenMessages('en')),
      ...Object.keys(skillMapMessages('en')),
      ...Object.keys(difficultyRuleMessages('en')),
      ...Object.keys(interfaceMessages('en')),
      ...Object.keys(contractMessages('en')),
      ...Object.keys(suppliesMessages('en')),
      ...Object.keys(capacityMessages('en')),
      ...Object.keys(playtestMessages('en')),
      ...Object.keys(recoveryMessages('en')),
      ...content.skills.filter(x=>x.sourceSkillId&&x.sourceSkillId!==x.id).map(x=>`skill.${x.id}.name`),
      ...['players','encounters','seconds'].map(k=>`count.${k}`),
      ...['weapons','skills','mutations','upgrades'].flatMap(group=>{
        const prefix={weapons:'weapon',skills:'skill',mutations:'mutation',upgrades:'upgrade'}[group];
        return content[group].map(x=>`${prefix}.${x.id}.description`);
      })
    ]);
    if (!same([...sourceKeys].sort(),actualKeys)) fail('canonical key set differs from source specification');
  }
  const missing=requiredKeys.filter(x=>!Object.hasOwn(messages,x));
  const extra=actualKeys.filter(x=>!Object.hasOwn(canonicalMessages,x));
  if (missing.length) fail(`missing keys: ${missing.join(', ')}`);
  if (extra.length) fail(`unexpected keys: ${extra.join(', ')}`);
  for (const key of expectedContentKeys(content)) if (!Object.hasOwn(messages,key)) fail(`missing content coverage: ${key}`);
  for (const key of ['ui.language','ui.ultimate','ui.changelog','ui.leaderboardSharedRank','ui.endlessSummary','ui.reconnecting','ui.highContrast','ui.exportProfile','ui.secretOffer']) {
    if (!Object.hasOwn(messages,key)) fail(`missing feature coverage: ${key}`);
  }
  const expectedCategories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories.slice().sort();
  const expandedSource = {...smallWakesMessages(locale),...expansionMessages(locale), ...earlyWatchMessages(locale),...skillMapMessages(locale),...difficultyRuleMessages(locale),...classTalentMessages(locale,content),...wardenMessages(locale)};
  for (const [key,text] of Object.entries(recoveryMessages(locale))) {
    if (messages[key] !== text) fail(`recovery UI source mismatch at ${key}`);
  }
  for (const [key,text] of Object.entries(expandedSource)) {
    if (messages[key] !== text) fail(`boss expansion source mismatch at ${key}`);
  }
  const bossDescriptions = content.bosses.map(b=>messages[`boss.${b.id}.description`]).filter(x=>typeof x==='string');
  if (new Set(bossDescriptions).size !== bossDescriptions.length) fail('boss mechanic descriptions must be distinct');
  const bossNames = content.bosses.map(b=>messages[`boss.${b.id}.name`]).filter(x=>typeof x==='string');
  if (new Set(bossNames).size !== bossNames.length) fail('boss names must be distinct');
  function checkText(text, key) {
    if (typeof text!=='string' || text.length===0 || text!==text.trim()) { fail(`invalid text at ${key}`); return; }
    if (text!==text.normalize('NFC')) fail(`non-NFC text at ${key}`);
    if (/[\u0000-\u001F\u007F\uFFFD]/u.test(text)) fail(`control or replacement character at ${key}`);
    if (/[{}]/u.test(text.replace(placeholderPattern,''))) fail(`malformed placeholder at ${key}`);
    if (/\b(?:TODO|TBD|TRANSLATE_ME)\b/u.test(text)) fail(`unfinished text at ${key}`);
  }
  for (const [key,value] of Object.entries(messages)) {
    if (!/^[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z0-9_.-]+$/u.test(key)) fail(`invalid flat key ${key}`);
    const valueKind=kind(value), reference=canonicalMessages[key];
    if (valueKind==='invalid') { fail(`invalid message type at ${key}`); continue; }
    if (reference !== undefined && valueKind!==kind(reference)) fail(`message type mismatch at ${key}`);
    if (reference !== undefined && !same(tokens(value),tokens(reference))) fail(`placeholder parity mismatch at ${key}`);
    if (valueKind==='text') {
      checkText(value,key);
      if (locale!=='en' && value===reference && !commonEnglishKeys.has(key) && !(cognates[locale]??[]).includes(key)) fail(`untranslated English copy at ${key}`);
    } else {
      if (!same(Object.keys(value).sort(),['forms','plural']) || value.plural!=='count' || !value.forms || typeof value.forms!=='object' || Array.isArray(value.forms)) { fail(`invalid plural structure at ${key}`); continue; }
      if (!same(Object.keys(value.forms).sort(),expectedCategories)) fail(`missing or unexpected plural forms at ${key}`);
      for (const [category,text] of Object.entries(value.forms)) {
        checkText(text,`${key}/${category}`);
        if (typeof text==='string' && !same(placeholders(text),['count'])) fail(`plural branch placeholder mismatch at ${key}/${category}`);
      }
    }
  }
  return errors;
}

export async function verifyLocales(root=defaultRoot) {
  const content=JSON.parse(await readFile(path.join(root,'content/catalog.json'),'utf8'));
  const documents={};
  const errors=[];
  const originalBossIds = ['constable','courier','pallbearer','matron','alchemist','bellringer','stitchwright','choir','engine','regent','uncounted'];
  if (!same(content.bosses.map(x=>x.id).sort(),[...originalBossIds,...bossExpansionIds,...smallWakesIds,'ashen-usher','brass-toad','ragpicker-kite'].sort())) errors.push('boss localization roster differs from content roster');
  if (new Set(bossExpansionIds).size !== bossExpansionIds.length) errors.push('duplicate expansion boss ID');
  if (!same(content.locales.map(x=>x.id).sort(),[...launchLocales].sort())) errors.push('content launch locale list mismatch');
  for (const locale of launchLocales) {
    try { documents[locale]=JSON.parse(await readFile(path.join(root,'locales',`${locale}.json`),'utf8')); }
    catch (error) { errors.push(`${locale}: unable to load catalog: ${error.message}`); }
  }
  if (!documents.en) return {ok:false,errors};
  for (const [locale,document] of Object.entries(documents)) errors.push(...validateOne(document,documents.en,content,locale));
  return { ok:errors.length===0, localeCount:Object.keys(documents).length,
    bossCount:content.bosses.length, expansionBossCount:bossExpansionIds.length,
    keysPerLocale:Object.keys(documents.en.messages).length,
    totalMessages:Object.values(documents).reduce((n,x)=>n+Object.keys(x.messages).length,0),
    contentCoverageKeys:expectedContentKeys(content).length,
    translationReview:'AI-authored; native-speaker and runtime layout review pending',errors,
    _documents:documents,_content:content };
}

function negativeTests(report) {
  const reference=report._documents.en, content=report._content, original=report._documents.ar;
  const cases=[
    ['missing key',x=>delete x.messages['ui.play'],/missing keys/],
    ['extra key',x=>x.messages['ui.notReal']='نص',/unexpected keys/],
    ['wrong placeholder',x=>x.messages['ui.version']='الإصدار {wrong}',/placeholder parity/],
    ['malformed braces',x=>x.messages['ui.version']='الإصدار {version',/malformed placeholder/],
    ['wrong type',x=>x.messages['ui.play']=12,/invalid message type/],
    ['missing Arabic plural',x=>delete x.messages['count.players'].forms.two,/plural forms/],
    ['plural branch token',x=>x.messages['count.players'].forms.two='لاعبان',/plural branch placeholder/],
    ['wrong RTL metadata',x=>x.meta.direction='ltr',/direction metadata/],
    ['English placeholder copy',x=>x.messages['ui.errorNetwork']=reference.messages['ui.errorNetwork'],/untranslated English copy/],
    ['missing content key',x=>delete x.messages['skill.soldier-ballistics-1.name'],/missing content coverage/],
    ['missing expanded boss',x=>delete x.messages['boss.tollkeeper.description'],/missing content coverage/],
    ['generic duplicated boss text',x=>x.messages['boss.tollkeeper.description']=x.messages['boss.lantern-warden.description'],/descriptions must be distinct/],
    ['changed expanded source text',x=>x.messages['boss.tollkeeper.description']='نص مختلف',/boss expansion source mismatch/]
  ];
  for (const [name,change,expect] of cases) {
    const copy=structuredClone(original);change(copy);
    assert(validateOne(copy,reference,content,'ar').some(x=>expect.test(x)),`negative test failed: ${name}`);
  }
  const damagedEnglish=structuredClone(reference);
  delete damagedEnglish.messages['ui.play'];
  assert(validateOne(damagedEnglish,damagedEnglish,content,'en').some(x=>/canonical key set/.test(x)),'canonical deletion was not detected');
  for(const locale of launchLocales) {
    const rule=new Intl.PluralRules(locale), forms=report._documents[locale].messages['count.players'].forms;
    for(const n of [0,1,2,3,5,11,21,101,1000000,1.5]) assert(Object.hasOwn(forms,rule.select(n)),`${locale}: count ${n}`);
  }
  return {negativeScenarios:cases.length+1,pluralSelectionSamples:launchLocales.length*10};
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const rootFlag=process.argv.indexOf('--root');
  const report=await verifyLocales(rootFlag>=0?path.resolve(process.argv[rootFlag+1]):defaultRoot);
  if (report.ok && process.argv.includes('--self-test')) report.selfTests=negativeTests(report);
  delete report._documents;delete report._content;
  console.log(JSON.stringify(report,null,2));
  if (!report.ok) process.exitCode=1;
}
