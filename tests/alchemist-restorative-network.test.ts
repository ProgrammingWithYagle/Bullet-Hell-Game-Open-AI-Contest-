import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { restorativeIds } from '../src/shared/alchemist-restorative.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';

async function wait(check: () => boolean,note: string) {
  const deadline = Date.now() + 8500;
  while (!check()) {
    assert(Date.now() < deadline,note);
    await sleep(20);
  }
}

test('a joined Alchemist privately aims and the real patient receives the public dressing after unpausing', {timeout:40000},async () => {
  const {server,httpServer} = createGameServer({audience:'testing'});
  await server.listen(0,'127.0.0.1');
  const addr = httpServer.address();
  assert(addr && typeof addr !== 'string');
  const endpoint = 'http://127.0.0.1:' + addr.port;
  const host = new Session(endpoint), owner = new Session(endpoint), late = new Session(endpoint);
  let serial = 0;
  try {
    const settings = {mode:'short' as const,difficulty:'normal',maxPlayers:3};
    await host.connect({...settings,classId:'soldier',name:'Mara'});
    const join = {roomId:host.room!.roomId,kind:'freeplay' as const};
    await owner.connect({...settings,classId:'alchemist',name:'Perrin'},join);
    const actor = () => owner.view?.players.find(row => row.id === owner.id);
    await wait(() => !!actor() && owner.view!.owner === host.id,'non-host joined');
    assert.equal(actor()?.sp,3);
    for (const item of ['alchemist-dyehouse-1',restorativeIds.entry]) {
      owner.purchase({kind:'skill',item});
      await wait(() => actor()?.skills.includes(item) === true,'bought ' + item);
    }
    host.start();
    await wait(() => owner.view?.phase === 'combat','combat started');
    const game = liveRooms.get(join.roomId)!.game, chemist = game.players.get(owner.id)!, patient = game.players.get(host.id)!;
    const arena = {...game.arena,obstacles:[],lavaPits:[]};
    Object.defineProperty(game,'arena',{get:() => arena});
    Object.defineProperty(game,'obstacles',{get:() => arena.obstacles});
    Object.assign(game.boss,{x:1320,y:760,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000});
    Object.assign(chemist,{x:800,y:700,oldX:800,oldY:700});
    Object.assign(patient,{x:880,y:480,oldX:880,oldY:480});
    const send = (moves: Partial<InputFrame>) => owner.input({...idleInput(),aim:0,...moves,sequence:++serial,clientTick:owner.view!.combatTick});
    owner.selectAlchemy('mending');
    await wait(() => actor()?.kit.alchemyRecipe === 'mending','real Mending recipe');
    send({q:true});
    await wait(() => actor()?.kit.alchemyDressing?.stage === 'ready','private placement plan');
    const raw = owner.room!.state.players.get(owner.id)!.lineworkOwner;
    const targets = actor()?.kit.alchemyDressing?.targets;
    assert(targets?.length && JSON.parse(raw).alchemyDressing.targets.length === targets.length);
    assert.equal(host.view?.players.find(row => row.id === owner.id)?.kit.alchemyDressing,undefined);
    send({technique3:true});
    await wait(() => host.view?.classCues.some(cue => cue.kind === 'alchemy-dressing' && cue.owner === owner.id) === true,'public placed dressing');
    const field = host.view!.classCues.find(cue => cue.kind === 'alchemy-dressing' && cue.owner === owner.id)!;
    const {x,y} = targets[0];
    Object.assign(patient,{x,y,oldX:x,oldY:y,health:patient.maxHealth-40});
    const baseline = patient.health;
    host.setMatchPaused(true);
    await wait(() => owner.view?.matchPaused === true,'host paused while care pending');
    const tick = owner.view!.combatTick;
    await late.connect({...settings,classId:'soldier',name:'Late observer'},join);
    await wait(() => late.view?.classCues.some(cue => cue.id === field.id) === true,'late received public dressing');
    await sleep(200);
    assert.equal(owner.view!.combatTick,tick);
    assert.equal(patient.health,baseline);
    for (const observer of [host,late]) {
      assert.equal(observer.view?.players.find(row => row.id === owner.id)?.kit.alchemyDressing,undefined);
      const ownerOnly = observer.room?.state.players.get(owner.id)?.lineworkOwner;
      assert(!ownerOnly || JSON.parse(ownerOnly).alchemyDressing === undefined);
    }
    host.setMatchPaused(false);
    await wait(() => patient.health > baseline,'actual patient health rose on resume');
    assert.equal(patient.health,baseline+18);
    assert.equal(chemist.healing,18);
    await wait(() => late.view?.classCues.some(cue => cue.id === field.id) === false,'consumed public mark disappears');
  } finally {
    await Promise.allSettled([owner.close(),late.close(),host.close()]);
    await server.gracefullyShutdown(false);
  }
});
