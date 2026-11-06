import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';
const [audience, scope] = process.argv.slice(2);
assert(['testing','public'].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
const a=new Session(manifest.endpoint), b=new Session(manifest.endpoint);
async function wait(check:()=>boolean, label:string){
  const end=Date.now()+10000;
  while(!check()){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,20));}
}
try{
  const settings={name:'Iven review',classId:'bard' as const,mode:'short' as const,difficulty:'normal'};
  await a.connect(settings);
  await b.connect({...settings,name:'Bard partner'},{roomId:a.room!.roomId,kind:'freeplay'});
  await wait(()=>b.view?.players.length===2,'Bard roster did not replicate');
  assert(b.view!.players.every(p=>p.classId==='bard'&&p.weapon==='bard-0'&&p.kit.cadence===0&&p.sp===3));
  a.purchase({kind:'skill',item:'bard-performance-1'});
  await wait(()=>b.view?.players.some(p=>p.id===a.id&&p.skills.includes('bard-performance-1'))===true,'Bard SP purchase did not replicate');
  assert.equal(b.view!.players.find(p=>p.id===b.id)!.sp,3);
  a.start();await wait(()=>b.view?.phase==='combat','Bard did not enter combat');
  let sequence=0;
  a.input({...idleInput(),sequence:++sequence,e:true,ultimate:true});
  await wait(()=>b.view?.classCues.some(c=>c.kind==='bard-phrase'&&c.owner===a.id&&c.encore)===true,'Bard Encore did not replicate');
  assert.equal(b.view!.players.find(p=>p.id===b.id)!.kit.cadence,0);
  await a.close();
  await wait(()=>b.view?.players.some(p=>p.id===a.id&&!p.connected)===true,'Bard disconnect did not replicate');
  await wait(()=>b.view?.classCues.every(c=>!c.kind.startsWith('bard-')||c.owner!==a.id)===true,'Disconnected Bard retained a performance');
  const receipt={checkedAt:new Date().toISOString(),passed:true,audience,sourceCommit:manifest.sourceCommit,endpoint:manifest.endpoint,peers:2,classId:'bard',startingWeapon:'bard-0',ownedSpPurchase:true,cadenceVisible:true,encoreReplicated:true,ownerDisconnectCancelsPerformance:true,probeRoomsClosed:true,limits:['Frozen class entry/build/ability/cleanup probe; real hit-driven cadence and Story proof completion are separate source-authority tests.','No rendered, listening, device, native-language or final balance acceptance.']};
  await b.close();fs.writeFileSync(scope+'/bard-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await a.close();await b.close();}
