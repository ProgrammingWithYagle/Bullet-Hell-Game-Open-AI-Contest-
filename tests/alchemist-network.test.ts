import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';
async function wait(check:()=>boolean){const until=Date.now()+10000;while(!check()){assert(Date.now()<until,'Alchemist peer state did not arrive');await new Promise(r=>setTimeout(r,15));}}

test('Real Alchemist peers observe owned stock, chosen flask damage, self healing, paused authority, late state and cleanup with Story SP kept at zero',{timeout:30000},async()=>{
  const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');
  const endpoint='http://127.0.0.1:'+address.port,a=new Session(endpoint),b=new Session(endpoint),late=new Session(endpoint),story=new Session(endpoint);
  try{
    const options={name:'Perrin',classId:'alchemist' as const,mode:'raid' as const,difficulty:'normal'};
    await a.connect(options);await b.connect({...options,name:'Another maker'},{roomId:a.room!.roomId,kind:'freeplay'});
    await wait(()=>b.view?.players.length===2);
    assert.equal(a.view!.players.find(p=>p.id===a.id)!.sp,12);
    a.purchase({kind:'skill',item:'alchemist-mixtures-1'});
    await wait(()=>b.view?.players.find(p=>p.id===a.id)?.skills.includes('alchemist-mixtures-1')===true);
    assert.equal(b.view!.players.find(p=>p.id===b.id)!.sp,12);
    a.start();await wait(()=>b.view?.phase==='combat');
    const room=liveRooms.get(a.room!.roomId)!,g=room.game,p=g.players.get(a.id)!,other=g.players.get(b.id)!;
    Object.defineProperty(g,'arena',{value:{...g.arena,obstacles:[],lavaPits:[]}});
    Object.defineProperty(g,'obstacles',{value:[]});
    g.boss.health=g.boss.maxHealth=1e6;g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.x=1300;g.boss.y=700;
    for(const owner of g.players.values()){owner.x=owner.oldX=800;owner.y=owner.oldY=700;owner.invulnerableUntil=1e9;}
    const enemy=g.minions.spawn(999991,{kind:'ordinary',x:900,y:700,health:1000,speed:0,radius:10,damage:0},g.combatTick)!;
    a.input({...idleInput(),sequence:1,q:true});
    await wait(()=>b.view?.players.find(owner=>owner.id===a.id)?.kit.alchemyPrepared?.length===1);
    assert.equal(g.kitStatus(p.id).alchemyCinder,2);
    assert.equal(g.kitStatus(other.id).alchemyCinder,3);
    a.throwAlchemy({x:900,y:700});
    await wait(()=>enemy.health<1000);
    assert(p.damageDealt>0);assert.equal(other.damageDealt,0);
    await wait(()=>b.view?.classCues.some(c=>c.kind==='alchemy-pool'&&c.owner===a.id)===true);
    a.selectAlchemy('mending');await wait(()=>b.view?.players.find(owner=>owner.id===a.id)?.kit.alchemyRecipe==='mending');
    while(g.combatTick<p.qAt)await new Promise(r=>setTimeout(r,20));
    a.input({...idleInput(),sequence:2,q:true});
    await wait(()=>b.view?.players.find(owner=>owner.id===a.id)?.kit.alchemyPrepared?.[0]==='mending');
    const blockedVials=g.kitStatus(p.id).alchemyPrepared!.length;
    a.throwAlchemy({x:p.x,y:p.y});await new Promise(r=>setTimeout(r,100));
    assert.equal(g.kitStatus(p.id).alchemyPrepared!.length,blockedVials,'An early repeat cannot bypass E cooldown');
    while(g.combatTick<p.eAt)await new Promise(r=>setTimeout(r,20));
    p.health=p.maxHealth-12;other.x=other.oldX=1100;
    a.throwAlchemy({x:p.x,y:p.y});await wait(()=>p.healing>0);
    assert.equal(p.health,p.maxHealth);assert.equal(p.healing,12);assert.equal(other.healing,0);
    a.input({...idleInput(),sequence:3,ultimate:true});
    await wait(()=>b.view?.players.find(owner=>owner.id===a.id)?.kit.alchemyBatchCharges===3);
    a.setMatchPaused(true);await wait(()=>b.view?.matchPaused===true&&b.view.combatTick===g.combatTick);
    const tick=g.combatTick,state=structuredClone(g.kitStatus(p.id));
    a.selectAlchemy('binding');a.throwAlchemy({x:900,y:700});a.input({...idleInput(),sequence:4,q:true,ultimate:true,fire:true});
    await new Promise(r=>setTimeout(r,180));
    assert.equal(g.combatTick,tick);assert.deepEqual(g.kitStatus(p.id),state);
    await late.connect({...options,name:'Late observer',classId:'soldier'},{roomId:a.room!.roomId,kind:'freeplay'});
    await wait(()=>late.view?.matchPaused===true&&late.view.players.length===3);
    assert.deepEqual(late.view!.players.find(owner=>owner.id===a.id)!.kit,state);
    const otherState=structuredClone(g.kitStatus(other.id));
    await a.close();await wait(()=>!p.connected&&b.view?.players.find(owner=>owner.id===p.id)?.kit.alchemyBatchCharges===0);
    assert(!b.view!.classCues.some(c=>c.owner===p.id&&c.kind.startsWith('alchemy-')));
    assert.deepEqual(g.kitStatus(other.id),otherState);
    await story.connect({...options,mode:'story'});await wait(()=>story.view?.players.length===1);
    const chapter=story.view!.players[0];assert(story.view!.chapter);assert.equal(chapter.sp,0);
    assert.equal(chapter.training?.characterId,'perrin-moss');assert.equal(chapter.training?.proofs.length,0);
  }finally{await Promise.allSettled([a.close(),b.close(),late.close(),story.close()]);await server.gracefullyShutdown(false);}
});
