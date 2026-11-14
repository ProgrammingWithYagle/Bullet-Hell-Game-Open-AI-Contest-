import type {Construct} from '../../src/shared/class-kits.ts';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';
import { Session } from '../../src/client/session.ts';
import { data } from '../../src/shared/game.ts';
import {
  idleInput,
  validInput,
  type Event,
  type InputFrame,
  type Result,
} from '../../src/shared/protocol.ts';
import type { View } from '../../src/shared/view.ts';
import {
  earnedBulwarkFlow,
  type BulwarkHandling,
  type BulwarkTransport,
} from './tank-bulwark-earned-flow.ts';
import { restWait } from './sniper-rest-flow.ts';
import { restRaidInput, type ObservedRestShot } from './sniper-rest-raid-policy.ts';

const ordinaryShort = {
  mode: 'short',
  difficulty: 'baby',
  arenaSelection: 'fixed',
  openingArenaId: 'gatehouse',
} as const;
type Purchase = Parameters<BulwarkTransport['purchase']>[0];
type Receipt = Result & { id?: string };
function remember(
  events: Event[],
  observed: Map<number, ObservedRestShot>,
  batch: Event[],
  tick: number,
) {
  events.push(...structuredClone(batch));
  for (const event of batch) {
    if (event.type === 'shots')
      for (const shot of event.shots) observed.set(shot.id, { ...shot, seenAt: tick });
    if (event.type === 'remove') for (const id of event.ids) observed.delete(id);
  }
}
function inputFrame(
  current: View | null | undefined,
  sequence: number,
  props: Partial<InputFrame>,
) {
  const input = { ...idleInput(), ...props, sequence, clientTick: current?.combatTick ?? 0 };
  assert(validInput(input));
  return input;
}
function confirmedPurchase(
  current: View | null | undefined,
  id: string,
  request: Purchase,
  receipt: Receipt | undefined,
) {
  if (!receipt) return false;
  if (!receipt.ok) return true;
  const player = current?.players.find((p) => p.id === id);
  if (request.kind === 'skill') return player?.skills.includes(request.item) ?? false;
  if (request.kind === 'weapon') return player?.weapon === request.item;
  return true;
}

export async function runBulwarkWorker(
  code: string,
  handling: BulwarkHandling,
) {
  const wrapper =
    "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
    code +
    "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
  const worker = new Worker(
    new URL('data:text/javascript;base64,' + Buffer.from(wrapper).toString('base64')),
    { execArgv: [] },
  );
  const id = 'solo',
    events: Event[] = [],
    observed = new Map<number, ObservedRestShot>(),
    purchases = new Map<string, Receipt>();
  let view: View | undefined,
    ready = false,
    failure: unknown,
    sequence = 0,
    serial = 0,
    paused = false,
    pauseTick = 0;
  worker.on('error', (error) => {
    failure = error;
  });
  worker.on('message', (message) => {
    if (message.type === 'ready') ready = true;
    else if (message.type === 'view') view = message.view;
    else if (message.type === 'error') failure = Error(JSON.stringify(message));
    else if (message.type === 'events')
      remember(events, observed, message.events, view?.combatTick ?? 0);
    else if (message.type === 'purchaseResult') purchases.set(message.id, message);
    else if (message.type === 'pauseState') {
      paused = message.value;
      pauseTick = message.combatTick;
    }
  });
  try {
    await restWait(() => ready, 'Whole optimized worker starts');
    worker.postMessage({
      type: 'init',
      settings: { ...ordinaryShort, seed: 41, maxPlayers: 1 },
      name: 'Senn',
      classId: 'tank',
    });
    await restWait(() => !!view, 'Ordinary optimized worker lobby');
    const result = await earnedBulwarkFlow(
      {
        id,
        events,
        observed,
        view: () => {
          if (failure) throw failure;
          return view;
        },
        input: (props) => {
          const frame = inputFrame(view, ++sequence, props);
          worker.postMessage({ type: 'input', input: frame });
          return sequence;
        },
        purchase: async (request) => {
          const transaction = 'bulwark-worker-' + ++serial;
          worker.postMessage({ type: 'purchase', request: { ...request, id: transaction } });
          await restWait(
            () => confirmedPurchase(view, id, request, purchases.get(transaction)),
            'Worker purchase result and authoritative view',
          );
          return purchases.get(transaction)!;
        },
        start: () => worker.postMessage({ type: 'start' }),
        vote: (index) => worker.postMessage({ type: 'vote', index }),
        pause: (value) => worker.postMessage({ type: 'pause', value }),
        paused: () => paused && view?.combatTick === pauseTick,
      },
      handling,
    );
    return { ...result, wholeOptimizedWorker: true, workerPatched: false, transport: 'worker' };
  } finally {
    await worker.terminate();
  }
}

export async function runBulwarkPeers(
  endpoint: string,
  handling: BulwarkHandling,
) {
  const host = new Session(endpoint),
    tank = new Session(endpoint),
    late = new Session(endpoint);
  const events: Event[] = [],
    foreign: Event[] = [],
    observed = new Map<number, ObservedRestShot>();
  const purchases: Receipt[] = [],
    hostPurchases: Receipt[] = [];
  let sequence = 0,
    hostSequence = 0;
  tank.onPurchase = (result) => purchases.push(result);
  host.onPurchase = (result) => hostPurchases.push(result);
  tank.onEvents = (batch) => remember(events, observed, batch, tank.view?.combatTick ?? 0);
  for (const viewer of [host, late])
    viewer.onEvents = (batch) => foreign.push(...structuredClone(batch));
  const player = (viewer: Session) => viewer.view?.players.find((p) => p.id === viewer.id);
  const join = { ...ordinaryShort, maxPlayers: 4 };
  try {
    await host.connect({ ...join, name: 'Ordinary room host', classId: 'soldier' });
    await tank.connect({ ...join, name: 'Senn', classId: 'tank' }, { roomId: host.room!.roomId });
    await restWait(() => !!player(tank) && !!player(host), 'Ordinary real-peer lobbies');
    assert.equal(tank.view!.owner, host.id);
    assert.notEqual(tank.id, host.id);
    const hostWeapons = data.weapons
      .filter((w) => w.classId === 'soldier')
      .sort((a, b) => b.tier - a.tier);
    for (const weapon of hostWeapons) {
      if (player(host)!.weapon === weapon.id) break;
      const index = hostPurchases.length,
        request = { kind: 'weapon', item: weapon.id } as const;
      host.purchase(request);
      await restWait(
        () => confirmedPurchase(host.view, host.id, request, hostPurchases[index]),
        'Host equipment purchase',
      );
      if (hostPurchases[index].ok) break;
    }
    const result = await earnedBulwarkFlow(
      {
        id: tank.id,
        events,
        observed,
        view: () => tank.view ?? undefined,
        input: (props) => {
          tank.input(inputFrame(tank.view, ++sequence, props));
          return sequence;
        },
        purchase: async (request) => {
          const index = purchases.length;
          tank.purchase(request);
          await restWait(
            () => confirmedPurchase(tank.view, tank.id, request, purchases[index]),
            'Peer purchase result and authoritative view',
          );
          return purchases[index];
        },
        start: () => host.start(),
        vote: (index) => {
          host.vote(index);
          tank.vote(index);
        },
        pause: (value) => host.setMatchPaused(value),
        paused: () => tank.view?.matchPaused === true,
        end: () => host.endMatch(),
        allyPolicy: () => {
          const actor = player(host);
          if (actor && host.view)
            host.input(
              inputFrame(
                host.view,
                ++hostSequence,
                restRaidInput(host.view, actor, [...observed.values()]),
              ),
            );
        },
        stopAlly: () => host.input(inputFrame(host.view, ++hostSequence, {})),
        checkObservers:async(ids,until,open)=>{
          const tick=tank.view!.combatTick;tank.room!.send('pauseMatch',false);tank.room!.send('endMatch');
          await late.connect({...join,name:'Late observer',classId:'medic'},{roomId:host.room!.roomId});
          await restWait(()=>late.view?.matchPaused===true&&!!player(late),'Late peer receives authoritative paused view');
          await sleep(60);assert.equal(tank.view!.combatTick,tick);assert.equal(tank.view!.phase,'combat');
          const own=player(tank)!,raw=tank.room!.state.players.get(tank.id)!;
          const privateKit=JSON.parse(raw.lineworkOwner);assert(privateKit.bulwarkCarried);
          assert.deepEqual(privateKit.bulwarkPanelIds,ids);assert.equal(privateKit.bulwarkPanelUntil,until);
          assert.deepEqual(player(late)!.skills,[]);
          for(const observer of [host,late]){
            const encoded=observer.room!.state.players.get(tank.id)!;assert(!encoded.lineworkOwner,'Owner handling is absent on foreign connection');
            const visible=observer.view!.players.find(p=>p.id===tank.id)!;
            assert.deepEqual(Object.keys(visible.kit).filter(key=>key.startsWith('bulwark')),[]);
            const panels=observer.view!.classCues.filter((cue):cue is Construct=>cue.kind==='wall'&&cue.owner===tank.id);
            assert.deepEqual(panels.map(cue=>cue.id),ids);
            for(const panel of panels){assert.equal(panel.until,until);assert.equal((panel.bulwarkPortHalfSpan??0)>0,open);}
          }
          assert.equal(own.kit.bulwarkCarried,true);
          assert(foreign.some(event=>event.type==='sound'&&event.owner===tank.id&&event.id==='tank-wall-lift'));
          assert(!foreign.some(event=>event.type==='shots'&&event.shots.some(shot=>shot.owner===tank.id)));

        },
      },
      handling,
    );
    await restWait(
      () => [host, tank, late].every((s) => s.view?.phase === 'defeat' && s.view.endedByHost),
      'Actual host exit reaches all three real peers',
    );
    return {
      ...result,
      realPeers: 3,
      tankIsNonHost: true,
      ownerPrivateHandlingAndPublicPanels: true,
      sharedPhysicalPanels: true,
      transport: 'peer',
    };
  } finally {
    late.close();
    tank.close();
    host.close();
  }
}
