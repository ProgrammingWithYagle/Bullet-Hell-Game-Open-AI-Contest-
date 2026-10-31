import {TESTING_BUILD} from './build-audience.ts';
import type { ArenaSelection } from '../shared/arena-selection.ts';
import {isChatMessage,type ChatMessage} from '../shared/room-chat.ts';
import {ChatOutbox,type ChatDeliveryState} from './chat-outbox.ts';
import {RequestLifetime} from './request-lifetime.ts';
import {SessionClient} from './session-client.ts';
import {isChatReceipt} from '../shared/chat-delivery.ts';
import type {TestingCommand} from './testing-command.ts';
import { recordProfileView } from './profile.ts';
import { Client, ErrorCode, type Room } from '@colyseus/sdk';
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
import { personalView, type View, type PlayerView } from '../shared/view.ts';
import { decodeEvents, type WireEvent } from '../shared/wire-events.ts';
import { savedBoundary, storeBoundary } from './storage.ts';
import { recordPracticeCampaign } from './progress.ts';
import { defaultGameEndpoint } from './deployment.ts';
import type { TeamRecordStatus } from '../shared/team-records.ts';
import { isRankedTeamRecord, rememberTeamRecord } from './team-records.ts';
export type ConnectionOptions = {
  serverEndpoint?: string;
  name: string;
  classId: ClassId;
  mode: 'short' | 'standard' | 'long' | 'raid' | 'endless';
  difficulty: string;
  openingBossId?: BossId;
  openingArenaId?: string;
  arenaSelection?: ArenaSelection;
  practiceVariant?: 'normal' | 'brutal' | 'crazed';
};
export type RoomSummary = {
  roomId: string;
  name: string;
  mode: string;
  difficulty: string;
  players: number;
  maximumPlayers: number;
  phase: string;
  hasPassword:boolean;
};
export type RoomJoin={roomId?:string;code?:string;password?:string};
export type RoomJoinRetry=Omit<RoomJoin,'password'>;
export class Session {
  view: View | null = null;
  id = 'solo';
  code = '';
  hasPassword=false;
  #invitationPassword = '';
  get isHost() { return this.online && this.view?.owner === this.id; }
  get hostPassword() { return !this.closed && this.isHost && this.hasPassword ? this.#invitationPassword : undefined; }
  online = false;
  status = '';
  queuePosition = 0;
  checkpointStatus: CheckpointStatus = 'disabled';
  private admissionId = '';
  worker?: Worker;
  room?: Room<WorldState>;
  private closed = false;
  private readonly requests = new RequestLifetime();
  private closing?: Promise<void>;
  get signal() { return this.requests.signal; }
  private recovering = false;
  chatMessages: ChatMessage[] = [];
  onChat: () => void = () => {};
  onChatDelivery:(state:ChatDeliveryState)=>void=()=>{};
  private chatOutbox=new ChatOutbox(request=>this.room!.send('chat',request));
  get chatDelivery(){return this.chatOutbox.state;}
  private chatEnabled = false;
  private chatHistoryRetry?:ReturnType<typeof setTimeout>;
  private clearChatHistoryRetry(){if(this.chatHistoryRetry!==undefined)clearTimeout(this.chatHistoryRetry);this.chatHistoryRetry=undefined;}
  private serverAudience: 'testing'|'public' = 'testing';
  onTestingResult: (ok:boolean) => void = () => {};
  onView: (view: View) => void = () => {};
  onEvents: (events: Event[]) => void = () => {};
  onStatus: (key: string) => void = () => {};
  onPurchase: (result: { ok: boolean; reason?: string }) => void = () => {};
  onCheckpointStatus: (status: CheckpointStatus) => void = () => {};
  teamRecord?: TeamRecordStatus;
  onTeamRecord: () => void = () => {};
  constructor(
    readonly endpoint = defaultGameEndpoint,
  ) {this.chatOutbox.onChange=state=>this.onChatDelivery(state);}
  async offline(options: ConnectionOptions, resume = false) {
    this.signal.throwIfAborted();
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true; this.signal.removeEventListener('abort', cancel);
        error ? reject(error) : resolve();
      };
      const cancel = () => finish(this.signal.reason);
      this.signal.addEventListener('abort', cancel, {once: true});
      try { this.worker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' }); }
      catch (error) { finish(error); return; }
      this.worker.onmessage = (e) => {
        if (this.closed) return;
        const m = e.data;
        if (m.type === 'view') {
          this.receive(m.view);
          finish();
        } else if(m.type==='testingResult')this.onTestingResult(m.ok===true);
        else if (m.type === 'events') this.onEvents(m.events);
        else if (m.type === 'purchaseResult') this.onPurchase(m);
        else if (m.type === 'checkpoint') {
          if (!storeBoundary(m.value)) this.notify('ui.errorSave');
        } else if (m.type === 'error') finish(Error(m.key));
      };
      this.worker.onerror = () => {
        if (this.closed) return;
        this.notify('ui.errorServer');
        finish(Error('ui.errorServer'));
      };
      this.worker.postMessage(
        resume
          ? { type: 'resume', value: savedBoundary() }
          : {
              type: 'init',
              ...options,
              settings: {
                ...options,
                runId: crypto.randomUUID(),
                seed: crypto.getRandomValues(new Uint32Array(1))[0],
                maxPlayers: 1,
              },
            },
      );
    });
  }
  async rooms(): Promise<RoomSummary[]> {
    await this.warmServer();
    this.notify('ui.searchingRooms');
    const response = await this.requests.fetch(this.endpoint + '/api/rooms');
    if (!response.ok) throw Error(response.status === 429 ? 'ui.errorRate' : 'ui.errorServer');
    const rooms = await response.json(); this.signal.throwIfAborted();
    return rooms;
  }
  async connect(
    options: ConnectionOptions,
    join?: RoomJoin,
    visibility: 'public' | 'private' = 'public',
    createPassword?:string,
  ) {
    this.signal.throwIfAborted();
    this.online = true;
    await this.warmServer();
    const client = new SessionClient(this.endpoint, this.requests);
    let roomId = join?.roomId;
    if (join?.code&&!roomId)roomId=(await this.lookupRoom(join.code,false)).roomId;
    const {
      serverEndpoint: _endpoint,
      practiceVariant: _practiceVariant,
      ...roomOptions
    } = options;
    if(this.serverAudience==='public')delete roomOptions.openingBossId;
    const settings = {
      ...roomOptions,
      contentRevision: CONTENT_REVISION,
      protocolVersion: PROTOCOL,
      createKey: crypto.randomUUID(),
      visibility,
      code: join?.code?.toUpperCase(),
      password:roomId?join?.password:createPassword,
      admissionId: await this.admit(roomId ? 'join' : 'create'),
    };
    let room: Room<WorldState>;
    try {
      room = roomId
        ? await client.joinById<WorldState>(roomId, settings, WorldState)
        : await client.create<WorldState>('grave', settings, WorldState);
    } catch(error){
      if(error instanceof Error&&['passwordRequired','invalidPassword'].includes(error.message))throw Error('ui.errorRoomPassword');
      if(error instanceof Error&&error.message==='invalidPasswordSetting')throw Error('ui.roomPasswordHelp');
      if(error instanceof Error&&error.message==='versionMismatch')throw Error('ui.errorVersion');
      if(error instanceof Error&&error.message==='capacity')throw Error('ui.errorCapacity');
      if(error instanceof Error&&error.message==='invalidCode')throw Error('ui.errorCode');
      if(error instanceof Error&&(error.message==='roomClosed'||'code' in error&&error.code===ErrorCode.MATCHMAKE_INVALID_ROOM_ID))throw Error('ui.errorRoomUnavailable');
      throw error;
    } finally {
      await this.cancelAdmission();
    }
    if (this.closed) {
      if (room.connection.isOpen) await room.leave();
      throw Error('ui.errorNetwork');
    }
    this.#invitationPassword = (roomId ? join?.password : createPassword) ?? '';
    this.attach(room, client);
  }
  async lookupRoom(code:string,warm=true):Promise<{roomId:string;hasPassword:boolean}>{
    if(warm)await this.warmServer();
    this.notify('ui.findingRoom');
    const response=await this.requests.fetch(this.endpoint+'/api/rooms/code/'+encodeURIComponent(code.toUpperCase()));
    if(!response.ok)throw Error(response.status===429?'ui.errorRate':[400,404].includes(response.status)?'ui.errorCode':'ui.errorServer');
    const value=await response.json();
    this.signal.throwIfAborted();
    if(typeof value.roomId!=='string'||typeof value.hasPassword!=='boolean')throw Error('ui.errorServer');
    return {roomId:value.roomId,hasPassword:value.hasPassword};
  }
  private async warmServer() {
    this.signal.throwIfAborted();
    this.notify('ui.serverWaking');
    const wakingDeadline = Date.now() + 75000;
    while (!this.closed) {
      try {
        const response = await this.requests.fetch(this.endpoint + '/api/health');
        if (response.ok) {
          const health = await response.json().catch(() => { throw Error('ui.errorServerAddress'); });
          this.signal.throwIfAborted();
          if (!health || typeof health !== 'object' || !Number.isInteger(health.protocolVersion) || typeof health.contentRevision !== 'string') throw Error('ui.errorServerAddress');
          this.serverAudience=health.audience==='public'?'public':'testing';
          if (health.protocolVersion !== PROTOCOL || health.contentRevision !== CONTENT_REVISION)
            throw Error('ui.errorVersion');
          break;
        }
        if (response.status === 429) throw Error('ui.errorRate');
      } catch (error) {
        this.signal.throwIfAborted();
        if (error instanceof Error && ['ui.errorVersion','ui.errorServerAddress','ui.errorRate'].includes(error.message)) throw error;
      }
      if (Date.now() >= wakingDeadline) throw Error('ui.errorServer');
      await this.requests.wait(1500);
    }
    if (this.closed) throw Error('ui.errorNetwork');
  }
  private async admit(kind: 'create' | 'join') {
    try {
    const response = await this.requests.fetch(this.endpoint + '/api/admission/' + kind, {
      method: 'POST',
    });
    if (!response.ok) throw Error(response.status === 429 ? 'ui.errorRate' : 'ui.errorCapacity');
    let ticket = await response.json();
    if (typeof ticket.id !== 'string' || !/^[a-f0-9-]{36}$/.test(ticket.id))
      throw Error('ui.errorServer');
    this.admissionId = ticket.id;
    this.signal.throwIfAborted();
    const deadline = Date.now() + 10 * 60000;
    while (!this.closed) {
      if (ticket.state === 'ready') {
        this.notify('ui.connecting');
        return ticket.id as string;
      }
      this.queuePosition = ticket.position;
      this.notify('ui.waitingCapacity');
      if (Date.now() >= deadline) break;
      await this.requests.wait(1000);
      if (this.closed) break;
      const poll = await this.requests.fetch(this.endpoint + '/api/admission/' + this.admissionId);
      if (!poll.ok) break;
      ticket = await poll.json();
    }
    await this.cancelAdmission();
    throw Error('ui.errorCapacity');
    } catch (error) {
      await this.cancelAdmission();
      if (this.closed) throw new DOMException('ui.errorCapacity', 'AbortError');
      throw error;
    }
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
    this.clearChatHistoryRetry();
    this.room = room;
    this.id = room.sessionId;
    // Own the retry lifetime so leaving during a retry cannot reopen an old session.
    room.reconnection.enabled = false;
    room.onMessage('welcome', (m: { code: string;hasPassword?:boolean; checkpointStatus?: CheckpointStatus; teamRecord?: TeamRecordStatus }) => {
      this.code = m.code;
      this.hasPassword=m.hasPassword===true;
      this.receiveCheckpointStatus(m.checkpointStatus);
      if (m.teamRecord) this.receiveTeamRecord(m.teamRecord);
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
    room.onMessage('chat',(m:unknown)=>this.receiveChat(m));
    room.onMessage('chatReceipt',(value:unknown)=>{
      if(!isChatReceipt(value)||value.ok&&value.message.senderId!==this.id)return;
      if(this.chatOutbox.receive(value)&&value.ok)this.receiveChat(value.message);
    });
    room.onMessage('teamRecord', (m: unknown) => this.receiveTeamRecord(m));
    room.onMessage('chatHistory',(m:unknown)=>{if(this.room!==room)return;this.clearChatHistoryRetry();this.receiveChat(m,true);});
    room.onMessage('chatHistoryRetry',(value:unknown)=>{
      if(this.room!==room||this.closed||!this.chatEnabled||!value||typeof value!=='object'||Array.isArray(value))return;
      const after=(value as {afterMs?:unknown}).afterMs;
      if(Object.keys(value).length!==1||typeof after!=='number'||!Number.isInteger(after)||after<1||after>5000)return;
      this.clearChatHistoryRetry();
      this.chatHistoryRetry=setTimeout(()=>{this.chatHistoryRetry=undefined;if(!this.closed&&this.chatEnabled&&this.room===room&&room.connection.isOpen)room.send('chatSettings',true);},after+25);
    });
    room.onStateChange((state) => this.receive(networkView(state)));
    room.onDrop(() => {
      if(this.room!==room)return;
      this.chatOutbox.disconnected();
      this.clearChatHistoryRetry();
      void this.recover(client, room.reconnectionToken);
    });
    room.onLeave(() => {
      if(this.room!==room)return;
      this.chatOutbox.disconnected();
      if (!this.recovering) this.notify('ui.errorNetwork');
    });
    room.onError(() => {
      if(this.room!==room)return;
      this.chatOutbox.disconnected();
      if (!this.recovering) this.notify('ui.errorNetwork');
    });
    room.send('ready');
    room.send('chatSettings',this.chatEnabled);
    if (room.state.players.size) this.receive(networkView(room.state));
  }
  private async recover(client: Client, token: string) {
    if (this.closed || this.recovering) return;
    this.recovering = true;
    this.notify('ui.reconnecting');
    const deadline = Date.now() + 60000;
    let attempt = 0;
    while (!this.closed && Date.now() < deadline) {
      try { await this.requests.wait(Math.min(5000, 250 * 2 ** attempt++)); }
      catch { break; }
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
  private recordedProgress = '';
  private receiveTeamRecord(value: unknown) {
    if (!value || typeof value !== 'object' || !('status' in value)) return;
    const record = value as TeamRecordStatus;
    if (!['saved','unavailable','ineligible'].includes(record.status)) return;
    if (record.status === 'saved' && !isRankedTeamRecord(record.record)) return;
    if (record.status === 'saved') rememberTeamRecord(this.endpoint, record.record);
    this.teamRecord = record;
    this.onTeamRecord();
  }
  private profileRetryAt = 0;
  private recordedCampaign = '';
  private receive(view: View) {
    if (this.closed) return;
    view = personalView(view, this.id);
    const player = view.players.find((p) => p.id === this.id);
    const progressKey = JSON.stringify([
      view.run?.id,
      view.run?.testingModified === true,
      player?.progress,
      view.encounter,
      view.secretStatus,
      view.phase,
    ]);
    if (
      typeof localStorage !== 'undefined' &&
      progressKey !== this.recordedProgress &&
      Date.now() >= this.profileRetryAt
    ) {
      try {
        if (view.run.testingModified && !recordPracticeCampaign(view, this.id, localStorage)) throw Error("ui.errorSave");
        recordProfileView(view, this.id, localStorage);
        this.recordedProgress = progressKey;
        if (this.status === 'ui.errorSave') this.notify('');
      } catch {
        this.profileRetryAt = Date.now() + 10000;
        this.notify('ui.errorSave');
      }
    }

    const recordKey = view.campaignBank?.runId + ':' + view.secretStatus;
    if (view.campaignBank && !view.run.testingModified && recordKey !== this.recordedCampaign) {
      this.recordedCampaign = recordKey;
      if (
        typeof localStorage !== 'undefined' &&
        !recordPracticeCampaign(view, this.id, localStorage)
      )
        this.notify('ui.errorSave');
    }
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
  endRun() {
    if (this.online) { if (this.room?.connection.isOpen) this.room.send('endRun'); }
    else this.worker?.postMessage({ type: 'endRun' });
  }
  setMatchPaused(value: boolean) {
    if (this.isHost && this.room?.connection.isOpen) this.room.send('pauseMatch', value);
  }
  endMatch() {
    if (this.isHost && this.room?.connection.isOpen) this.room.send('endMatch');
  }
  purchase(request: Omit<Command, 'id'>) {
    const command = { ...request, id: crypto.randomUUID() };
    if (this.online) {
      if (this.room?.connection.isOpen) this.room.send('purchase', command);
      else this.notify('ui.errorNetwork');
    } else this.worker?.postMessage({ type: 'purchase', request: command });
  }
  testingCommand(value:TestingCommand){
    if(TESTING_BUILD&&!this.online)this.worker?.postMessage({type:'testingCommand',value});
  }
  setChatEnabled(value:boolean){
    if(this.chatEnabled===value)return;
    this.chatEnabled=value;
    if(!value)this.clearChatHistoryRetry();
    if(!value){this.chatOutbox.disabled();this.chatMessages=[];this.onChat();}
    if(this.online&&this.room?.connection.isOpen)this.room.send('chatSettings',value);
  }
  sendChat(value:string){
    return this.chatOutbox.send(value,!this.closed&&this.online&&this.room?.connection.isOpen===true,this.chatEnabled);
  }
  private receiveChat(value:unknown,history=false){
    if(!this.chatEnabled)return;
    const incoming=history?(Array.isArray(value)&&value.length<=50?value.filter(isChatMessage):[]):isChatMessage(value)?[value]:[];
    if(!incoming.length)return;
    const all=history?incoming:[...this.chatMessages,...incoming];
    this.chatMessages=[...new Map(all.map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id).slice(-50);this.onChat();
  }
  pause(value: boolean) {
    if (!this.online) this.worker?.postMessage({ type: 'pause', value });
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closed = true;
    this.#invitationPassword = '';
    this.requests.cancel();
    this.chatOutbox.destroy();
    this.clearChatHistoryRetry();
    this.worker?.terminate();
    this.closing = (async () => {
    await this.cancelAdmission();
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
    })();
    return this.closing;
  }
}
function networkView(s: WorldState): View {
  const hazards = JSON.parse(s.hazards || '{}'),
    intermission = JSON.parse(s.intermission || '{}');
  const players: PlayerView[] = [...s.players.values()].map((p) => ({
    build: p.build,
    id: p.id,
    name: p.name,
    classId: p.classId as ClassId,
    x: p.x / 4,
    y: p.y / 4,
    aim: p.aim / 1000,
    health: p.health,
    maxHealth: p.maxHealth,
    shield: p.shield,
    maxShield: p.maxShield,
    status: p.status,
    eligible: false,
    progress: { clears: 0, rescues: 0, firstEncounter: -1, campaignClears: 0, clearedBossIds: [] },
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
    selfRevives: p.selfRevives,
    speed: p.speed,
    dashUntil: p.dashUntil,
    dashX: p.dashX,
    dashY: p.dashY,
    slowUntil: p.slowUntil,
    poisonUntil: p.poisonUntil,
    dodgeCooldown: p.dodgeCooldown,
    ...JSON.parse(p.build),
  }));
  return {
    run: intermission.run,
    tick: s.tick,
    combatTick: s.combatTick,
    phase: s.phase as Phase,
    phaseEnds: s.phaseEnds,
    encounter: s.encounter,
    owner: s.owner,
    matchPaused: s.matchPaused,
    endedByHost: s.endedByHost,
    players,
    boss: {
      id: s.bossId as View['boss']['id'],
      hurtAt: s.bossHurtAt,
      defeatedAt: s.bossDefeatedAt,
      castAt: s.bossCastAt,
      castReleaseAt: s.bossCastReleaseAt,
      castEndsAt: s.bossCastEndsAt,
      vulnerableUntil: s.bossVulnerableUntil,
      variant: s.bossVariant as 'normal' | 'brutal' | 'crazed',
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
    minions: [...s.actors.values()].map((a) => ({
      id: a.id,
      kind: a.kind as 'rat' | 'ordinary',
      x: a.x,
      y: a.y,
      oldX: a.oldX,
      oldY: a.oldY,
      health: a.health,
      maxHealth: a.maxHealth,
      speed: a.speed,
      radius: a.radius,
      damage: a.damage,
      expires: a.expires,
      attackAt: a.attackAt,
      slowUntil: a.slowUntil,
      slowMultiplier: a.slowMultiplier,
      ...(a.goalX >= 0 ? { goalX: a.goalX, goalY: a.goalY } : {}),
    })),
    bossCues: hazards.bossCues ?? [],
    classCues: hazards.classCues ?? [],
    arenaId: hazards.arenaId ?? 'gatehouse',
    warnings: hazards.warnings ?? [],
    fields: hazards.fields ?? [],
    secretStatus: intermission.secretStatus ?? 'locked',
    extensionParticipants: intermission.extensionParticipants ?? [],
    campaignBank: intermission.campaignBank ?? null,
    mutations: intermission.mutations ?? [],
    mutationCards: intermission.mutationCards ?? [],
    contractCards: intermission.contractCards ?? [],
    votes: intermission.votes ?? {},
    accord: JSON.parse(s.accord),
  };
}
