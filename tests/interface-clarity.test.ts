import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RoomInviteUI,roomInvitePlacement} from '../src/client/room-invite-ui.ts';
import {bossDefeatStatus} from '../src/client/ui/boss-defeat-status.ts';
import {playerVitalsMarkup} from '../src/client/ui/player-vitals.ts';
import {characterHeadshot} from '../src/client/ui/character-headshot.ts';
import {mapCollage} from '../src/client/ui/map-collage.ts';
import {data,Game} from '../src/shared/game.ts';
import {HZ,type Phase,type ClassId} from '../src/shared/protocol.ts';
import {viewOf} from '../src/shared/view.ts';
import {waitingRoomMarkup} from '../src/client/ui/waiting-room.ts';

test('the defeat status counts actual remaining ticks and distinguishes the next fight, extra choice and results in all catalogs',()=>{
  const boss={health:0,defeatedAt:80};
  for(const [phase,key]of [['mutationVote','ui.preparingNextEncounter'],['contractVote','ui.preparingNextEncounter'],['shop','ui.preparingNextEncounter'],['secretOffer','ui.preparingChoice'],['victory','ui.preparingResults'],['defeat','ui.preparingResults']] as const){
    assert.deepEqual(bossDefeatStatus(phase,boss,80),{key,seconds:5});
    assert.equal(bossDefeatStatus(phase,boss,80+HZ).seconds,4);assert.equal(bossDefeatStatus(phase,boss,80+5*HZ-1).seconds,1);assert.equal(bossDefeatStatus(phase,boss,80+5*HZ).seconds,0);
    for(const locale of data.locales){const catalog=JSON.parse(readFileSync('locales/'+locale.id+'.json','utf8'));assert.equal(typeof catalog.messages[key],'string');assert(catalog.messages[key].length>5);}
  }
});

test('all seven actual portraits have bounded headshots; player status and room roster keep resources independent and text escaped',()=>{
  const portraits=Object.fromEntries(data.classes.map(c=>[c.id,'/images/'+c.id+'-selection-v1.png'])),g=new Game();
  for(const c of data.classes){
    const head=characterHeadshot(c.id,portraits[c.id]);assert(head.includes('viewBox='));assert(head.includes(portraits[c.id]));assert(head.includes('aria-hidden="true"'));
    const markup=playerVitalsMarkup(c.id,portraits[c.id],'',key=>'<'+key+'>');
    assert.equal((markup.match(/<progress /g)??[]).length,2);assert(markup.includes('id="health"'));assert(markup.includes('id="player-shield"'));assert(!markup.includes('<ui.health>'));
    for(const id of ['coins-value','skill-points-value','ammo','player-name-label','player-class','player-build'])assert.equal((markup.match(new RegExp('id="'+id+'"','g'))??[]).length,1);
    g.addPlayer(c.id,'<'+c.survivor+'>',c.id as ClassId);
  }
  const roster=waitingRoomMarkup(viewOf(g,'soldier'),'soldier','ABC234',key=>key,String,portraits,true);
  assert.equal((roster.match(/class="character-headshot"/g)??[]).length,7);assert(roster.includes('ui.roomPasswordProtected'));assert(roster.includes('&lt;'));assert(!roster.includes('<Mara>'));
  assert.throws(()=>characterHeadshot('missing','image'),/Missing character/);
  const collage=mapCollage(Object.fromEntries(data.arenas.map(a=>[a.id,'/maps/'+a.id+'.png'])));assert.equal((collage.match(/<img /g)??[]).length,6);for(const a of data.arenas)assert(collage.includes(a.id+'.png'));assert.throws(()=>mapCollage({}),/Missing map imagery/);
});

test('room-code placement puts every menu in flow, hides only the duplicate waiting-room card and gives Settings priority',()=>{
  const phases:Phase[]=['lobby','loading','combat','mutationVote','contractVote','shop','secretOffer','victory','defeat'];
  for(const phase of phases){
    assert.equal(roomInvitePlacement(true,false,phase,false,'room').slot,'pause-menu-room-invite-slot');
    assert.equal(roomInvitePlacement(false,true,phase,false,'room').slot,'boss-guide-room-invite-slot');
    const place=roomInvitePlacement(false,false,phase,false,'equipment');assert.equal(place.hidden,false);assert.equal(place.slot,phase==='combat'?undefined:'phase-room-invite-slot');
  }
  assert.equal(roomInvitePlacement(false,false,'lobby',false,'room').hidden,true);
  assert.equal(roomInvitePlacement(false,false,'mutationVote',true,'equipment').slot,undefined);
});

class NodeFixture{
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};className='';hidden=false;open=false;id='';textContent='';innerHTML='';ontoggle:unknown;
  constructor(readonly tag:string,readonly doc:{activeElement:NodeFixture|null}){}
  append(...nodes:NodeFixture[]){for(const node of nodes){if(node.contains(this.doc.activeElement))this.doc.activeElement=null;node.remove();node.parentElement=this;this.children.push(node);}}
  contains(other:unknown):boolean{return this===other||this.children.some(c=>c.contains(other));}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
  focus(){this.doc.activeElement=this;}setAttribute(){}addEventListener(){}querySelector(){return null;}
}
test('the actual room-code controller retains one open control and focus across menu rebuilds without stealing another field’s focus',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),previousElement=Object.getOwnPropertyDescriptor(globalThis,'HTMLElement');
  const doc={activeElement:null as NodeFixture|null,createElement:(tag:string)=>new NodeFixture(tag,doc)};
  Object.defineProperty(globalThis,'document',{value:doc,configurable:true});Object.defineProperty(globalThis,'HTMLElement',{value:NodeFixture,configurable:true});
  try{
    const host=doc.createElement('main'),shop=doc.createElement('div'),settings=doc.createElement('div'),other=doc.createElement('input');host.append(shop,settings,other);
    const ui=new RoomInviteUI(host as unknown as HTMLElement,key=>key,()=>{}),root=ui.root as unknown as NodeFixture;
    ui.update('ABC234');root.open=true;root.children[0].focus();
    ui.place(shop as unknown as HTMLElement);assert.equal(root.parentElement,shop);assert.equal(doc.activeElement,root.children[0]);assert.equal(root.dataset.placement,'menu');assert(ui.open);
    ui.place(settings as unknown as HTMLElement);assert.equal(root.parentElement,settings);assert.equal(doc.activeElement,root.children[0]);
    other.focus();ui.update('ABC234');ui.place(settings as unknown as HTMLElement);assert.equal(doc.activeElement,other);
    ui.place();shop.remove();settings.remove();assert.equal(root.parentElement,host);assert.equal(root.dataset.placement,'combat');assert(ui.open);
    ui.close();assert(!ui.open);ui.destroy();assert.equal(root.parentElement,null);
  }finally{
    if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
    if(previousElement)Object.defineProperty(globalThis,'HTMLElement',previousElement);else Reflect.deleteProperty(globalThis,'HTMLElement');
  }
});
