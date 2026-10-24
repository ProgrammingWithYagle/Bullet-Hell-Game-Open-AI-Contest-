import { Client, type Room } from '@colyseus/sdk';
import { WorldState } from '../shared/network-state.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  type ClassId,
  type BossId,
  type InputFrame,
  type Command,
  type Event,
  type Phase,
  type CheckpointStatus,
} from '../shared/protocol.ts';
import type { View, PlayerView } from '../shared/view.ts';
import { decodeEvents, type WireEvent } from '../shared/wire-events.ts';
import { savedBoundary, storeBoundary } from './storage.ts';
import { productionGameServer } from './deployment.ts';
export type ConnectionOptions = {
  name: string;
  classId: ClassId;
  mode: 'short' | 'endless';
  difficulty: string;
  openingBossId?: BossId;
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
  queuePosition = 0;
  checkpointStatus: CheckpointStatus = 'disabled';
  private admissionId = '';
  worker?: Worker;
  room?: Room<WorldState>;
  private closed = false;
  private recovering = false;
  onView: (view: View) => void = () => {};
  onEvents: (events: Event[]) => void = () => {};
  onStatus: (key: string) => void = () => {};
  onPurchase: (result: { ok: boolean; reason?: string }) => void = () => {};
  onCheckpointStatus: (status: CheckpointStatus) => void = () => {};
  constructor(
    readonly endpoint = import.meta.env?.VITE_GAME_SERVER ??
      (import.meta.env?.PROD ? productionGameServer : 'http://localhost:2567'),
  ) {}
  offline(options: ConnectionOptions, resume = false) {
    return new Promise<void>((resolve, reject) => {
      this.worker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'view') {
          this.receive(m.view);
          resolve();
        } else if (m.type === 'events') this.onEvents(m.events);
        else if (m.type === 'purchaseResult') this.onPurchase(m);
        else if (m.type === 'checkpoint') {
          if (!storeBoundary(m.value)) this.notify('ui.errorSave');
        } else if (m.type === 'error') reject(Error(m.key));
      };
      this.worker.onerror = () => {
        this.notify('ui.errorServer');
        reject(Error('ui.errorServer'));
      };
      this.worker.postMessage(
        resume
          ? { type: 'resume', value: savedBoundary() }
          : {
              type: 'init',
              ...options,
              settings: {
                ...options,
                seed: crypto.getRandomValues(new Uint32Array(1))[0],
                maxPlayers: 1,
              },
            },
      );
    });
  }
  async rooms(): Promise<RoomSummary[]> {
    await this.warmServer();
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
    await this.warmServer();
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
      admissionId: await this.admit(roomId ? 'join' : 'create'),
    };
    let room: Room<WorldState>;
    try {
      room = roomId
        ? await client.joinById<WorldState>(roomId, settings, WorldState)
        : await client.create<WorldState>('grave', settings, WorldState);
    } finally {
      await this.cancelAdmission();
    }
    if (this.closed) {
      if (room.connection.isOpen) await room.leave();
      throw Error('ui.errorNetwork');
    }
    this.attach(room, client);
  }
  private async warmServer() {
    this.notify('ui.serverWaking');
    const wakingDeadline = Date.now() + 75000;
    while (!this.closed) {
      try {
        const response = await fetch(this.endpoint + '/api/health', {
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          const health = await response.json();
          if (health.protocolVersion !== PROTOCOL || health.contentRevision !== CONTENT_REVISION)
            throw Error('ui.errorVersion');
          break;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'ui.errorVersion') throw error;
      }
      if (Date.now() >= wakingDeadline) throw Error('ui.errorServer');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (this.closed) throw Error('ui.errorNetwork');
  }
  private async admit(kind: 'create' | 'join') {
    const response = await fetch(this.endpoint + '/api/admission/' + kind, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error(response.status === 429 ? 'ui.errorRate' : 'ui.errorCapacity');
    let ticket = await response.json();
    if (typeof ticket.id !== 'string' || !/^[a-f0-9-]{36}$/.test(ticket.id))
      throw Error('ui.errorServer');
    this.admissionId = ticket.id;
    const deadline = Date.now() + 10 * 60000;
    while (!this.closed) {
      if (ticket.state === 'ready') {
        this.notify('ui.connecting');
        return ticket.id as string;
      }
      this.queuePosition = ticket.position;
      this.notify('ui.waitingCapacity');
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (this.closed) break;
      const poll = await fetch(this.endpoint + '/api/admission/' + this.admissionId, {
        signal: AbortSignal.timeout(10000),
      });
      if (!poll.ok) break;
      ticket = await poll.json();
    }
    await this.cancelAdmission();
    throw Error('ui.errorCapacity');
  }
  private async cancelAdmission() {
    const id = this.admissionId;
    this.admissionId = '';
    if (id)
      await fetch(this.endpoint + '/api/admission/' + id, {
        method: 'DELETE',
        signal: AbortSignal.timeout(1000),
      }).catch(() => {});
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
    room.onMessage('welcome', (m: { code: string; checkpointStatus?: CheckpointStatus }) => {
      this.code = m.code;
      this.receiveCheckpointStatus(m.checkpointStatus);
      this.notify('ui.ready');
    });
    room.onMessage('checkpointStatus', (m) => this.receiveCheckpointStatus(m?.status));
    room.onMessage('events', (events: WireEvent[]) => {
      let decoded: Event[];
      try {
        decoded = decodeEvents(events);
      } catch {
        this.notify('ui.errorVersion');
        return;
      }
      this.onEvents(decoded);
    });
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
  private receiveCheckpointStatus(status: unknown) {
    if (
      this.closed ||
      typeof status !== 'string' ||
      !['disabled', 'pending', 'acknowledged', 'unavailable', 'finalized'].includes(status)
    )
      return;
    this.checkpointStatus = status as CheckpointStatus;
    this.onCheckpointStatus(this.checkpointStatus);
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
    await this.cancelAdmission();
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
    supplyAt: p.supplyAt,
    braceUntil: p.braceUntil,
    overdriveUntil: p.overdriveUntil,
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
      id: s.bossId as View['boss']['id'],
      hurtAt: s.bossHurtAt,
      defeatedAt: s.bossDefeatedAt,
      castAt: s.bossCastAt,
      castReleaseAt: s.bossCastReleaseAt,
      castEndsAt: s.bossCastEndsAt,
      vulnerableUntil: s.bossVulnerableUntil,
      variant: s.bossVariant as 'normal' | 'brutal',
      x: s.bossX,
      y: s.bossY,
      health: s.bossHealth,
      maxHealth: s.bossMaxHealth,
      phase: s.bossPhase,
      threat: s.threat,
      deadline: s.deadline,
      staggerUntil: s.staggerUntil,
    },
    signatures: hazards.signatures ?? [],
    minions: hazards.minions ?? [],
    warnings: hazards.warnings ?? [],
    fields: hazards.fields ?? [],
    mutations: intermission.mutations ?? [],
    mutationCards: intermission.mutationCards ?? [],
    contractCards: intermission.contractCards ?? [],
    votes: intermission.votes ?? {},
    accord: JSON.parse(s.accord),
  };
}
