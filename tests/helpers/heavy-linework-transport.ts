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
  earnedLineworkFlow,
  type LineworkFitting,
  type LineworkTransport,
} from './heavy-linework-earned-flow.ts';
import { restWait } from './sniper-rest-flow.ts';
import { restRaidInput, type ObservedRestShot } from './sniper-rest-raid-policy.ts';

const ordinaryShort = {
  mode: 'short',
  difficulty: 'baby',
  arenaSelection: 'fixed',
  openingArenaId: 'gatehouse',
} as const;
type Purchase = Parameters<LineworkTransport['purchase']>[0];
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

export async function runLineworkWorker(code: string, fitting: LineworkFitting) {
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
      name: 'Hux',
      classId: 'heavy',
    });
    await restWait(() => !!view, 'Ordinary optimized worker lobby');
    const result = await earnedLineworkFlow(
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
          const transaction = 'linework-worker-' + ++serial;
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
      fitting,
    );
    return { ...result, wholeOptimizedWorker: true, workerPatched: false, transport: 'worker' };
  } finally {
    await worker.terminate();
  }
}

export async function runLineworkPeers(endpoint: string, fitting: LineworkFitting) {
  const host = new Session(endpoint),
    heavy = new Session(endpoint),
    late = new Session(endpoint);
  const events: Event[] = [],
    foreign: Event[] = [],
    observed = new Map<number, ObservedRestShot>();
  const purchases: Receipt[] = [],
    hostPurchases: Receipt[] = [];
  let sequence = 0,
    hostSequence = 0;
  heavy.onPurchase = (result) => purchases.push(result);
  host.onPurchase = (result) => hostPurchases.push(result);
  heavy.onEvents = (batch) => remember(events, observed, batch, heavy.view?.combatTick ?? 0);
  for (const viewer of [host, late])
    viewer.onEvents = (batch) => foreign.push(...structuredClone(batch));
  const player = (viewer: Session) => viewer.view?.players.find((p) => p.id === viewer.id);
  const join = { ...ordinaryShort, maxPlayers: 4 };
  try {
    await host.connect({ ...join, name: 'Ordinary room host', classId: 'soldier' });
    await heavy.connect({ ...join, name: 'Hux', classId: 'heavy' }, { roomId: host.room!.roomId });
    await restWait(() => !!player(heavy) && !!player(host), 'Ordinary real-peer lobbies');
    assert.equal(heavy.view!.owner, host.id);
    assert.notEqual(heavy.id, host.id);
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
    const result = await earnedLineworkFlow(
      {
        id: heavy.id,
        events,
        observed,
        view: () => heavy.view ?? undefined,
        input: (props) => {
          heavy.input(inputFrame(heavy.view, ++sequence, props));
          return sequence;
        },
        purchase: async (request) => {
          const index = purchases.length;
          heavy.purchase(request);
          await restWait(
            () => confirmedPurchase(heavy.view, heavy.id, request, purchases[index]),
            'Peer purchase result and authoritative view',
          );
          return purchases[index];
        },
        start: () => host.start(),
        vote: (index) => {
          host.vote(index);
          heavy.vote(index);
        },
        pause: (value) => host.setMatchPaused(value),
        paused: () => heavy.view?.matchPaused === true,
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
        checkObservers: async (anchorId, until) => {
          const tick = heavy.view!.combatTick;
          heavy.room!.send('pauseMatch', false);
          heavy.room!.send('endMatch');
          await late.connect(
            { ...join, name: 'Late observer', classId: 'medic' },
            { roomId: host.room!.roomId },
          );
          await restWait(
            () => late.view?.matchPaused === true && !!player(late),
            'Late peer receives the authoritative paused view',
          );
          await sleep(60);
          assert.equal(heavy.view!.combatTick, tick);
          assert.equal(heavy.view!.phase, 'combat');
          assert.equal(player(heavy)!.kit.lineworkConnection?.until, until);
          const ownerRaw = heavy.room!.state.players.get(heavy.id)!;
          assert.equal(JSON.parse(ownerRaw.lineworkOwner).lineworkConnection.until, until);
          assert.deepEqual(player(late)!.skills, []);
          for (const observer of [host, late]) {
            const raw = observer.room!.state.players.get(heavy.id)!;
            assert(!raw.lineworkOwner, 'No owner line is encoded to an observing connection');
            const visible = observer.view!.players.find((p) => p.id === heavy.id)!.kit;
            assert.equal(visible.lineworkAnchor, undefined);
            assert.equal(visible.lineworkConnection, undefined);
            assert.equal(visible.lineworkFlight, undefined);
          }
          assert(
            foreign.some(
              (event) =>
                event.type === 'sound' &&
                event.owner === heavy.id &&
                event.id === 'linework-anchor',
            ),
          );
          assert(
            !foreign.some(
              (event) =>
                event.type === 'shots' && event.shots.some((shot) => shot.owner === heavy.id),
            ),
          );
          assert(!foreign.some((event) => event.type === 'remove' && event.ids.includes(anchorId)));
        },
      },
      fitting,
    );
    await restWait(
      () => [host, heavy, late].every((s) => s.view?.phase === 'defeat' && s.view.endedByHost),
      'Actual host exit reaches all three real peers',
    );
    return {
      ...result,
      realPeers: 3,
      heavyIsNonHost: true,
      ownerPrivateAnchorAndRemovals: true,
      sharedPhysicalContact: true,
      transport: 'peer',
    };
  } finally {
    late.close();
    heavy.close();
    host.close();
  }
}
