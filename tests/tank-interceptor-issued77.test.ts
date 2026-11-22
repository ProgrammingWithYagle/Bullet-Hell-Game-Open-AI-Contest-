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
import interceptorFittings from './fixtures/tank-interceptor-issued81-bindings.json';
import bulwarkFittings from './fixtures/tank-bulwark-issued80-bindings.json';
import lateBinding from './fixtures/tank-bastion-issued79-bindings.json';
import later from './fixtures/tank-bastion-issued78-bindings.json';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { lineworkIds } from '../src/shared/heavy-linework.ts';
import {interceptorIds} from '../src/shared/tank-interceptor.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import { validControls } from '../src/client/input-bindings.ts';

const issued = JSON.parse(
  readFileSync(new URL('./fixtures/tank-interceptor-issued77.json', import.meta.url), 'utf8'),
);

test('exact edition 77 restores72 issued techniques, twelve classes, nine Lineworker builds and twelve Tank hybrids', () => {
  assert.equal(issued.protocol, 77);
  assert.equal(
    issued.contentRevision,
    '44b615d4bdf78e469135ba5c30b84a0af5c07b0681c46856227daf633e9347be',
  );
  assert.deepEqual(
    issued.issuedSpecializationIds,
    data.specializationSkills
      .filter((skill) => issued.issuedSpecializationIds.includes(skill.id))
      .map((skill) => skill.id),
  );
  assert.deepEqual(
    issued.issuedGeneralIds,
    data.generalSkills.map((skill) => skill.id),
  );
  assert.equal(issued.issuedGeneralIds.length, 4);
  assert.equal(issued.individual.length, 72);
  assert.deepEqual(
    issued.classes.map((row: { classId: string }) => row.classId),
    implementedClassIds,
  );
  assert.equal(issued.lineworker.length, 9);
  assert.equal(
    issued.lineworker.filter((row: { purchases: string[] }) =>
      row.purchases.includes(lineworkIds.reserve),
    ).length,
    3,
  );
  assert.equal(issued.tankHybrids.length,12);
  for (const row of [...issued.individual, ...issued.classes, ...issued.lineworker, ...issued.tankHybrids]) {
    const input = structuredClone(row.checkpoint);
    const game = Game.restoreOffline(input);
    const player = game.players.get('solo')!;
    const { classId, skills, weapon, ammo, coins, health, maxHealth, totalSp } = player;
    assert.deepEqual(
      { classId, skills, weapon, ammo, coins, health, maxHealth, totalSp, phase: game.phase },
      row.restored,
      row.name,
    );
    assert.equal(game.shots.size, 0);
    assert.equal(game.kitStatus(player.id).lineworkConnection, undefined);
    const checkpoint = game.offlineCheckpoint()!;
    assert(checkpoint.practiceOnly);
    assert.equal(checkpoint.protocolVersion, PROTOCOL);
    assert.equal(checkpoint.contentRevision, CONTENT_REVISION);
    assert.deepEqual(input, row.checkpoint);
  }
});

test('edition 77 profiles retain both HUD layouts, all three remaps and all twelve local records', () => {
  assert.deepEqual(
    issued.profiles.map((row: { layout: string }) => row.layout),
    ['grouped', 'separate'],
  );
  for (const row of issued.profiles) {
    const parsed = parseProfile(JSON.stringify(row.profile));
    assert(validControls(parsed.controls));
    assert.deepEqual(parsed.controls, row.parsed.controls);
    assert.deepEqual(parsed.settings, row.parsed.settings);
    assert.deepEqual(parsed.runs, row.parsed.runs);
    assert.deepEqual(parsed.legacyCampaigns, row.history);
    assert.deepEqual(
      parsed.runs.map((run) => run.classId),
      implementedClassIds,
    );
    assert.equal(parsed.contentRevision, CONTENT_REVISION);
    assert(parsed.practiceOnly && !parsed.verified);
  }
  const history = issued.profiles[0].history;
  const readHistory = (rows: unknown[]) =>
    practiceRecords({
      getItem: () => JSON.stringify(rows),
      setItem: () => assert.fail('Read only'),
    });
  assert.deepEqual(readHistory(history), history);
  for (const row of history) {
    assert.deepEqual(
      readHistory([
        row,
        ...[47, 76, 78].map((protocol) => ({ ...row, id: 'wrong-' + protocol, protocol })),
        { ...row, id: 'verified-' + row.id, verified: true },
      ]),
      [row],
    );
  }
});

test('edition 77 rejects future Interceptor ownership, mismatched editions and server envelopes', () => {
  const issuedCheckpoint = issued.lineworker[0].checkpoint;
  const future = structuredClone(issuedCheckpoint);
  future.player.skills.push(interceptorIds.entry);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 76 },
    { protocolVersion: 78 },
    { contentRevision: CONTENT_REVISION },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
  ])
    assert.throws(() => Game.restoreOffline({ ...issuedCheckpoint, ...patch }), /versionMismatch/);
});

for(const choice of ['forward','crossing','standfast'] as const)test('current Interceptor '+choice+' saves only actual local ownership, never a live screen',()=>{
 const g=new Game({mode:'endless',difficulty:'normal'});g.encounter=9;const p=g.addPlayer('solo','Local current ownership','tank'),ids:string[]=[];
 function buy(id:string){if(p.skills.includes(id))return;const node=[...data.skills,...data.specializationSkills].find(s=>s.id===id);assert(node);if(node.prerequisite)buy(node.prerequisite);assert(g.transact(p.id,{id,kind:'skill',item:id}).ok);ids.push(id);}
 buy(choice==='forward'?interceptorIds.entry:interceptorIds[choice]);const checkpoint=g.offlineCheckpoint()!;assert(checkpoint.practiceOnly);assert.equal(checkpoint.protocolVersion,PROTOCOL);assert.equal(checkpoint.contentRevision,CONTENT_REVISION);
 const restored=Game.restoreOffline(structuredClone(checkpoint)),owner=restored.players.get('solo')!;assert.deepEqual(owner.skills,ids);assert.equal(restored.shots.size,0);assert.equal(restored.classCues().length,0);assert.equal(restored.interceptor.stateSnapshot(owner.id),undefined);assert.equal(restored.kitStatus(owner.id).interceptorPhase,'idle');assert.equal(restored.kitStatus(owner.id).interceptorCanArm,false);
});
for(const id of Object.values(interceptorIds))test('exact issued77 rejects later ownership '+id,()=>{const old=structuredClone(issued.tankHybrids[0].checkpoint);old.player.skills.push(id);assert.throws(()=>Game.restoreOffline(old),/versionMismatch/);});

test('all fifteen actual issued77message dictionaries remain exact under the explicit later-key projection',()=>{const keys=new Set([...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys, ...duelistEdition.addedLocaleKeys, ...volatileEdition.addedLocaleKeys, ...spatialEdition.addedLocaleKeys, ...mageEdition.addedLocaleKeys, ...preventiveEdition.addedLocaleKeys, ...responseEdition.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys,...bulwarkFittings.addedLocaleKeys,...lateBinding.addedLocaleKeys,...later.addedLocaleKeys,"pathway.tank-interceptor-1.name","ui.tank.classFieldManual","ui.tank.classManualHelp","ui.tank.interceptPrepare","ui.tank.interceptWinding","ui.tank.interceptLaunch","ui.tank.interceptBrace","ui.tank.interceptBrake","ui.tank.interceptBlocked","ui.tank.interceptHelp","ui.tank.crossingHelp","ui.tank.standfastHelp","skill.tank-interceptor-1.name","skill.tank-interceptor-1.description","pathway.tank-interceptor-1.summary","skill.tank-interceptor-crossing-1.name","skill.tank-interceptor-crossing-1.description","pathway.tank-interceptor-crossing-1.summary","skill.tank-interceptor-standfast-1.name","skill.tank-interceptor-standfast-1.description","pathway.tank-interceptor-standfast-1.summary"]);for(const [locale,expected]of Object.entries(issued.localeHashes)){const current=JSON.parse(readFileSync(new URL('../locales/'+locale+'.json',import.meta.url),'utf8')),old=Object.fromEntries(Object.entries(current.messages).filter(([key])=>!keys.has(key)));assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),expected,locale);}});
