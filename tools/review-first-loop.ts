// Local, process-owned visual fixtures. Never imported by the shipped server.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { WorldState } from '../src/shared/network-state.ts';
import { CONTENT_REVISION, PROTOCOL, idleInput } from '../src/shared/protocol.ts';
const { server } = createGameServer();
const rooms: Room<WorldState>[] = [];
mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/visual-command.txt', '');
let cachedCommand = '';
const command = () => {
  try {
    cachedCommand = readFileSync('tmp/visual-command.txt', 'utf8').trim();
  } catch (error) {
    if (!['EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
  }
  return cachedCommand;
};
let timer: ReturnType<typeof setInterval> | undefined;
let completed = false;
const events: { at: string; command: string; phase: string; bossPhase: number }[] = [];
try {
  await server.listen(2567, '127.0.0.1');
  const client = new Client('http://127.0.0.1:2567');
  const opts = {
    mode: 'endless',
    difficulty: 'normal',
    visibility: 'public',
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    classId: 'soldier',
    name: 'Mara · visual fixture',
  };
  const register = (r: Room<WorldState>) => {
    r.reconnection.enabled = false;
    r.onMessage('*', () => {});
    rooms.push(r);
    return r;
  };
  const a = register(await client.create<WorldState>('grave', opts, WorldState));
  register(
    await client.joinById<WorldState>(
      a.roomId,
      { ...opts, classId: 'medic', name: 'Iona · visual fixture' },
      WorldState,
    ),
  );
  const live = liveRooms.get(a.roomId)!;
  live.game.damage = () => {};
  let sequence = 0,
    last = '',
    facing = -Math.PI / 2,
    wall = false,
    combatFixture = false,
    observed = '';
  console.log(
    JSON.stringify({
      ready: true,
      roomId: a.roomId,
      scriptedClients: 2,
      commands:
        'combat, north, south, east, west, walls, phase2, phase3, brutal4, vote, hold-vote, shop, hurt, done',
    }),
  );
  timer = setInterval(() => {
    const cmd = command();
    if (cmd && cmd !== last) {
      last = cmd;
      if (cmd === 'combat') {
        combatFixture = true;
        if (live.game.phase !== 'lobby') live.game.phase = 'combat';
        a.send('start');
        live.game.boss.health = live.game.boss.maxHealth = 1e8;
        live.game.boss.deadline = 1e9;
      }
      if (['north', 'south', 'east', 'west'].includes(cmd)) {
        facing = { north: -Math.PI / 2, south: Math.PI / 2, east: 0, west: Math.PI }[cmd]!;
        wall = false;
        rooms.forEach((r, i) => {
          const p = live.game.players.get(r.sessionId)!;
          p.x = 680 + i * 240;
          p.y = 700;
        });
      }
      if (cmd === 'walls') {
        wall = true;
        rooms.forEach((r, i) => {
          const p = live.game.players.get(r.sessionId)!;
          p.x = 600 + i * 300;
          p.y = 350;
        });
      }
      if (cmd === 'phase2') live.game.boss.health = live.game.boss.maxHealth * 0.55;
      if (cmd === 'phase3') live.game.boss.health = live.game.boss.maxHealth * 0.2;
      if (cmd === 'brutal4') {
        live.game.boss.variant = 'brutal';
        live.game.boss.health = live.game.boss.maxHealth * 0.1;
      }
      if (cmd === 'vote' || cmd === 'hold-vote') live.game.boss.health = 0;
      if (cmd === 'shop') {
        live.game.phase = 'shop';
        live.game.phaseEnds = live.game.tick + 18000;
        for (const p of live.game.players.values()) p.coins = 10000;
      }
      if (cmd === 'hurt') for (const p of live.game.players.values()) p.health = 40;
      events.push({
        at: new Date().toISOString(),
        command: cmd,
        phase: live.game.phase,
        bossPhase: live.game.boss.phase + 1,
      });
      console.log(JSON.stringify(events.at(-1)));
    }
    if (cmd === 'hold-vote' && live.game.phase === 'mutationVote')
      live.game.phaseEnds = live.game.tick + 450;
    if (combatFixture && live.game.phase === 'combat' && live.game.boss.deadline < 1e8) {
      live.game.boss.health = live.game.boss.maxHealth = 1e8;
      live.game.boss.deadline = 1e9;
    }
    const observation = live.game.phase + ':' + live.game.boss.variant + ':' + live.game.boss.phase;
    if (observation !== observed) {
      observed = observation;
      events.push({
        at: new Date().toISOString(),
        command: 'observed-state',
        phase: live.game.phase,
        bossPhase: live.game.boss.phase + 1,
      });
    }
    sequence++;
    for (const r of rooms) {
      const p = live.game.players.get(r.sessionId)!;
      if (live.game.phase === 'combat')
        r.send('input', {
          ...idleInput(),
          sequence,
          moveX: wall ? 0 : Math.sin(sequence * 0.025),
          moveY: wall ? -1 : 0,
          aim: wall ? -Math.PI / 2 : facing,
          dodge: wall && sequence % 120 === 0,
        });
      p.invulnerableUntil = 1e9;
    }
  }, 1000 / 30);
  const deadline = Date.now() + 45 * 60000;
  while (command() !== 'done') {
    if (Date.now() > deadline) throw Error('Visual review fixture timed out');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  completed = true;
} finally {
  mkdirSync('reviews/ui', { recursive: true });
  writeFileSync(
    'reviews/ui/first-loop-visual-fixture.json',
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        protocolVersion: PROTOCOL,
        contentRevision: CONTENT_REVISION,
        completed,
        events,
        limits: [
          'Assistant-operated browser and two scripted clients. No human playtest.',
          'Damage suppressed; selected positions, boss HP and shop currency explicitly injected. Hold-vote freezes that review timer only. Not performance evidence.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
  if (timer) clearInterval(timer);
  await Promise.allSettled(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
  await server.gracefullyShutdown(false);
}
