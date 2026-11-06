import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Session} from '../src/client/session.ts';
const [audience,scope]=process.argv.slice(2);assert(['public','testing'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
async function wait(check:()=>boolean){const end=Date.now()+12000;while(!check()){assert(Date.now()<end,'Frozen scenario did not replicate');await new Promise(r=>setTimeout(r,20));}}
const a=new Session(manifest.endpoint),b=new Session(manifest.endpoint);let receipt;
try{
 const options={name:'Scenario probe',classId:'soldier' as const,mode:'short' as const,difficulty:'normal',freePlay:{scenarioId:'ward-approach' as const}};
 await a.connect(options);await b.connect({...options,name:'Scenario partner',classId:'medic'},{roomId:a.room!.roomId});await wait(()=>b.view?.players.length===2);assert.equal(b.view!.objective?.status,'briefing');a.start();
 await wait(()=>a.view?.objective?.status==='warning'&&b.view?.objective?.status==='warning');assert.deepEqual(a.view!.objective,b.view!.objective);assert(a.view!.objective!.portals.every(p=>p.at-a.view!.combatTick>=30));
 await wait(()=>b.view!.minions.length>0);const view=b.view!;assert.equal(view.arenaId,'triage-yard');assert(view.run.customized);assert.equal(view.objective?.defeated,0);assert(view.players.every(p=>p.progress.clears===0));assert.equal(view.campaignBank,null);assert(view.boss.health===0);
 receipt={checkedAt:new Date().toISOString(),passed:true,sourceCommit:manifest.sourceCommit,audience,endpoint:manifest.endpoint,peers:2,scenarioId:view.objective!.id,arenaId:view.arenaId,fullWarningObserved:true,actualOrdinaryActors:view.minions.length,liveOrdinaryObjectiveReplicated:true,bossSlotInert:true,noClearOrBankManufactured:true,customized:true,probeRoomsClosed:true,limits:['Bounded frozen-server entry/warning/actor replication only; completion and record exclusion are covered by separate authoritative tests.','No rendered/human/device/final-balance acceptance is claimed.']};
}finally{await a.close();await b.close();}
fs.writeFileSync(scope+'/scenario-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
