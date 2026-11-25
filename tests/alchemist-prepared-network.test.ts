import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createGameServer } from '../src/server/index.ts';
import { Session } from '../src/client/session.ts';
import { preparedIds } from '../src/shared/alchemist-prepared.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';

async function wait(test: () => boolean, note: string) {
  const deadline = Date.now() + 8500;
  while (!test()) {
    assert(Date.now() < deadline,note);
    await sleep(20);
  }
}

test('Stow Flask uses the real joined-room slot, hides its sleeve and stops its clock while paused', { timeout:40000 }, async () => {
  const {server,httpServer} = createGameServer({ audience:'testing' });
  await server.listen(0,'127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address !== 'string');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), owner = new Session(endpoint), peer = new Session(endpoint);
  let serial = 0;
  try {
    const settings = { mode:'short' as const, difficulty:'normal', maxPlayers:3 };
    await host.connect({ ...settings, classId:'soldier', name:'Mara' });
    const join = { roomId:host.room!.roomId,kind:'freeplay' as const };
    await owner.connect({ ...settings, classId:'alchemist', name:'Perrin' },join);
    const mine = () => owner.view?.players.find(player => player.id === owner.id);
    await wait(() => !!mine() && owner.view?.owner === host.id,'joined a real host');
    assert.equal(mine()?.sp,3);
    for (const item of ['alchemist-reagents-1',preparedIds.entry]) {
      owner.purchase({ kind:'skill',item });
      await wait(() => mine()?.skills.includes(item) === true,'bought ' + item);
    }
    host.start();
    await wait(() => owner.view?.phase === 'combat','normal fight');
    const send = (field: Partial<InputFrame>) => owner.input({ ...idleInput(), ...field,sequence:++serial,clientTick:owner.view!.combatTick });
    send({ q:true });
    await wait(() => mine()?.kit.alchemyPrepared?.[0] === 'flare','issued preparation');
    send({ technique2:true });
    await wait(() => mine()?.kit.alchemyReserve?.held?.recipe === 'flare','owned sleeve');
    const held = mine()!.kit.alchemyReserve!.held!;
    const id = owner.id;
    await peer.connect({ ...settings, classId:'soldier', name:'Late observer' },join);
    await wait(() => peer.view?.players.some(player => player.id === id) === true,'late joined view');
    for (const observer of [host,peer]) {
      const shared = observer.view?.players.find(player => player.id === id);
      assert(shared && shared.kit.alchemyReserve === undefined);
      const raw = observer.room?.state.players.get(id)?.lineworkOwner;
      assert(!raw || JSON.parse(raw).alchemyReserve === undefined);
    }
    assert.deepEqual(JSON.parse(owner.room!.state.players.get(id)!.lineworkOwner).alchemyReserve.held,held);
    await wait(() => mine()?.kit.alchemyReserve?.stage === 'return','sleeve settles');
    host.setMatchPaused(true);
    await wait(() => owner.view?.matchPaused === true,'host pause');
    const tick = owner.view!.combatTick;
    send({ technique2:true });
    await sleep(150);
    assert.equal(owner.view!.combatTick,tick);
    assert.deepEqual(mine()?.kit.alchemyReserve?.held,held);
    host.setMatchPaused(false);
    await wait(() => owner.view?.matchPaused === false,'room resumes');
    send({ technique2:true });
    await wait(() => mine()?.kit.alchemyPrepared?.[0] === 'flare' && !mine()?.kit.alchemyReserve?.held,'real released Flask');
    const point = { x:mine()!.x,y:mine()!.y };
    owner.throwAlchemy(point);
    await wait(() => peer.view!.classCues.some(cue => cue.kind === 'alchemy-pool' && cue.owner === id && cue.recipe === 'flare'), 'public landed flask');
    assert.equal(peer.view?.players.find(player => player.id === id)?.kit.alchemyReserve,undefined);
  } finally {
    await Promise.allSettled([owner.close(),peer.close(),host.close()]);
    await server.gracefullyShutdown(false);
  }
});
