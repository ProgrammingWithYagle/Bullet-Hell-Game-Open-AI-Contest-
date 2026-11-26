import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{spawnSync}from'node:child_process';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',head='f3e1f1d6d1614feca70c45615d51e6b4f4ec8723';
const git=a=>{const v=spawnSync('git',['-c','core.bare=false',...a],{cwd:root,encoding:'utf8'});assert.equal(v.status,0,v.stderr);return v.stdout.trim();};assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['status','--porcelain']),'');
const load=p=>import(pathToFileURL(root+'/src/shared/'+p+'.ts').href),{createPracticeGame}=await load('practice-start'),{data}=await load('game'),{encounterPhases,encounterVariant}=await load('encounter-policy'),{PROTOCOL,CONTENT_REVISION}=await load('protocol');
function capture(g){
 const rows=[];
 for(const q of g.bossCues())if(q.kind!=='arena-lava'&&q.kind!=='sack'&&!q.kind.endsWith('-walk')&&!q.kind.endsWith('-patrol'))rows.push({key:'cue:'+q.kind+':'+q.id,kind:q.kind,id:q.id,at:q.at,until:q.until});
 for(const q of g.warnings)rows.push({key:'warning:'+q.id,kind:'warning-'+q.kind,id:q.id,at:q.at,until:q.until});
 for(const q of g.shots.values())if(q.owner==='hostile')rows.push({key:'shot:'+q.id,kind:'hostile-shot',id:q.id});
 for(const q of g.fields)if(q.owner==='hostile')rows.push({key:'field:'+q.id,kind:'hostile-field',id:q.id,until:q.until});
 for(const q of g.minions.actors.values())rows.push({key:'minion:'+q.id,kind:'minion-'+q.kind,id:q.id});
 if(g.boss.id==='lantern-warden')for(const[q,s]of g.signatures.entries())rows.push({key:'signature:'+q,kind:'warden-signature',value:JSON.stringify(s)});
 return rows;
}
const rows=[];let ticks=0;
for(const boss of data.bosses)for(const difficulty of data.difficulties)for(const requestedForm of['normal','brutal','crazed']){
 const effective=encounterVariant(difficulty.id,requestedForm),phases=encounterPhases(boss.id,effective);if(phases.length<2)continue;
 const options={mode:'endless',openingBossId:boss.id,difficulty:difficulty.id,seed:829,openingArenaId:boss.preferredArena};
 const control=createPracticeGame(options,'Mara','soldier',requestedForm),transition=createPracticeGame(options,'Mara','soldier',requestedForm);
 for(const g of[control,transition]){g.start();g.boss.deadline=1e9;for(const p of g.players.values())p.invulnerableUntil=1e9;}
 let before=[];
 for(let n=0;n<1800&&!before.length;n++){control.step();transition.step();ticks+=2;before=capture(control);}
 assert(before.length,'No committed attack witness: '+boss.id);assert.deepEqual(capture(transition),before);
 transition.boss.health=transition.boss.maxHealth*(phases[1].healthThreshold-.01);control.step();transition.step();ticks+=2;assert.equal(transition.boss.phase,1);
 const continuing=capture(control),after=capture(transition),expected=before.filter(q=>continuing.some(p=>p.key===q.key));
 const lost=expected.filter(q=>!after.some(p=>p.key===q.key));
 const changed=expected.filter(q=>q.kind==='warden-signature'&&after.some(p=>p.key===q.key&&p.value!==continuing.find(r=>r.key===q.key)?.value));
 rows.push({boss:boss.id,difficulty:difficulty.id,requestedForm,effectiveForm:effective,at:control.combatTick,prior:before,expectedContinuing:expected.length,lost,changedSignatures:changed.length,assist:!!transition.accord});
}
const report={passed:true,kind:'Read-only current phase-cancellation characterization, not an acceptance gate',head,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,observedTicks:ticks,casesWithLostCommittedWork:rows.filter(r=>r.lost.length||r.changedSignatures).length,lostCommittedItems:rows.reduce((n,r)=>n+r.lost.length,0),changedWardenSignatures:rows.reduce((n,r)=>n+r.changedSignatures,0),rows,limits:['Paired stationary invulnerable actual-Game first-phase witnesses across every current identity, global difficulty and requested form.','An item must still exist in the no-transition control one tick later to count as lost, excluding natural expiry.','This is pre-change characterization, not a human clear, rendered/balance/device/performance or global completion claim.']};
fs.writeFileSync(new URL('./baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
