import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Player } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { SurvivorActionClock } from '../src/client/survivor-action-presentation.ts';
import { alchemyActionCue } from '../src/client/alchemy-presentation.ts';

function fixture(){
  const g=new Game({mode:'endless',seed:41}),p=g.addPlayer('p','Perrin','alchemist');g.start();
  Object.defineProperty(g,'obstacles',{value:[],configurable:true});Object.defineProperty(g,'arena',{value:{...g.arena,obstacles:[],lavaPits:[]}});
  g.boss.staggerUntil=g.boss.deadline=1e9;p.invulnerableUntil=1e9;p.x=p.oldX=800;p.y=p.oldY=700;return {g,p};
}
function input(g:Game,p:Player,patch:Partial<InputFrame>){g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:0,...patch});g.step();}

test('Actual brewing poses follow commitment while moving, reconstruct for late observation, freeze under pause and yield to a real dodge',()=>{
  const {g,p}=fixture(),clock=new SurvivorActionClock();clock.observe(viewOf(g,p.id),0);
  input(g,p,{q:true});for(let i=0;i<4;i++)input(g,p,{moveY:1});
  const v=viewOf(g,p.id);clock.observe(v,10);
  const pose=clock.pose(v.players[0],v,true,false)!;assert.equal(pose.action,'brew');assert.equal(pose.frame,1);
  const late=new SurvivorActionClock();late.observe(v,20);assert.equal(late.pose(v.players[0],v,true,false)!.frame,pose.frame);
  v.matchPaused=true;late.observe(v,30);assert.deepEqual(late.pose(v.players[0],v,true,false,10000),pose);
  input(g,p,{dodge:true});const dodged=viewOf(g,p.id);clock.observe(dodged,40);
  assert.equal(alchemyActionCue(dodged.players[0],dodged,dodged.combatTick),undefined);
  assert.equal(clock.pose(dodged.players[0],dodged,true,false)!.action,'dash');
});
test('A committed flask begins its release gesture, keeps the actual target direction after turning and remains reconstructible without local input history',()=>{
  for(const [aim,facing]of [[0,'east'],[Math.PI/2,'south'],[Math.PI,'west'],[-Math.PI/2,'north']] as const){
    const {g,p}=fixture();input(g,p,{q:true});for(let i=0;i<12;i++)g.step();
    const target={x:p.x+Math.cos(aim)*200,y:p.y+Math.sin(aim)*200};assert(g.throwAlchemy(p.id,target));
    input(g,p,{aim:Math.atan2(-Math.sin(aim),-Math.cos(aim)),moveX:.5});
    const v=viewOf(g,p.id),late=new SurvivorActionClock();late.observe(v,0);
    const pose=late.pose(v.players[0],v,true,false)!;assert.equal(pose.action,'throw');assert.equal(pose.facing,facing);assert.equal(pose.frame,2);
    assert.equal(late.pose(v.players[0],v,true,true)!.frame,2);
  }
});
test('A later actual primary takes precedence while moving and an older flask gesture cannot reappear after that shot animation',()=>{
  const {g,p}=fixture(),clock=new SurvivorActionClock();clock.observe(viewOf(g,p.id),0);
  input(g,p,{q:true});for(let i=0;i<12;i++)g.step();
  assert(g.throwAlchemy(p.id,{x:1000,y:700}));let v=viewOf(g,p.id);clock.observe(v,10);assert.equal(clock.pose(v.players[0],v,true,false)!.action,'throw');
  input(g,p,{aim:Math.PI,moveX:.5,fire:true});v=viewOf(g,p.id);clock.observe(v,20);
  const primary=clock.pose(v.players[0],v,true,false)!;assert.equal(primary.action,'attack');assert.equal(primary.facing,'west');
  input(g,p,{aim:Math.PI,moveX:.5});for(let i=0;i<9;i++)g.step();v=viewOf(g,p.id);clock.observe(v,30);
  assert(v.classCues.some(c=>c.kind==='alchemy-flask'));
  assert.equal(clock.pose(v.players[0],v,true,false),undefined,'Return to movement rather than replaying an older throw');
});
