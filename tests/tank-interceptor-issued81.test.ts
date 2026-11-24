import rangerEdition from './fixtures/summoner-issued101-bindings.json';
import formationEdition from './fixtures/summoner-issued100-bindings.json';
import bondEdition from './fixtures/summoner-issued99-bindings.json';
import cohortEdition from './fixtures/swordsman-issued98-bindings.json';
import pursuitEdition from './fixtures/swordsman-issued97-bindings.json';
import replyEdition from './fixtures/swordsman-issued96-bindings.json';
import measuredEdition from './fixtures/bard-issued95-bindings.json';
import entranceEdition from './fixtures/bard-issued94-bindings.json';
import lamentEdition from './fixtures/bard-issued93-bindings.json';
import conductorEdition from './fixtures/bard-issued92-bindings.json';
import hunterEdition from './fixtures/assassin-issued91-bindings.json';
import infiltratorEdition from './fixtures/assassin-issued90-bindings.json';
import duelistEdition from './fixtures/assassin-issued89-bindings.json';
import volatileEdition from './fixtures/mage-issued88-bindings.json';
import spatialEdition from './fixtures/mage-issued87-bindings.json';
import mageEdition from './fixtures/mage-issued86-bindings.json';
import preventiveEdition from './fixtures/medic-issued85-bindings.json';
import responseEdition from './fixtures/medic-issued84-bindings.json';
import lateMedicEdition from './fixtures/medic-issued83-bindings.json';
import medicEdition from './fixtures/medic-issued82-bindings.json';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { interceptorIds } from '../src/shared/tank-interceptor.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/tank-interceptor-issued81-bindings.json';

const raw=readFileSync(new URL('./fixtures/tank-interceptor-issued81.json',import.meta.url),'utf8');
const issued=JSON.parse(raw);
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');

test('the issued Bulwark fittings edition restores its 299 exact local builds',()=>{
  assert.equal(PROTOCOL, 102);
  assert.equal(issued.protocol,81);
  assert.equal(issued.sourceCommit,binding.sourceCommit);
  assert.equal(issued.contentRevision,binding.sourceRevision);
  assert.equal(sha(raw.replaceAll('\r\n','\n')),binding.fixtureSha256);
  assert(issued.controlledLocalFixture&&!issued.onlineProof&&!issued.privateRecordsRead);
  const original=data.specializationSkills.slice(0,82);
  assert.deepEqual(original.map(node=>node.id),issued.issuedSpecializationIds);
  assert.equal(sha(JSON.stringify({...data,specializationSkills:original})),issued.contentRevision);
  assert.deepEqual(data.generalSkills.map(node=>node.id),issued.issuedGeneralIds);
  assert.deepEqual(issued.classes.map((row:{classId:string})=>row.classId),implementedClassIds);
  assert.equal(issued.lateBulwarkHybrids.length,48);
  assert.equal(issued.lateBulwarkTalents.length,8);
  const fixtures=[
    issued.individual,issued.classes,issued.lineworker,issued.wallHybrids,issued.interceptorHybrids,
    issued.bastionHybrids,issued.lateBastionHybrids,issued.lateBulwarkHybrids,issued.lateBulwarkTalents,
  ].flat();
  assert.equal(fixtures.length,binding.ownershipFixtures);
  for(const row of fixtures){
    const checkpoint=structuredClone(row.checkpoint);
    const restored=Game.restoreOffline(checkpoint);
    const {skills,classId,totalSp,weapon,coins,ammo,health,maxHealth}=restored.players.get('solo')!;
    assert.deepEqual({skills,classId,totalSp,weapon,coins,ammo,health,maxHealth,phase:restored.phase},row.restored,row.name);
    assert.deepEqual(checkpoint,row.checkpoint);
    const migrated=restored.offlineCheckpoint()!;
    assert(migrated.practiceOnly);
    assert.equal(migrated.protocolVersion,PROTOCOL);
    assert.equal(migrated.contentRevision,CONTENT_REVISION);
    assert.deepEqual(restored.classCues(),[]);
  }
});

test('issued 81 rejects future Interceptor ownership and mismatched trust or version',()=>{
  for(const [previous,later] of [
    [interceptorIds.crossing,interceptorIds.returns],[interceptorIds.standfast,interceptorIds.offset],
  ]){
    const checkpoint=issued.individual.find((row:{name:string})=>row.name===previous).checkpoint;
    const more=structuredClone(checkpoint);
    more.player.skills.push(later);
    assert.throws(()=>Game.restoreOffline(more),/versionMismatch/);
    for(const change of [
      {protocolVersion:80},{protocolVersion:82},{contentRevision:CONTENT_REVISION},
      {practiceOnly:false},{serverOnly:true},{players:[]},{transactions:[]},
    ])assert.throws(()=>Game.restoreOffline({...checkpoint,...change}),/versionMismatch/);
  }
});

test('issued 81 retains both HUD layouts, three remaps and all twelve local histories',()=>{
  assert.deepEqual(issued.profiles.map((row:{layout:string})=>row.layout),['grouped','separate']);
  for(const {profile,parsed,history} of issued.profiles){
    const actual=parseProfile(JSON.stringify(profile));
    assert.deepEqual(actual.settings,parsed.settings);
    assert.deepEqual(actual.controls,parsed.controls);
    assert.deepEqual(actual.runs,parsed.runs);
    assert.deepEqual(actual.runs.map(row=>row.classId),implementedClassIds);
    assert.deepEqual(actual.legacyCampaigns,history);
    assert(actual.practiceOnly&&!actual.verified);
    assert.equal(actual.contentRevision,CONTENT_REVISION);
    const wrong=history.flatMap((row:{id:string})=>[47,80,82].map(protocol=>({...row,id:protocol+'-'+row.id,protocol})));
    assert.deepEqual(practiceRecords({getItem:()=>JSON.stringify([...history,...wrong]),setItem:()=>assert.fail()}),history);
  }
});

test('the Interceptor fittings extend all fifteen issued 81 dictionaries',()=>{
  assert.equal(Object.keys(issued.dictionaries).length,15);
  const added=new Set([...binding.addedLocaleKeys,...rangerEdition.addedLocaleKeys, ...formationEdition.addedLocaleKeys, ...bondEdition.addedLocaleKeys, ...cohortEdition.addedLocaleKeys, ...pursuitEdition.addedLocaleKeys, ...replyEdition.addedLocaleKeys, ...measuredEdition.addedLocaleKeys, ...entranceEdition.addedLocaleKeys, ...lamentEdition.addedLocaleKeys, ...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys, ...duelistEdition.addedLocaleKeys, ...volatileEdition.addedLocaleKeys, ...spatialEdition.addedLocaleKeys, ...mageEdition.addedLocaleKeys, ...preventiveEdition.addedLocaleKeys, ...responseEdition.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys]);
  assert.equal(binding.addedLocaleKeys.length,10);
  for(const [id,digest] of Object.entries(issued.dictionaries)){
    const locale=JSON.parse(readFileSync(new URL('../locales/'+id+'.json',import.meta.url),'utf8'));
    for(const key of added)assert(Object.hasOwn(locale.messages,key),key);
    const original=Object.fromEntries(Object.entries(locale.messages).filter(([key])=>!added.has(key)));
    assert.equal(sha(JSON.stringify(original)),digest,id);
  }
});
