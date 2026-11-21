import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../src/shared/game.ts';
import {idleInput,HZ} from '../src/shared/protocol.ts';
// A controlled authority comparison, not a human clear or a final balance verdict.
const rows=[];
for(const target of ['ordinary','boss'] as const)for(const movement of ['hold','relocate'] as const)for(const path of ['baseline','engineer-machinery-1','engineer-traps-1']){
  const g=new Game({mode:'short',seed:2209}),p=g.addPlayer('p','Tamsin','engineer');
  assert(g.transact(p.id,{id:'base',kind:'skill',item:'engineer-constructs-1'}).ok);
  if(path!=='baseline')assert(g.transact(p.id,{id:'path',kind:'skill',item:path}).ok);
  g.start();g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.health=g.boss.maxHealth=100000;
  p.x=p.oldX=800;p.y=p.oldY=700;p.invulnerableUntil=1e9;
  g.boss.x=target==='boss'?980:1250;g.boss.y=target==='boss'?700:200;
  if(target==='ordinary')g.minions.spawn(900001,{kind:'ordinary',x:920,y:700,health:100000,speed:0,radius:12,damage:0},0);
  const emitted=new Set<number>();let maxConstructs=0,peakCharges=0;
  for(let tick=0;tick<12*HZ;tick++){
    g.submitInput(p.id,{...idleInput(),sequence:tick+1,aim:0,q:tick===0,moveY:movement==='relocate'&&tick<120?-1:0});g.step();
    for(const shot of g.spawns)if(shot.owner===p.id)emitted.add(shot.id);maxConstructs=Math.max(maxConstructs,g.classKits.constructs().length);peakCharges=Math.max(peakCharges,g.classCues().filter(c=>c.kind==='engineer-charge'&&c.state!=='spent').length);
  }
  rows.push({path,target,movement,seconds:12,totalSp:p.totalSp,ownedSkills:[...p.skills],actualOwnedDamage:p.damageDealt,emittedProjectiles:emitted.size,maxConstructs,peakCharges,alive:p.status==='active'});
}
assert(rows.every(r=>r.totalSp===3&&r.alive));assert(rows.filter(r=>r.path==='engineer-traps-1').every(r=>r.maxConstructs===0&&r.peakCharges===1));assert(rows.filter(r=>r.path==='engineer-machinery-1').some(r=>r.actualOwnedDamage>0));
const report={passed:true,seed:2209,rows,limits:['Controlled neutral targets: no primary fire, boss attacks disabled, player invulnerable, no encounter clears claimed.','Actual Game combat and ownership are exercised; this is a timing/tradeoff comparison, not human fun, rendered readability or final balance acceptance.','Playable comparison: Free Play, Quarantine Run, same seed2209; purchase Level Footing, then either pathway. Ward Approach or Constable are both supported. Campaign acquisition is deferred.']};
fs.mkdirSync('reviews/engineer-pathways-2026-11-02',{recursive:true});fs.writeFileSync('reviews/engineer-pathways-2026-11-02/comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
