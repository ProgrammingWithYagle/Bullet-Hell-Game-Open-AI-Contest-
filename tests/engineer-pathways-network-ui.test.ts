import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/shared/game.ts';
import {viewOf} from '../src/shared/view.ts';
import {idleInput} from '../src/shared/protocol.ts';
import {createGameServer} from '../src/server/index.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {menuEnvironment,menuBundle} from './helpers/menu-fixture.ts';
const wait=async(check:()=>boolean)=>{const deadline=Date.now()+7000;while(!check()){assert(Date.now()<deadline,'Engineer network state timed out');await new Promise(r=>setTimeout(r,15));}};
test('Real peers buy contrasting pathways with owned spending; a late observer receives the current charge and bracing machine', {timeout:30000}, async()=>{
  const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
  const host=new Session('http://127.0.0.1:'+address.port),ally=new Session('http://127.0.0.1:'+address.port),late=new Session('http://127.0.0.1:'+address.port);
  try{
    const options={name:'Tamsin',classId:'engineer' as const,mode:'endless' as const,difficulty:'normal'};
    await host.connect(options);await ally.connect({...options,name:'Peer engineer'},{roomId:host.room!.roomId});
    const g=liveRooms.get(host.room!.roomId)!.game;
    for(const [peer,path]of [[host,'engineer-traps-1'],[ally,'engineer-machinery-1']] as const){peer.purchase({kind:'skill',item:'engineer-constructs-1'});await wait(()=>g.players.get(peer.id)!.skills.includes('engineer-constructs-1'));peer.purchase({kind:'skill',item:path});await wait(()=>g.players.get(peer.id)!.skills.includes(path));}
    host.purchase({kind:'skill',item:'engineer-machinery-1'});await new Promise(r=>setTimeout(r,60));assert.deepEqual(g.players.get(host.id)!.skills,['engineer-constructs-1','engineer-traps-1']);assert.equal(g.players.get(host.id)!.totalSp,3);
    host.start();await wait(()=>ally.view?.phase==='combat');g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.x=1250;g.boss.y=200;g.boss.health=g.boss.maxHealth=1e6;
    for(const peer of [host,ally]){const p=g.players.get(peer.id)!;p.x=p.oldX=800;p.y=p.oldY=700;p.invulnerableUntil=1e9;peer.input({...idleInput(),sequence:1,aim:0,q:true});}
    await wait(()=>!!ally.view?.classCues.some(c=>c.kind==='engineer-charge'&&c.owner===host.id)&&!!ally.view.classCues.some(c=>c.kind==='turret'&&c.machinery&&c.owner===ally.id));
    host.setMatchPaused(true);await wait(()=>!!ally.view?.matchPaused);const pausedTick=g.combatTick;await new Promise(r=>setTimeout(r,150));assert.equal(g.combatTick,pausedTick);host.setMatchPaused(false);await wait(()=>!ally.view?.matchPaused);
    await late.connect({...options,name:'Late observer',classId:'medic'},{roomId:host.room!.roomId});await wait(()=>!!late.view?.classCues.some(c=>c.kind==='engineer-charge'&&c.owner===host.id));
    assert(late.view!.classCues.some(c=>c.kind==='turret'&&c.machinery&&c.owner===ally.id));assert(!late.view!.players.find(p=>p.id===late.id)!.skills.length);
    g.players.get(host.id)!.connected=false;g.players.get(ally.id)!.status='downed';await wait(()=>!g.classCues().some(c=>(c.kind==='engineer-charge'||(c.kind==='turret'&&c.machinery))));
  }finally{host.close();ally.close();late.close();await server.gracefullyShutdown(false);}
});
test('Both tree views inspect the same Engineer pathways, explain conflicts, preserve keyboard buttons and gate actual purchases',async t=>{
  const env=menuEnvironment(t),messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
  const originalCSS=Object.getOwnPropertyDescriptor(globalThis,'CSS');Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(s:string)=>s}});t.after(()=>{if(originalCSS)Object.defineProperty(globalThis,'CSS',originalCSS);else Reflect.deleteProperty(globalThis,'CSS');});
  const shop=await menuBundle(t,'src/client/ui/shop.ts',{
    'assets.ts':'export const assets={upgrades:{},items:{}};',
    'i18n.ts':`const messages=${JSON.stringify(messages)};export const locale='en';export const number=String;export const t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);`,
  });
  for(const expanded of [false,true]){
    const g=new Game(),p=g.addPlayer('p','Tamsin','engineer');g.transact(p.id,{id:'foundation',kind:'skill',item:'engineer-constructs-1'});const v=viewOf(g,p.id).players[0];const requests:unknown[]=[];
    env.host.innerHTML='<div class="loadout-editor">'+shop.shopMarkup(v,[],expanded)+'</div>';
    const viewport=env.host.querySelector('.skill-map-viewport');if(viewport)Object.assign(viewport,{clientWidth:600,clientHeight:400});
    const binding=shop.bindShop(env.host,v,(r:unknown)=>requests.push(r),[],expanded);env.host.querySelector('[data-shop-tab="tree"]')!.click();
    for(const path of ['engineer-machinery-1','engineer-traps-1'])assert(env.host.querySelector('[data-inspect="'+path+'"]'));
    env.host.querySelector('[data-inspect="engineer-traps-1"]')!.click();assert(env.host.querySelector('#item-details')!.innerHTML.includes(messages['skill.engineer-traps-1.description']));assert.equal(requests.length,0);
    env.host.querySelector('#buy-selected')!.click();assert.deepEqual(requests,[{kind:'skill',item:'engineer-traps-1'}]);
    v.skills.push('engineer-machinery-1');env.host.querySelector('[data-inspect="engineer-traps-1"]')!.click();assert(env.host.querySelector('#buy-selected')!.disabled);assert(env.host.querySelector('#item-details')!.innerHTML.includes('Carriage Sentry'));
    binding.dispose();
    assert(!shop.shopMarkup(v,[],expanded,'normal',undefined,false).includes('pathway-choices'),'Archived SP Story does not advertise the new Free Play pathways');
  }
  const chapter=new Game({mode:'story'}),p=chapter.addPlayer('p','Tamsin','engineer');assert.equal(shop.specializationMarkup(viewOf(chapter,p.id).players[0]),'');
});
