import test from "node:test";
import assert from "node:assert/strict";
import {
  HeavyTraverseClutchCandidate as HeavyTraverse,clutchId,
  traverseIds as ids,
  heavyTraverseRules as rules,
  type TraverseContext,
} from "./clutch-candidate01.mts";
import { HZ, idleInput, type Shot } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts";
import { moveBody } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/geometry.ts";

function fixture(fitting?: "spade" | "floating") {
  const p: any = {
    id: "owner",
    classId: "heavy",
    skills: [ids.entry, ...(fitting ? [ids[fitting]] : [])],
    connected: true,
    status: "active",
    health: 140,
    weapon: "heavy-0",
    ammo: 45,
    aim: 0,
    x: 600,
    y: 600,
    reloadAt: 0,
    dashUntil: 0,
    channelUntil: 0,
    overdriveUntil: 0,
    input: { ...idleInput(), sequence: 1 },
  };
  const controller = new HeavyTraverse(),
    shots = new Map<number, Shot>(),
    emitted: Shot[] = [],
    sounds: string[] = [];
  let serial = 0,
    capacity = true,
    admit = true;
  const c: TraverseContext = {
    tick: 1,
    stats: () => ({ damage: 1, cooldown: 1 }),
    canEmit: () => capacity,
    shoot: (owner, aim, damage, speed, radius, life) => {
      if (!admit) return;
      const shot = {
        id: ++serial,
        owner: owner.id,
        x: owner.x,
        y: owner.y,
        vx: Math.cos(aim) * speed,
        vy: Math.sin(aim) * speed,
        radius,
        damage,
        pierce: 0,
        expires: c.tick + life * HZ,
      };
      shots.set(shot.id, shot);
      emitted.push({ ...shot });
      return shot;
    },
    sound: (_p, id) => sounds.push(id),
  };
  const authority = () => ({
    players: [p],
    tick: c.tick,
    shot: (id: number) => shots.get(id),
    remove: (s: Shot) => {
      shots.delete(s.id);
      controller.forget(s.id);
    },
  });
  const step = (input: Record<string, unknown> = {}, obstacles: any[] = []) => {
    c.tick++;
    p.input = {
      ...idleInput(),
      sequence: p.input.sequence + 1,
      aim: p.aim,
      ...input,
    };
    p.aim = p.input.aim;
    controller.beforeMove(p, c);
    const recoil = controller.recoil(p, c.tick),
      walk = controller.walkFactor(p.id);
    const moved = moveBody(
      p,
      {
        x: (p.input.moveX * 190 * walk + recoil.x) / HZ,
        y: (p.input.moveY * 190 * walk + recoil.y) / HZ,
      },
      9,
      obstacles,
    );
    p.x = moved.x;
    p.y = moved.y;
    if (p.input.technique1) controller.cast(p, c);
    controller.advance(p, c);
    controller.reconcile(authority());
  };
  return {
    p,
    controller,
    shots,
    emitted,
    sounds,
    c,
    step,
    authority,
    capacity: (value: boolean) => (capacity = value),
    admit: (value: boolean) => (admit = value),
  };
}
test('unowned B has no operation and keeps all four issued paid slots',()=>{const f=fixture();assert(f.controller.cast(f.p,f.c));f.step({technique2:true,moveY:1});assert.equal(f.controller.walkFactor(f.p.id),0);assert.equal(f.controller.status(f.p,f.c.tick).heavyClutchUsed,false);for(let n=0;n<35;n++)f.step();assert.equal(f.emitted.length,4);assert.equal(f.p.ammo,41);});
test('one lifted slot is forfeited while real walking relocates the later three-slot remainder, preserving recovery and actual round costs',()=>{for(const mode of[undefined,'spade','floating']as const){const f=fixture(mode);f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true,moveY:1});assert.equal(f.controller.walkFactor(f.p.id),1);while(f.c.tick<16)f.step({moveY:1});assert.equal(f.controller.status(f.p,f.c.tick).heavyClutchForfeited,1);assert.equal(f.p.ammo,44);assert(f.p.y>690);f.step({technique2:true});assert.equal(f.controller.status(f.p,f.c.tick).heavyClutchLifted,false);while(f.c.tick<35)f.step();assert.deepEqual(f.emitted.map(s=>s.expires-HZ),[1,21,31]);assert.equal(f.p.ammo,42);assert.equal(f.controller.status(f.p,f.c.tick).technique1At,241);assert(f.emitted[1].y>690);}});
test('a lift and separate re-engagement between slots retains all four original slots without another carrier on either B press',()=>{const f=fixture();f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true,moveY:1});f.step({technique2:true});assert.equal(f.emitted.length,1);assert.equal(f.controller.status(f.p,f.c.tick).heavyClutchForfeited,0);while(f.c.tick<35)f.step();assert.deepEqual(f.emitted.map(s=>s.expires-HZ),[1,11,21,31]);assert.equal(f.p.ammo,41);});
test('holding the clutch through every remaining original slot cannot emit, catch up, refund, or keep work beyond the deadline',()=>{const f=fixture();f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true});while(f.c.tick<31){assert(f.controller.blocksPrimary(f.p.id,f.c.tick));f.step();}assert.equal(f.controller.status(f.p,31).heavyTraverseUntil,0);assert.equal(f.emitted.length,1);assert.equal(f.p.ammo,44);f.step({technique2:true});assert.equal(f.emitted.length,1);assert.equal(f.controller.status(f.p,32).technique1At,241);});
test('birth-tick, same-sequence and same-tick B repeats cannot manufacture a lift/re-engage pair',()=>{const f=fixture();f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));assert.equal(f.controller.command(f.p,f.c),false);f.step({technique2:true});assert.equal(f.controller.status(f.p,2).heavyClutchLifted,true);assert.equal(f.controller.command(f.p,f.c),false);f.p.input.sequence++;assert.equal(f.controller.command(f.p,f.c),false);f.step({technique2:true});assert.equal(f.controller.status(f.p,3).heavyClutchLifted,false);f.step({technique2:true});assert.equal(f.controller.status(f.p,4).heavyClutchLifted,false);});
test('a moving Spade cannot replant, then a fresh stationary press plants at its actual moved body point',()=>{const f=fixture('spade');f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true,moveY:1});f.step({technique2:true,moveY:1});assert.equal(f.controller.status(f.p,3).heavyClutchLifted,true);const at={x:f.p.x,y:f.p.y};f.step({technique2:true});assert.equal(f.controller.status(f.p,4).heavyClutchLifted,false);assert.equal(f.controller.status(f.p,4).heavyTraversePostX,at.x);assert.equal(f.controller.status(f.p,4).heavyTraversePostY,at.y);f.p.x++;f.step();assert.equal(f.controller.status(f.p,5).heavyTraverseUntil,0);});
test('C cancellation takes priority over B and fresh interruptions cancel lifted unpaid work without refund',()=>{for(const action of[{technique1:true,technique2:true},{reload:true,technique2:true},{dodge:true,technique2:true},{ultimate:true,technique2:true}]){const f=fixture();f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true});f.step(action);assert.equal(f.controller.status(f.p,3).heavyTraverseUntil,0);assert.equal(f.emitted.length,1);assert.equal(f.p.ammo,44);assert.equal(f.controller.status(f.p,3).technique1At,241);}});
test('loss of acquired ownership cancels retained work and post-clutch flights/impulses, while the earlier base round keeps its original requirements',()=>{const f=fixture('floating');f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true});f.step({technique2:true});while(f.c.tick<12)f.step();assert.equal(f.emitted.length,2);f.p.skills=f.p.skills.filter((id:string)=>id!==clutchId);f.controller.reconcile(f.authority());assert.equal(f.controller.status(f.p,12).heavyTraverseUntil,0);assert.equal(f.shots.size,1);assert(f.shots.has(f.emitted[0].id));assert.equal(f.controller.status(f.p,12).heavyTraverseShotAt,0);assert.deepEqual(f.controller.recoil(f.p,13),{x:0,y:0});assert.equal(f.controller.status(f.p,12).technique1At,241);});
test('later failed pool admission and a missed lifted slot cancel rather than postponing original work',()=>{for(const missed of[false,true]){const f=fixture();f.p.skills.push(clutchId);assert(f.controller.cast(f.p,f.c));f.step({technique2:true});if(missed){f.c.tick=12;f.controller.advance(f.p,f.c);}else{f.step({technique2:true});f.capacity(false);while(f.c.tick<11)f.step();f.capacity(true);}assert.equal(f.controller.status(f.p,f.c.tick).heavyTraverseUntil,0);assert.equal(f.emitted.length,1);assert.equal(f.p.ammo,44);assert.equal(f.controller.status(f.p,f.c.tick).technique1At,241);}});
