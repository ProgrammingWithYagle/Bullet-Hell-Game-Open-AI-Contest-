import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { rangerSightIds, type RangerSightCue } from '../src/shared/ranger-sight.ts';

async function until(check: () => boolean, detail: string) {
  const deadline = Date.now() + 7500;
  while (!check()) {
    assert(Date.now() < deadline, detail);
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

test('a joined Ranger shares the aim guides and retains private Sight Draw state', { timeout:25000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0,'127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), owner = new Session(endpoint), late = new Session(endpoint);
  try {
    const setup = { mode:'raid', difficulty:'normal' } as const;
    await host.connect({ ...setup,name:'Host',classId:'soldier' });
    const roomId = host.room!.roomId;
    await owner.connect({ ...setup,name:'Nela',classId:'ranger' },{ roomId,kind:'freeplay' });
    const ranger = (peer: Session) => peer.view?.players.find(p => p.id === owner.id);
    const cue = (peer: Session) => peer.view?.classCues.find((c): c is RangerSightCue => c.kind === 'ranger-sight' && c.owner === owner.id);
    for (const item of ['ranger-bowcraft-1',rangerSightIds.entry,rangerSightIds.bearing]) {
      owner.purchase({ kind:'skill', item });
      await until(() => ranger(owner)?.skills.includes(item) === true,'purchase ' + item);
    }
    assert.equal(ranger(owner)?.kit.rangerSight?.fitting,'bearing');
    assert.equal(ranger(host)?.kit.rangerSight,undefined);
    host.start();
    await until(() => owner.view?.phase === 'combat','combat');
    const game = liveRooms.get(roomId)!.game;
    const actor = game.players.get(owner.id)!;
    Object.assign(game.boss,{ x:1350,y:800,health:100000,maxHealth:100000,staggerUntil:12000,deadline:12000 });
    const ammo = actor.ammo;
    host.setMatchPaused(true);
    await until(() => owner.view?.matchPaused === true,'pause');
    owner.input({ ...idleInput(),sequence:1,aim:0,technique1:true });
    await new Promise(resolve => setTimeout(resolve,120));
    assert.equal(actor.ammo,ammo);
    assert.equal(cue(owner),undefined);
    owner.input({ ...idleInput(),sequence:2 });
    host.setMatchPaused(false);
    await until(() => owner.view?.matchPaused === false,'resume');
    owner.input({ ...idleInput(),sequence:3,aim:0,technique1:true });
    await until(() => ranger(owner)?.kit.rangerSight?.stage === 'release' &&
      cue(host)?.state === 'set' && cue(owner)?.state === 'set','fully drawn in both views');
    const first = cue(host)!;
    assert.equal(actor.ammo,ammo-1);
    assert.deepEqual(first,cue(owner));
    owner.input({ ...idleInput(),sequence:4,aim:1.25,technique1:true });
    await until(() => cue(host)?.aim === 1.25 && cue(owner)?.aim === 1.25,'shared changed angle');
    assert.equal(cue(host)?.id,first.id);
    assert.equal(cue(host)?.until,first.until);
    assert.equal(actor.ammo,ammo-1);
    assert.equal(ranger(host)?.kit.rangerSight,undefined);
    assert(!host.room!.state.players.get(owner.id)!.lineworkOwner);
    host.setMatchPaused(true);
    await until(() => owner.view?.matchPaused === true,'pause for late join');
    await late.connect({ ...setup,name:'Late peer',classId:'soldier' },{ roomId,kind:'freeplay' });
    await until(() => cue(late)?.id === first.id,'late peer receives live aim cue');
    assert.equal(ranger(late)?.kit.rangerSight,undefined);
    assert(!late.room!.state.players.get(owner.id)!.lineworkOwner);
    host.setMatchPaused(false);
    await until(() => owner.view?.matchPaused === false,'resume after late join');
    await owner.close();
    await until(() => !cue(host) && !cue(late),'sight cue leaves with the Ranger');
  } finally {
    await owner.close();
    await late.close();
    await host.close();
    await server.gracefullyShutdown(false);
  }
});
