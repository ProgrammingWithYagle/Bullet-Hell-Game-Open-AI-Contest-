import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../src/server/index.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {idleInput,type Event} from '../src/shared/protocol.ts';
import {marksmanIds as ids} from '../src/shared/soldier-marksman.ts';

for(const variant of [ids.carom,ids.line])test(variant+' ordinary Raid peers retain manual two-shot costs, owner-only streams, pause and late/host-exit authority',{timeout:18000},async()=>{
  const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');
  const endpoint='http://127.0.0.1:'+address.port,host=new Session(endpoint),ally=new Session(endpoint),late=new Session(endpoint);
  const events:Event[]=[],other:Event[]=[];host.onEvents=e=>events.push(...e);ally.onEvents=e=>other.push(...e);
  const wait=async(check:()=>boolean,label:string)=>{const end=Date.now()+6000;while(!check()){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,5));}};
  try{
    const options={name:'Mara',classId:'soldier' as const,mode:'raid' as const,difficulty:'normal',seed:41,arenaSelection:'fixed' as const,openingArenaId:'gatehouse'};
    await host.connect(options);await ally.connect({...options,name:'Tamsin',classId:'engineer'},{roomId:host.room!.roomId});
    const g=liveRooms.get(host.room!.roomId)!.game,p=g.players.get(host.id)!;assert.equal(p.totalSp,12);
    for(const item of ['soldier-ballistics-1',ids.entry,variant,ids.pair]){host.purchase({kind:'skill',item});await wait(()=>!!host.view?.players.find(p=>p.id===host.id)?.skills.includes(item),'ordinary Raid purchase '+item);}
    assert.equal(host.view!.players.find(p=>p.id===host.id)!.sp,4);
    ally.purchase({kind:'skill',item:ids.pair});await new Promise(r=>setTimeout(r,60));assert.equal(g.players.get(ally.id)!.skills.length,0);
    host.start();await wait(()=>ally.view?.phase==='combat','combat');let sequence=0;const ammo=p.ammo;
    host.input({...idleInput(),sequence:++sequence,aim:Math.PI,technique2:true});
    await wait(()=>!!ally.view?.classCues.some(c=>c.kind==='soldier-bank'&&c.owner===host.id),'physical first contact');
    const bank=ally.view!.classCues.find(c=>c.kind==='soldier-bank'&&c.owner===host.id)!;
    await wait(()=>events.some(e=>e.type==='shots'&&e.shots.some(s=>s.id===bank.id&&s.vx>0)),'owner trajectory event acknowledgment');
    assert(!other.some(e=>e.type==='shots'&&e.shots.some(s=>s.id===bank.id)));
    for(const key of ['origin','banks','pair','proof','first'])assert(!(key in bank),key);
    host.input({...idleInput(),sequence:++sequence,aim:Math.PI});host.setMatchPaused(true);await wait(()=>!!ally.view?.matchPaused,'contact window pause');
    const tick=g.combatTick,until=g.kitStatus(host.id).soldierPairUntil!,recovery=g.kitStatus(host.id).technique2At;
    assert(until>tick);assert.equal(p.ammo,ammo-1);assert.equal(g.kitStatus(host.id).technique1At,0);assert.equal(p.eAt,0);
    ally.room!.send('pauseMatch',false);ally.room!.send('endMatch');await new Promise(r=>setTimeout(r,60));assert.equal(g.combatTick,tick);assert.equal(g.phase,'combat');
    await late.connect({...options,name:'Perrin',classId:'medic'},{roomId:host.room!.roomId});await wait(()=>!!late.view?.matchPaused,'late paused view');
    assert(late.view!.classCues.some(c=>c.kind==='soldier-bank'&&c.id===bank.id));assert.equal(g.players.get(late.id)!.skills.length,0);
    host.input({...idleInput(),sequence:++sequence,technique2:true});await new Promise(r=>setTimeout(r,60));assert.equal(g.combatTick,tick);assert.equal(p.ammo,ammo-1);assert.equal(g.kitStatus(host.id).soldierPairUntil,until);
    host.setMatchPaused(false);await wait(()=>!!host.view&&!host.view.matchPaused,'resume');
    host.input({...idleInput(),sequence:++sequence,aim:Math.PI/2,technique2:true});
    await wait(()=>p.ammo===ammo-2,'second actual cartridge');
    await wait(()=>events.some(e=>e.type==='shots'&&e.shots.some(s=>s.owner===host.id&&s.id!==bank.id&&s.vy>800)),'manually aimed second shot event');
    const second=events.filter(e=>e.type==='shots').flatMap(e=>e.shots).find(s=>s.owner===host.id&&s.id!==bank.id&&s.vy>800)!;
    host.input({...idleInput(),sequence:++sequence,aim:Math.PI/2});host.setMatchPaused(true);await wait(()=>!!ally.view?.matchPaused,'second flight pause');
    assert.equal(g.kitStatus(host.id).soldierPairUntil,0);assert.equal(g.kitStatus(host.id).technique2At,recovery);assert(g.shots.has(second.id));
    host.endMatch();await wait(()=>[host,ally,late].every(s=>s.view?.phase==='defeat'),'paused host exit');assert(!g.shots.has(second.id));
    await wait(()=>events.some(e=>e.type==='remove'&&e.ids.includes(second.id)),'owner actual removal event acknowledgment');
    assert(!other.some(e=>e.type==='shots'&&e.shots.some(s=>s.owner===host.id)));assert(!other.some(e=>e.type==='remove'&&e.ids.includes(second.id)));
    assert.equal(p.ammo,ammo-2);assert.equal(g.kitStatus(host.id).soldierPairUntil,0);
  }finally{host.close();ally.close();late.close();await server.gracefullyShutdown(false);}
});
