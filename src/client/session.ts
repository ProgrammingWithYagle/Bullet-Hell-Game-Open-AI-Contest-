import { Client, type Room } from '@colyseus/sdk';
import { WorldState } from '../shared/network-state.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  type ClassId,
  type InputFrame,
  type Command,
  type Event,
  type Phase,
} from '../shared/protocol.ts';
import type { View, PlayerView } from '../shared/view.ts';
export type ConnectionOptions = {
  name: string;
  classId: ClassId;
  mode: 'short' | 'endless';
  difficulty: string;
};
export type RoomSummary = {
  roomId: string;
  name: string;
  mode: string;
  difficulty: string;
  players: number;
  maximumPlayers: number;
  phase: string;
};
export class Session {
  view: View | null = null;
  id = 'solo';
  code = '';
  online = false;
  status = '';
  worker?: Worker;
  room?: Room<WorldState>;
  private closed = false;
  private recovering = false;
  onView: (view: View) => void = () => {};
  onEvents: (events: Event[]) => void = () => {};
  onStatus: (key: string) => void = () => {};
  onPurchase: (result: { ok: boolean; reason?: string }) => void = () => {};
  constructor(readonly endpoint = import.meta.env?.VITE_GAME_SERVER ?? 'http://localhost:2567') {}
  offline(options: ConnectionOptions) {
    this.worker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'view') this.receive(m.view);
      else if (m.type === 'events') this.onEvents(m.events);
      else if (m.type === 'purchaseResult') this.onPurchase(m);
    };
    this.worker.onerror = () => this.onStatus('ui.errorServer');
    this.worker.postMessage({
      type: 'init',
      ...options,
      settings: { ...options, seed: crypto.getRandomValues(new Uint32Array(1))[0], maxPlayers: 1 },
    });
  }
  async rooms(): Promise<RoomSummary[]> {
    const response = await fetch(this.endpoint + '/api/rooms', {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error('ui.errorServer');
    return response.json();
  }
  async connect(
    options: ConnectionOptions,
    join?: { roomId?: string; code?: string },
    visibility: 'public' | 'private' = 'public',
  ) {
    this.online = true;
    const client = new Client(this.endpoint);
    let roomId = join?.roomId;
    if (join?.code) {
      const response = await fetch(
        this.endpoint + '/api/rooms/code/' + encodeURIComponent(join.code.toUpperCase()),
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw Error(response.status === 429 ? 'ui.errorRate' : 'ui.errorCode');
      roomId = ((await response.json()) as { roomId: string }).roomId;
    }
    const settings = {
      ...options,
      contentRevision: CONTENT_REVISION,
      protocolVersion: PROTOCOL,
      createKey: crypto.randomUUID(),
      visibility,
      code: join?.code?.toUpperCase(),
    };
    const room = roomId
      ? await client.joinById<WorldState>(roomId, settings, WorldState)
      : await client.create<WorldState>('grave', settings, WorldState);
    this.attach(room, client);
  }
  private notify(key: string) {
    this.status = key;
    if (!this.closed) this.onStatus(key);
  }
  private attach(room: Room<WorldState>, client: Client) {
    this.room = room;
    this.id = room.sessionId;
    // Own the retry lifetime so leaving during a retry cannot reopen an old session.
    room.reconnection.enabled = false;
    room.onMessage('welcome', (m: { code: string }) => {
      this.code = m.code;
      this.notify('ui.ready');
    });
    room.onMessage('events', (events: Event[]) => this.onEvents(events));
    room.onMessage('purchaseResult', (r) => this.onPurchase(r));
    room.onStateChange((state) => this.receive(networkView(state)));
    room.onDrop(() => {
      void this.recover(client, room.reconnectionToken);
    });
    room.onLeave(() => {
      if (!this.recovering) this.notify('ui.errorNetwork');
    });
    room.onError(() => {
      if (!this.recovering) this.notify('ui.errorNetwork');
    });
    room.send('ready');
    if (room.state.players.size) this.receive(networkView(room.state));
  }
  private async recover(client: Client, token: string) {
    if (this.closed || this.recovering) return;
    this.recovering = true;
    this.notify('ui.reconnecting');
    const deadline = Date.now() + 60000;
    let attempt = 0;
    while (!this.closed && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(5000, 250 * 2 ** attempt++)));
      if (this.closed) break;
      try {
        const room = await client.reconnect<WorldState>(token, WorldState);
        if (this.closed) {
          if (room.connection.isOpen) await room.leave();
          break;
        }
        this.onEvents([{ type: 'remove', ids: [] }]);
        this.attach(room, client);
        this.recovering = false;
        this.notify('ui.reconnected');
        return;
      } catch {
        /* Retry within the reserved-slot window; do not replay stale commands. */
      }
    }
    this.recovering = false;
    if (!this.closed) this.notify('ui.errorNetwork');
  }
  private receive(view: View) {
    if (this.closed) return;
    this.view = view;
    this.onView(view);
  }
  input(input: InputFrame) {
    if (this.online) {
      if (this.room?.connection.isOpen) this.room.send('input', input);
    } else this.worker?.postMessage({ type: 'input', input });
  }
  start() {
    if (this.online) {
      if (this.room?.connection.isOpen) this.room.send('start');
    } else this.worker?.postMessage({ type: 'start' });
  }
  vote(index: number) {
    if (this.online) {
      if (this.room?.connection.isOpen) this.room.send('vote', index);
    } else this.worker?.postMessage({ type: 'vote', index });
  }
  purchase(request: Omit<Command, 'id'>) {
    const command = { ...request, id: crypto.randomUUID() };
    if (this.online) {
      if (this.room?.connection.isOpen) this.room.send('purchase', command);
      else this.notify('ui.errorNetwork');
    } else this.worker?.postMessage({ type: 'purchase', request: command });
  }
  pause(value: boolean) {
    if (!this.online) this.worker?.postMessage({ type: 'pause', value });
  }
  async close() {
    this.closed = true;
    this.worker?.terminate();
    if (this.room) {
      this.room.reconnection.enabled = false;
      if (this.room.connection.isOpen) {
        const room = this.room;
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            room.connection.close(4000);
            resolve();
          }, 2000);
          room
            .leave()
            .catch(() => room.connection.close(4000))
            .finally(() => {
              clearTimeout(timeout);
              resolve();
            });
        });
      }
    }
  }
}
function networkView(s: WorldState): View {
  const hazards = JSON.parse(s.hazards || '{}'),
    intermission = JSON.parse(s.intermission || '{}');
  const players: PlayerView[] = [...s.players.values()].map((p) => ({
    ...p.toJSON(),
    id: p.id,
    name: p.name,
    classId: p.classId as ClassId,
    x: p.x / 4,
    y: p.y / 4,
    aim: p.aim / 1000,
    health: p.health,
    maxHealth: p.maxHealth,
    shield: p.shield,
    status: p.status,
    connected: p.connected,
    ack: p.ack,
    ammo: p.ammo,
    coins: p.coins,
    sp: p.sp,
    qAt: p.qAt,
    eAt: p.eAt,
    ultimateAt: p.ultimateAt,
    dodgeAt: p.dodgeAt,
    reloadAt: p.reloadAt,
    downUntil: p.downUntil,
    reviveProgress: p.reviveProgress,
    reviveTarget: p.reviveTarget,
    speed: p.speed,
    dashUntil: p.dashUntil,
    dashX: p.dashX,
    dashY: p.dashY,
    slowUntil: p.slowUntil,
    dodgeCooldown: p.dodgeCooldown,
    ...JSON.parse(p.build),
  }));
  return {
    tick: s.tick,
    combatTick: s.combatTick,
    phase: s.phase as Phase,
    phaseEnds: s.phaseEnds,
    encounter: s.encounter,
    owner: s.owner,
    players,
    boss: {
      x: 800,
      y: 250,
      health: s.bossHealth,
      maxHealth: s.bossMaxHealth,
      phase: s.bossPhase,
      threat: s.threat,
      deadline: s.deadline,
      staggerUntil: s.staggerUntil,
    },
    warnings: hazards.warnings ?? [],
    fields: hazards.fields ?? [],
    mutations: intermission.mutations ?? [],
    mutationCards: intermission.mutationCards ?? [],
    contractCards: intermission.contractCards ?? [],
    votes: intermission.votes ?? {},
    accord: JSON.parse(s.accord),
  };
}
