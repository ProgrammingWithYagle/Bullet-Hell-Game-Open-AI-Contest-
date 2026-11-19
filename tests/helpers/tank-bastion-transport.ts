import assert from 'node:assert/strict';
import { Session } from '../../src/client/session.ts';
import { data } from '../../src/shared/game.ts';
import type { Event, InputFrame, Result } from '../../src/shared/protocol.ts';
import type { View } from '../../src/shared/view.ts';
import { restWait } from './sniper-rest-flow.ts';
import { restRaidInput, type ObservedRestShot } from './sniper-rest-raid-policy.ts';
import { confirmedPurchase, inputFrame, ordinaryShort, remember, runTankWorker } from './tank-interceptor-transport.ts';
import { earnedBastionFlow, type BastionChoice } from './tank-bastion-flow.ts';
import type { InterceptionTransport } from './tank-interceptor-earned-flow.ts';

export const runBastionWorker = (code: string, choice: BastionChoice) =>
  runTankWorker(code, transport => earnedBastionFlow(transport, choice));

export async function runBastionPeers(endpoint: string, choice: BastionChoice) {
  const host = new Session(endpoint), tank = new Session(endpoint);
  const purchases: (Result & { id?: string })[] = [], hostPurchases: (Result & { id?: string })[] = [];
  const events: Event[] = [], shared: Event[] = [], observed = new Map<number, ObservedRestShot>();
  let tankSequence = 0, hostSequence = 0;
  const player = (s: Session) => s.view?.players.find(p => p.id === s.id);
  const input = (s: Session, sequence: number, props: Partial<InputFrame>) => {
    s.input(inputFrame(s.view, sequence, props));
    return sequence;
  };
  const hostInput = (props: Partial<InputFrame>) => input(host, ++hostSequence, props);
  tank.onEvents = batch => remember(events, observed, batch, tank.view?.combatTick ?? 0);
  host.onEvents = batch => shared.push(...structuredClone(batch));
  tank.onPurchase = receipt => purchases.push(receipt);
  host.onPurchase = receipt => hostPurchases.push(receipt);

  try {
    const join = { ...ordinaryShort, maxPlayers: 4, seed: 41 };
    await host.connect({ ...join, name: 'Bastion teammate', classId: 'soldier' });
    await tank.connect({ ...join, name: 'Senn', classId: 'tank' }, { roomId: host.room!.roomId });
    await restWait(() => !!player(host) && !!player(tank), 'Both original lobbies received');
    assert.equal(tank.view!.owner, host.id);
    assert.notEqual(tank.id, host.id);
    async function equipHost() {
      for (const weapon of data.weapons.filter(w => w.classId === 'soldier').sort((a, b) => b.tier - a.tier)) {
        if (player(host)!.weapon === weapon.id) break;
        const request = { kind: 'weapon', item: weapon.id } as const, index = hostPurchases.length;
        host.purchase(request);
        await restWait(() => confirmedPurchase(host.view, host.id, request, hostPurchases[index]), 'Ordinary host weapon acknowledgment');
        if (hostPurchases[index].ok) break;
      }
    }
    await equipHost();
    const transport: InterceptionTransport & { equipAlly(): Promise<void> } = {
      equipAlly: equipHost,
      id: tank.id, view: () => tank.view ?? undefined, events, observed,
      input: props => input(tank, ++tankSequence, props),
      purchase: async request => {
        const index = purchases.length;
        tank.purchase(request);
        await restWait(() => confirmedPurchase(tank.view, tank.id, request, purchases[index]), 'Bastion purchase acknowledged over the room');
        return purchases[index];
      },
      start: () => host.start(),
      vote: index => { host.vote(index); tank.vote(index); },
      pause: value => host.setMatchPaused(value),
      paused: () => tank.view?.matchPaused === true,
      end: () => host.endMatch(),
      onFirstCombat: async () => {
        await restWait(() => host.view?.phase === 'combat' && !!player(host), 'Host reaches the same combat');
        const before = shared.length, onTank = events.length;
        const seq = hostInput({ dodge: true, aim: player(host)!.aim });
        const dodge = (event: Event) => event.type === 'sound' && event.id === 'dodge';
        await restWait(() => player(host)!.ack >= seq && shared.slice(before).some(dodge) && events.slice(onTank).some(dodge),
          'Shared event delivery independently observed');
        assert.deepEqual(shared.slice(before).find(dodge), events.slice(onTank).find(dodge));
        const neutral = hostInput({});
        await restWait(() => player(host)!.ack >= neutral, 'Ordinary host dodge released');
      },
      allyPolicy: () => {
        const p = player(host);
        if (p && host.view) hostInput(restRaidInput(host.view, p, [...observed.values()]));
      },
      stopAlly: () => { hostInput({}); },
    };
    const result = await earnedBastionFlow(transport, choice, {
      player: () => { const p = player(host); assert(p); return p; },
      input: hostInput,
      checkGate: async gate => {
        const sharedCue = (view: View | null) => view?.classCues.find(cue => cue.kind === 'tank-gate-signal' && cue.id === gate.id);
        await restWait(() => JSON.stringify(sharedCue(host.view)) === JSON.stringify(gate), 'Host receives the actual physical station');
        assert.deepEqual(sharedCue(host.view), gate);
        const foreign = host.view!.players.find(p => p.id === tank.id)!;
        assert(!Object.hasOwn(foreign.kit, 'bastionCanPlant'));
        assert(!Object.hasOwn(foreign.kit, 'bastionAdjustment'));
        assert(!host.room!.state.players.get(tank.id)!.lineworkOwner);
        assert(Object.hasOwn(player(tank)!.kit, 'bastionCanPlant'));
        assert(!shared.some(event => event.type === 'sound' && (event.id === 'tank-gate-plant' || event.id === 'tank-gate-adjust')));
      },
      checkClaim: async until => {
        await restWait(() => player(host)?.kit.armorUntil === until &&
          shared.some(event => event.type === 'sound' && event.id === 'tank-gate-claim' && event.owner === host.id),
        'Host receives the guard and the private claim event');
        assert(!events.some(event => event.type === 'sound' && event.id === 'tank-gate-claim' && event.owner === host.id));
      },
    });
    return { ...result, realPeers: 2, tankIsNonHost: true, ownerPrivate: true, transport: 'peer' };
  } finally {
    tank.close();
    host.close();
  }
}
