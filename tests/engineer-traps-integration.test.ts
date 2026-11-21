import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, HZ } from '../src/shared/protocol.ts';
import { trapIds as ids } from '../src/shared/engineer-traps.ts';
import { engineerRules as r } from '../src/shared/engineer-pathways.ts';
import { BOSS_DEFEAT_TICKS } from '../src/shared/boss-defeat-flow.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
const wait=async(check:()=>boolean,label='network state')=>{
  const deadline=Date.now()+8000;
  while(!check()){assert(Date.now()<deadline,'Timed out: '+label);await new Promise(r=>setTimeout(r,10));}
};
test('Real peers replicate held plates, hauling, both acquired controls and committed corridor warnings; pause discards input and late observers inherit no ownership',{timeout:30000},async()=>{
  const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
  const host=new Session('http://127.0.0.1:'+address.port),ally=new Session('http://127.0.0.1:'+address.port),late=new Session('http://127.0.0.1:'+address.port);
  try{
    const options={name:'Tamsin',classId:'engineer' as const,mode:'endless' as const,difficulty:'normal'};
    await host.connect(options);await ally.connect({...options,name:'Tripwire engineer'},{roomId:host.room!.roomId});
    const g=liveRooms.get(host.room!.roomId)!.game;g.encounter=9;for(const p of g.players.values())p.totalSp=27;
    for(const [peer,skills]of [[host,[ids.switch,ids.key,ids.casings,ids.haul,ids.corridor]],[ally,[ids.wire]]] as const){
      for(const item of ['engineer-constructs-1','engineer-traps-1',...skills]){peer.purchase({kind:'skill',item});await wait(()=>g.players.get(peer.id)!.skills.includes(item),item);}
    }
    host.start();await wait(()=>ally.view?.phase==='combat');g.obstacles.splice(0);g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.x=1250;g.boss.y=200;g.boss.health=g.boss.maxHealth=1e6;
    const hp=g.players.get(host.id)!,ap=g.players.get(ally.id)!;
    hp.x=hp.oldX=800;hp.y=hp.oldY=700;ap.x=ap.oldX=800;ap.y=ap.oldY=900;hp.invulnerableUntil=ap.invulnerableUntil=1e9;
    host.input({...idleInput(),sequence:1,aim:0,q:true});ally.input({...idleInput(),sequence:1,aim:0,q:true});
    await wait(()=>g.classCues().filter(c=>c.kind==='engineer-charge'&&c.owner===host.id).length===1);
    hp.x=hp.oldX=600;hp.qAt=0;host.input({...idleInput(),sequence:2,aim:0,q:true});
    await wait(()=>g.classCues().filter(c=>c.kind==='engineer-charge'&&c.owner===host.id&&c.state==='ready').length===2,'two ready plates');
    hp.qAt=0;host.input({...idleInput(),sequence:3,aim:0,q:true});
    await wait(()=>!!ally.view?.players.find(p=>p.id===host.id)?.kit.trapHeld,'replicated hold control');
    assert(ally.view!.classCues.filter(c=>c.kind==='engineer-charge'&&c.owner===host.id).every(c=>c.kind==='engineer-charge'&&c.held));
    host.input({...idleInput(),sequence:4,aim:-Math.PI/2,technique2:true});
    await wait(()=>!!ally.view?.classCues.some(c=>c.kind==='engineer-haul'&&c.owner===host.id),'owned haul');
    assert(ally.view!.players.find(p=>p.id===host.id)!.kit.technique2At!>g.combatTick);
    await wait(()=>g.classCues().filter(c=>c.kind==='engineer-charge'&&c.owner===host.id&&c.state==='ready').length===2,'rearmed haul');
    host.input({...idleInput(),sequence:5,aim:0,technique1:true});
    await wait(()=>!!ally.view?.classCues.some(c=>c.kind==='engineer-corridor'&&c.owner===host.id),'committed corridor');
    host.setMatchPaused(true);await wait(()=>!!ally.view?.matchPaused);
    const tick=g.combatTick,at=g.kitStatus(host.id).technique1At,allyAt=g.kitStatus(ally.id).technique1At;
    assert(at!>tick);ally.input({...idleInput(),sequence:2,technique1:true});
    await new Promise(r=>setTimeout(r,100));assert.equal(g.combatTick,tick);assert.equal(g.kitStatus(ally.id).technique1At,allyAt);
    await late.connect({...options,name:'Late observer',classId:'medic'},{roomId:host.room!.roomId});
    await wait(()=>!!late.view?.matchPaused&&!!late.view.classCues.some(c=>c.kind==='engineer-corridor'&&c.owner===host.id),'late committed warning');
    const observed=late.view!.players.find(p=>p.id===host.id)!;assert.equal(observed.kit.technique1At,at);assert(observed.kit.trapHeld);
    assert(!late.view!.players.find(p=>p.id===late.id)!.skills.includes(ids.corridor));
    for(const cue of late.view!.classCues.filter(c=>c.owner===host.id))for(const key of ['damage','delivered','plates','jetDamage','jetTo'])assert(!Object.hasOwn(cue,key));
    host.setMatchPaused(false);await wait(()=>!ally.view?.matchPaused);
    await wait(()=>!!ally.view?.classCues.some(c=>c.kind==='engineer-corridor'&&c.impact),'actual coordinated release');
    assert.equal(g.kitStatus(ally.id).technique1At,allyAt,'paused action was discarded');
    assert(g.classCues().some(c=>c.kind==='engineer-charge'&&c.owner===ally.id));
    assert.equal(ap.totalSp,27);assert(!ap.skills.includes(ids.key));
  }finally{host.close();ally.close();late.close();await server.gracefullyShutdown(false);}
});

test('Normal Free Play rewards develop a complete Traps build in stages and leave six SP for complementary choices',()=>{
  const g=new Game({mode:'endless',seed:41}),p=g.addPlayer('solo','Tamsin','engineer'),purchases:{id:string;earned:number}[]=[];
  const buy=(id:string)=>{assert(g.transact(p.id,{id,kind:'skill',item:id}).ok,id);purchases.push({id,earned:p.totalSp});};
  buy('engineer-constructs-1');buy('engineer-traps-1');g.start();
  const plan=[[ids.switch,5],[ids.key,11],[ids.casings,17],[ids.haul,21],[ids.corridor,27]] as const;
  for(let stage=0;stage<9;stage++){
    assert.equal(String(g.phase),'combat');p.invulnerableUntil=1e9;g.boss.health=0;g.step();
    let transitions=0;while(String(g.phase)!=='shop'){assert(++transitions<BOSS_DEFEAT_TICKS+10);g.phaseEnds=g.tick;g.step();}
    assert.equal(String(g.phase),'shop');for(const [id,earned]of plan)if(p.totalSp>=earned&&!p.skills.includes(id))buy(id);
    if(stage<8)while(String(g.phase)!=='combat'){g.phaseEnds=g.tick;g.step();}
  }
  assert.deepEqual(purchases.filter(s=>s.id.startsWith('engineer-traps-')&&s.id!=='engineer-traps-1').map(s=>s.id),plan.map(([id])=>id));
  assert.deepEqual(purchases.slice(2).map(s=>s.earned),[5,11,19,21,27]);
  assert.equal(p.totalSp,27);assert.equal(viewSp(g,p.id),6);
  assert.equal(data.generalSkills.length,4);
  buy('general-sprint');buy('general-course-correction');assert.equal(viewSp(g,p.id),0);
});
function viewSp(g:Game,id:string){const p=g.players.get(id)!;return p.totalSp-p.skills.reduce((n,id)=>n+g.skillCost(id),0);}
