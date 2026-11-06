import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { CONTENT_REVISION, PROTOCOL } from '../src/shared/protocol.ts';
import { freshProfile, parseProfile, summary, type RunReceipt } from '../src/client/profile.ts';
import { practiceRecords, type PracticeCampaignRecord } from '../src/client/progress.ts';
const issued='8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110';

test('The issued eleven-class local chapter preserves Nela’s identity and proofs, rejects invented Alchemist state, and cannot be imported as online authority',()=>{
  const g=new Game({mode:'story'});g.addPlayer('p','Nela','ranger');
  const saved=g.offlineCheckpoint()!;saved.contentRevision=issued;saved.protocolVersion=48;
  const copy=Game.restoreOffline(structuredClone(saved));
  assert.equal(copy.players.get('solo')!.classId,'ranger');assert.deepEqual(copy.trainingFor('solo'),g.trainingFor('p'));
  assert.equal(copy.offlineCheckpoint()!.contentRevision,CONTENT_REVISION);
  for(const alter of [(s:typeof saved)=>{s.player.classId='alchemist';},(s:typeof saved)=>{s.player.skills.push('alchemist-mixtures-1');}]){
    const forged=structuredClone(saved);alter(forged);assert.throws(()=>Game.restoreOffline(forged));
  }
  assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),contentRevision:issued}));
});
test('Historical profiles retain original receipts and reject disciplines not present in each issued roster',()=>{
  const profile=freshProfile();profile.contentRevision=issued;
  const receipt:RunReceipt={runId:'nela',playerId:'p',mode:'endless',difficulty:'normal',classId:'ranger',clears:1,rescues:0,firstEncounter:0,campaignClears:0,bossIds:['constable'],teamClears:1,combatTicks:900,fullCampaign:false,memorial:false};
  profile.runs=[receipt];const copy=parseProfile(JSON.stringify(profile));
  assert.deepEqual(copy.runs,[receipt]);assert.equal(summary(copy).classes.ranger.clears,1);assert.equal(summary(copy).classes.alchemist.clears,0);
  for(const revision of [issued,'f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32','e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd','85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb','5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779']){
    const forged=structuredClone(profile);forged.contentRevision=revision;forged.runs[0].classId='alchemist';assert.throws(()=>parseProfile(JSON.stringify(forged)));
  }
});
test('Earlier clear records keep their issued revision and eleven-class roster while current Alchemist records use the new revision',()=>{
  const current:PracticeCampaignRecord={schemaVersion:1,id:'new-perrin',practiceOnly:true,verified:false,contentRevision:CONTENT_REVISION,protocol:PROTOCOL,mode:'short',difficulty:'normal',classId:'alchemist',completedEncounters:5,accords:0,combatTicks:5000,secret:'locked',memorial:false};
  const earlier={...current,id:'old-nela',protocol:48,contentRevision:issued,classId:'ranger' as const};
  const raw=JSON.stringify([earlier,current,{...earlier,id:'forged-class',classId:'alchemist'},{...earlier,id:'forged-protocol',protocol:47}]);
  const rows=practiceRecords({getItem:()=>raw,setItem:()=>assert.fail('Reading must preserve historical bytes')});
  assert.deepEqual(rows.map(r=>r.id),['old-nela','new-perrin']);assert.equal(rows[0].contentRevision,issued);
});
