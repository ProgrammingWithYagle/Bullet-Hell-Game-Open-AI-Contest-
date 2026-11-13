import test from 'node:test';import assert from 'node:assert/strict';
import { fixture } from "./helpers/heavy-post-game-fixture.ts";
import { Prediction } from "../src/client/prediction.ts";
import { traversePredictedMotion, traversePredictedAfterMove } from "../src/client/heavy-post-prediction.ts";
import { lanyardId, keyedId, openId } from "../src/shared/heavy-traverse.ts";
import { viewOf } from "../src/shared/view.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import { idleInput } from "../src/shared/protocol.ts";
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function setup(mode:'loose'|'spade'|'floating',handling?:string){const f=fixture(mode,true,handling);f.g.arena.obstacles.push(...structuredClone(runtimeArena('gatehouse',f.g.settings.difficulty).obstacles));f.g.arena.lavaPits.push(...structuredClone(runtimeArena('gatehouse',f.g.settings.difficulty).lavaPits));f.step({technique1:true});f.step({technique2:true,fire:handling===openId});f.step({technique2:true});return f;}
test('whole source prediction follows actual third-command walking and known paid recoil on all nine carriage/handling combinations without predicting a round',()=>{
 for(const mode of['loose','spade','floating']as const)for(const handling of[undefined,keyedId,openId]){const f=setup(mode,handling),prediction=new Prediction();for(let tick=4;tick<=14;tick++){const v=viewOf(f.g,f.p.id),before=structuredClone(v.players[0].kit),ammo=v.players[0].ammo,props={technique2:tick===4,moveY:tick<=8?1:0},input={...idleInput(),sequence:tick,aim:0,...props};prediction.acknowledge(v,f.p.id);prediction.submit(input,v);f.step(props);near(prediction.player!.x,f.p.x);near(prediction.player!.y,f.p.y);assert.equal(prediction.player!.ammo,ammo);assert.deepEqual(v.players[0].kit,before);}}
});
test('third-command plus accepted Q keeps the actual same-step movement, while a blocked Q retains the post',()=>{
 for(const ready of[true,false]){const f=setup('spade');if(!ready)f.p.qAt=1000;const v=viewOf(f.g,f.p.id),prediction=new Prediction(),input={...idleInput(),sequence:4,technique2:true,q:true,moveY:1};prediction.acknowledge(v,f.p.id);prediction.submit(input,v);f.step(input);near(prediction.player!.x,f.p.x);near(prediction.player!.y,f.p.y);assert.equal((prediction.player!.kit as any).heavyLanyardAt,ready?0:4);assert.equal(f.status().heavyLanyardAt,ready?0:4);}
});
test('known posted ownership loss removes only its paid recoil, including after the final source opportunity',()=>{
 const base=setup('floating');const baseView=viewOf(base.g,base.p.id).players[0];baseView.skills=baseView.skills.filter(s=>s!==lanyardId);assert(traversePredictedMotion(baseView,{...idleInput(),sequence:4},4,{obstacles:[]}).x<0);
 const f=setup('floating');f.step({technique2:true});while(f.g.combatTick<31)f.step();const p=viewOf(f.g,f.p.id).players[0];p.skills=p.skills.filter(s=>s!==lanyardId);const motion=traversePredictedMotion(p,{...idleInput(),sequence:32},32,{obstacles:[]});assert.equal(motion.x,0);assert.equal(motion.y,0);
});
test('actual current range and known control-line cover clear unpaid prediction without editing the received kit',()=>{
 const f=setup('spade');f.step({technique2:true});f.step({moveY:1});const v=viewOf(f.g,f.p.id),original=structuredClone(v.players[0].kit),wall={x:599,y:602,width:2,height:2},covered=structuredClone(v.players[0]);const motion=traversePredictedMotion(covered,{...idleInput(),sequence:6},6,{obstacles:[wall]});assert.equal(motion.walk,1);assert.equal(covered.kit.heavyTraverseUntil,0);assert.deepEqual(v.players[0].kit,original);
 const far=structuredClone(v.players[0]);far.y=(far.kit as any).heavyLanyardY+65;traversePredictedAfterMove(far,{obstacles:[]},6);assert.equal(far.kit.heavyTraverseUntil,0);assert.equal((far.kit as any).heavyLanyardAt,0);
});
