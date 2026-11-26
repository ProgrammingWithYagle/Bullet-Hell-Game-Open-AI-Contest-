import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Session} from '../src/client/session.ts';
import {data} from '../src/shared/game.ts';
const [audience,scope]=process.argv.slice(2);
assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
async function wait(check:()=>boolean){const end=Date.now()+12000;while(!check()){assert(Date.now()<end,'Frozen chapter/default did not replicate');await new Promise(r=>setTimeout(r,20));}}
const a=new Session(manifest.endpoint),b=new Session(manifest.endpoint),free=new Session(manifest.endpoint),custom=new Session(manifest.endpoint);
try{
  const options={name:'Chapter review',classId:'soldier' as const,mode:'story' as const,difficulty:'normal'};
  await a.connect(options);await b.connect({...options,name:'Chapter partner',classId:'medic'},{roomId:a.room!.roomId,kind:'story'});
  await wait(()=>a.view?.players.length===2&&b.view?.chapter?.id==='one-place-left');
  assert(b.view!.players.every(p=>p.sp===0&&p.training?.learned.length===0));assert.equal(b.view!.run.bossDeadlineMultiplier,2);
  const code=await a.lookupRoom(a.code);assert.equal(code.kind,'story');assert((await a.rooms('story')).some(r=>r.roomId===a.room!.roomId));assert(!(await a.rooms('freeplay')).some(r=>r.roomId===a.room!.roomId));
  a.start();await wait(()=>b.view?.phase==='combat');assert.equal(b.view!.boss.id,'constable');assert.equal(b.view!.arenaId,'gatehouse');assert.equal(b.view!.chapter?.stage,'combat');
  await a.close();await b.close();
  await free.connect({...options,mode:'short'});await wait(()=>free.view?.players.length===1);assert.equal(free.view!.chapter,undefined);assert.equal(free.view!.players[0].sp,3);assert.equal(free.view!.run.bossDeadlineMultiplier,1);
  free.purchase({kind:'skill',item:'soldier-command-1'});await wait(()=>free.view?.players[0].sp===2);assert(free.view!.players[0].skills.includes('soldier-command-1'));await free.close();
  await custom.connect({...options,mode:'short',freePlay:{bossDeadlineMultiplier:2}});await wait(()=>custom.view?.players.length===1);assert(custom.view!.run.customized);custom.start();await wait(()=>custom.view?.phase==='combat');
  const view=custom.view!,definition=data.bosses.find(b=>b.id===view.boss.id)!;
  assert(view.boss.deadline-view.combatTick>definition.timer*30*1.8);
  const receipt={checkedAt:new Date().toISOString(),passed:true,sourceCommit:manifest.sourceCommit,audience,endpoint:manifest.endpoint,storyPeers:2,freshStoryDefaultsToChapter:true,storySpZero:true,sharedConstableEntry:true,roomCategoriesSeparate:true,freePlaySpPurchase:true,freePlayHasNoChapter:true,customExtendedClock:true,probeRoomsClosed:true,limits:['Frozen entry/default/room-category/purchase checks only. Full chapter objective/proof/completion/recovery checks are separate authoritative tests.','No rendered/human/device/final-balance acceptance.']};
  await custom.close();fs.writeFileSync(scope+'/chapter-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await a.close();await b.close();await free.close();await custom.close();}
