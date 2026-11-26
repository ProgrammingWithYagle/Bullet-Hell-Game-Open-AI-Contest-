// Real SDK Sessions, separate OS authority, isolated records and accelerated QA clears.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { CloseCode } from '@colyseus/sdk';
import { Session, type ConnectionOptions } from '../../src/client/session.ts';
import { RequestLifetime } from '../../src/client/request-lifetime.ts';
import { data } from '../../src/shared/game.ts';
import {
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
  idleInput,
  type ModeId,
} from '../../src/shared/protocol.ts';
import { fetchBoard, fetchRoster } from '../../src/client/team-records.ts';
import { squadBand } from '../../src/shared/team-records.ts';
const root = path.dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(
  fs.readFileSync(path.join(root, 'freeze.json'), 'utf8'),
);
const label = process.argv[2] ?? '01',
  sizes = process.argv.slice(3).map(Number);
assert(/^\d{2}$/.test(label));
assert(sizes.length && sizes.every((n) => [8, 16, 50].includes(n)));
const scope = 'reviews/shared-network-2026-10-30',
  output = 'output/shared-network-2026-10-30/run-' + label;
const reportPath = scope + '/progression-' + label + '.json';
assert(!fs.existsSync(reportPath) && !fs.existsSync(output));
fs.mkdirSync(output);
const sha = (p: string) =>
  createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const bundle of freeze.bundles)
  assert.equal(
    sha(path.join(root, bundle.name)),
    bundle.sha256,
    'Frozen bundle changed',
  );
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, note: string, timeout = 16000) {
  const end = Date.now() + timeout;
  while (!check()) {
    assert(Date.now() < end, note);
    await delay(20);
  }
}
const cases: any[] = [],
  startedAt = new Date().toISOString();
let failed: unknown;
const requests: any[] = [];
const originalFetch = RequestLifetime.prototype.fetch;
RequestLifetime.prototype.fetch = function (input, init = {}, timeout = 10000) {
  const url = new URL(input instanceof Request ? input.url : String(input)),
    start = performance.now();
  const route = url.pathname
    .replace(/(\/api\/admission\/)(?!join$|create$)[^/]+$/, '$1:id')
    .replace(/(\/api\/rooms\/code\/)[^/]+$/, '$1:code')
    .replace(/(\/matchmake\/joinById\/)[^/]+$/, '$1:id');
  const record: any = {
    at: new Date().toISOString(),
    method: init.method ?? 'GET',
    route,
  };
  requests.push(record);
  return originalFetch.call(this, input, init, timeout).then(
    (response) => {
      record.status = response.status;
      record.elapsedMs = performance.now() - start;
      return response;
    },
    (error) => {
      record.error = String(error);
      record.elapsedMs = performance.now() - start;
      throw error;
    },
  );
};
function announce(size: number, stage: string) {
  console.log(JSON.stringify({ at: new Date().toISOString(), size, stage }));
}
async function authority(database: string) {
  const child = fork(path.join(root, 'server.mjs'), [database], {
    execArgv: [],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, RENDER_GIT_COMMIT: freeze.reviewedHead },
  });
  let next = 0,
    errors = '',
    exited = false;
  const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: Error) => void }
  >();
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', (bytes) => {
    errors = (errors + String(bytes)).slice(-24000);
  });
  const ready = new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.on('message', (raw: any) => {
      if (raw.ready) resolve(raw.ready);
      else if (raw.id) {
        const item = pending.get(raw.id);
        pending.delete(raw.id);
        raw.error ? item?.reject(Error(raw.error)) : item?.resolve(raw.result);
      }
    });
    child.once('exit', (code) => {
      exited = true;
      const error = Error('QA authority exited ' + code + ' ' + errors);
      reject(error);
      for (const item of pending.values()) item.reject(error);
      pending.clear();
    });
  });
  const port = await ready;
  const ask = (kind: string, roomId = '') =>
    new Promise<any>((resolve, reject) => {
      const id = ++next;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(Error('IPC timeout: ' + kind));
      }, 20000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      child.send({ id, kind, roomId });
    });
  return {
    endpoint: 'http://127.0.0.1:' + port,
    pid: child.pid,
    ask,
    async close() {
      if (exited) return;
      const result = await ask('close');
      await until(() => exited, 'QA authority did not exit', 10000);
      assert.equal(result.rooms, 0);
      assert.equal(result.capacity.reservedSlots, 0);
      return result;
    },
    errors: () => errors,
  };
}
async function run(size: number) {
  const loop = monitorEventLoopDelay({ resolution: 20 }),
    cpuStart = process.cpuUsage(),
    eluStart = performance.eventLoopUtilization(),
    requestStart = requests.length;
  loop.enable();
  const mode: ModeId = size === 8 ? 'short' : size === 16 ? 'raid' : 'endless',
    visibility = size === 16 ? 'private' : 'public';
  const database = path.resolve(output, 'qa-' + size + '.sqlite'),
    server = await authority(database),
    sessions: Session[] = [],
    active: Session[] = [];
  let timer: ReturnType<typeof setInterval> | undefined,
    frame = 0,
    roomId = '',
    host: Session;
  const stats = new Map<
      Session,
      { sequence: number; events: number; purchases: number }
    >(),
    steps: any[] = [],
    markers: any[] = [];
  const result: any = {
    size,
    mode,
    visibility,
    difficulty: 'normal',
    serverPid: server.pid,
    sourceCommit: freeze.runtimeSourceCommit,
    reviewedHead: freeze.reviewedHead,
    passed: false,
    steps,
    encounters: markers,
    syntheticQAClears: true,
    fixtureProtection: true,
    phaseDeadlinesAccelerated: true,
    renderedClients: 0,
    network: 'loopback',
  };
  const options = (i: number): ConnectionOptions => ({
    name: ['QA 日本語 ', 'QA العربية ', 'QA हिन्दी ', 'QA 한국어 '][i % 4] + i,
    classId: implementedClassIds[i % 7],
    mode,
    difficulty: 'normal',
    openingArenaId: 'ossuary-works',
    arenaSelection: 'fixed',
  });
  const add = () => {
    const s = new Session(server.endpoint);
    s.setChatEnabled(true);
    sessions.push(s);
    stats.set(s, { sequence: 0, events: 0, purchases: 0 });
    s.onEvents = (events) => {
      stats.get(s)!.events += events.length;
    };
    return s;
  };
  const snapshot = () => server.ask('snapshot', roomId);
  const phase = async (value: string) =>
    until(
      () => active.every((s) => s.view?.phase === value),
      'Peers did not agree on ' + value,
    );
  const buy = async (
    s: Session,
    kind: 'skill' | 'upgrade' | 'supply',
    item: string,
  ) => {
    let response: { ok: boolean; reason?: string } | undefined;
    s.onPurchase = (value) => {
      response = value;
    };
    s.purchase({ kind, item });
    await until(() => Boolean(response), 'Purchase confirmation missing');
    stats.get(s)!.purchases++;
    return response!;
  };
  const self = (s: Session) => s.view!.players.find((p) => p.id === s.id)!;
  const build = async (encounter: number) => {
    for (let offset = 0; offset < active.length; offset += 8)
      await Promise.all(
        active.slice(offset, offset + 8).map(async (s, local) => {
          const index = offset + local,
            p = self(s),
            roots = data.skills.filter(
              (n) => n.classId === p.classId && !n.prerequisite,
            ),
            rootSkill = roots[index % roots.length];
          const chain = data.skills
            .filter(
              (n) =>
                n.classId === p.classId &&
                n.subbranchId === rootSkill.subbranchId,
            )
            .sort((a, b) => a.depth - b.depth);
          const limit = 1 + ((index + encounter) % 4);
          let bought = 0;
          for (const skill of chain) {
            const current = self(s);
            if (current.skills.includes(skill.id)) continue;
            if (
              (skill.prerequisite &&
                !current.skills.includes(skill.prerequisite)) ||
              current.sp < skill.cost ||
              bought >= limit
            )
              break;
            const before = current.sp,
              r = await buy(s, 'skill', skill.id);
            assert(r.ok, JSON.stringify(r));
            await until(
              () =>
                self(s).skills.includes(skill.id) &&
                self(s).sp === before - skill.cost,
              'Skill state/cost mismatch',
            );
            bought++;
          }
          if ((index + encounter) % 3 === 0 && self(s).coins >= 90) {
            const before = self(s).coins,
              r = await buy(s, 'supply', 'medkit');
            if (r.ok)
              await until(
                () => self(s).coins === before - 90,
                'Supply cost mismatch',
              );
            else assert.equal(r.reason, 'inventoryFull');
          } else if (self(s).coins >= 90) {
            const before = self(s).coins,
              level = self(s).upgrades.damage ?? 0,
              r = await buy(s, 'upgrade', 'damage');
            if (r.ok)
              await until(
                () =>
                  (self(s).upgrades.damage ?? 0) === level + 1 &&
                  self(s).coins < before,
                'Upgrade state/cost mismatch',
              );
            else
              assert(
                ['insufficientCoins', 'upgradeMaximum'].includes(r.reason!),
              );
          }
        }),
      );
  };
  try {
    announce(size, 'joining');
    host = add();
    await host.connect(options(0), undefined, visibility, 'QA-only password');
    active.push(host);
    await until(
      () => Boolean(host.code) && host.isHost,
      'Host welcome missing',
    );
    roomId = host.room!.roomId;
    const joinOptions =
      visibility === 'private'
        ? { code: host.code, password: 'QA-only password' }
        : { roomId, password: 'QA-only password' };
    for (let offset = 1; offset < size; offset += 6) {
      await Promise.all(
        Array.from({ length: Math.min(6, size - offset) }, async (_, n) => {
          const i = offset + n,
            s = add();
          await s.connect(options(i), joinOptions);
          active[i] = s;
        }),
      );
      announce(size, 'joined batch ' + Math.min(size, offset + 6));
    }
    await until(
      () =>
        active.length === size &&
        active.every(
          (s) => s.view?.players.length === size && s.status === 'ui.ready',
        ),
      'Full waiting room did not replicate',
    );
    let snap = await snapshot();
    assert.equal(snap.clients, size);
    assert.equal(snap.phase, 'lobby');
    assert.equal(new Set(snap.players.map((p: any) => p.classId)).size, 7);
    const rooms = await fetch(server.endpoint + '/api/rooms').then((r) =>
      r.json(),
    );
    assert.equal(rooms.length, visibility === 'public' ? 1 : 0);
    if (rooms.length) {
      assert.equal(rooms[0].players, size);
      assert.equal(rooms[0].hasPassword, true);
      assert(!JSON.stringify(rooms).includes('QA-only password'));
    }
    const overflow = add();
    const overflowStatuses: string[] = [];
    overflow.onStatus = (key) => overflowStatuses.push(key);
    let overflowError: unknown,
      overflowDone = false;
    const joining = overflow.connect(options(size + 5), joinOptions).then(
      () => {
        overflowDone = true;
      },
      (error) => {
        overflowDone = true;
        overflowError = error;
      },
    );
    if (size === 50) {
      await until(
        () => overflowStatuses.includes('ui.waitingCapacity'),
        'Full instance did not offer its queue',
      );
      assert.equal(overflow.queuePosition, 1);
      await overflow.close();
    }
    await joining;
    assert(overflowDone && overflowError, 'Over-capacity join must not enter');
    await overflow.close();
    assert.equal((await snapshot()).clients, size);
    steps.push({
      stage: 'waiting room',
      connected: size,
      allSevenClasses: true,
      fullRoomRejectedOrQueued: true,
      privateListingCorrect: true,
    });
    await build(0);
    const duplicateClient = active[0],
      beforeDuplicate = self(duplicateClient).sp;
    const duplicateSkill = data.skills.find(
      (n) =>
        n.classId === self(duplicateClient).classId &&
        !n.prerequisite &&
        !self(duplicateClient).skills.includes(n.id),
    )!;
    const command = {
      id: randomUUID(),
      kind: 'skill',
      item: duplicateSkill.id,
    };
    let duplicateReplies = 0;
    duplicateClient.onPurchase = (result) => {
      assert(result.ok);
      duplicateReplies++;
    };
    duplicateClient.room!.send('purchase', command);
    duplicateClient.room!.send('purchase', command);
    await until(
      () =>
        duplicateReplies === 2 &&
        self(duplicateClient).sp === beforeDuplicate - duplicateSkill.cost,
      'Duplicate acknowledgement or exact skill cost missing',
    );
    assert.equal(
      self(duplicateClient).skills.filter((id) => id === duplicateSkill.id)
        .length,
      1,
    );
    steps.push({
      stage: 'purchases',
      mixedEarnedBuilds: true,
      duplicateSuccessAcknowledgedTwice: true,
      duplicateChargedOnce: true,
    });
    for (const guest of active.slice(1)) guest.start();
    await delay(150);
    assert.equal((await snapshot()).phase, 'lobby');
    host.start();
    await phase('combat');
    timer = setInterval(() => {
      frame++;
      for (const s of active) {
        if (
          !s.room?.connection.isOpen ||
          s.view?.phase !== 'combat' ||
          s.view.matchPaused ||
          self(s)?.status !== 'active'
        )
          continue;
        const p = self(s),
          v = s.view,
          st = stats.get(s)!;
        s.input({
          ...idleInput(),
          sequence: ++st.sequence,
          clientTick: v.tick,
          moveX: Math.sin((frame + active.indexOf(s) * 3) / 18),
          moveY: Math.cos((frame + active.indexOf(s) * 3) / 18),
          aim: Math.atan2(v.boss.y - p.y, v.boss.x - p.x),
          fire: true,
          q: frame % 40 === 1,
          e: frame % 45 === 1,
          ultimate: frame % 120 === 1,
          reload: frame % 60 === 1,
        });
      }
    }, 50);
    const fights = size === 8 ? 5 : 3;
    for (let fight = 0; fight < fights; fight++) {
      announce(size, 'combat ' + (fight + 1));
      await phase('combat');
      await server.ask('protect', roomId);
      const start = await snapshot();
      await until(
        () =>
          active
            .filter((s) => self(s).status === 'active')
            .every((s) => self(s).ack > 0),
        'Players did not acknowledge inputs',
      );
      await delay(2200);
      if (fight === 0) {
        const guest = active[1],
          before = await snapshot();
        guest.room!.send('pauseMatch', true);
        guest.pause(true);
        await delay(180);
        assert(
          (await snapshot()).tick > before.tick,
          'Guest menu paused match',
        );
        host.setMatchPaused(true);
        await until(
          () => active.every((s) => s.view?.matchPaused),
          'Pause did not reach every peer',
        );
        const frozen = await snapshot();
        const response = await buy(guest, 'supply', 'medkit');
        assert.equal(response.reason, 'matchPaused');
        assert(host.sendChat('QA: chat while paused'));
        await until(
          () =>
            active.every((s) =>
              s.chatMessages.some((m) => m.text === 'QA: chat while paused'),
            ),
          'Paused chat did not reach entire room',
        );
        await delay(180);
        assert.equal((await snapshot()).tick, frozen.tick);
        await host.close();
        active.splice(0, 1);
        await until(
          () =>
            active.filter((s) => s.isHost).length === 1 &&
            active.every((s) => s.view?.matchPaused === false) &&
            active.every(
              (s) => s.view?.owner === active.find((peer) => peer.isHost)!.id,
            ) &&
            active.find((s) => s.isHost)!.hostPassword === 'QA-only password',
          'Host transfer did not resume the room',
        );
        host = active.find((s) => s.isHost)!;
        assert.equal(host.hostPassword, 'QA-only password');
        for (const s of active.filter((s) => s !== host))
          assert.equal(s.hostPassword, undefined);
        const replacement = add();
        await replacement.connect(options(size), joinOptions);
        active.push(replacement);
        await until(
          () => active.every((s) => s.view?.players.length === size),
          'Replacement did not fill room',
        );
        assert.equal(self(replacement).status, 'waiting');
        const reconnect = active.find((s) => s !== host && s !== replacement)!,
          oldRoom = reconnect.room,
          oldId = reconnect.id,
          oldBuild = structuredClone({
            skills: self(reconnect).skills,
            upgrades: self(reconnect).upgrades,
            coins: self(reconnect).coins,
          });
        const reconnectStatuses: string[] = [];
        reconnect.onStatus = (status) => reconnectStatuses.push(status);
        reconnect.room!.connection.close(
          CloseCode.MAY_TRY_RECONNECT,
          'QA transport interruption',
        );
        await until(
          () =>
            reconnect.room !== oldRoom &&
            reconnectStatuses.includes('ui.reconnected') &&
            reconnect.room?.connection.isOpen === true &&
            reconnect.view?.players.some(
              (p) => p.id === oldId && p.connected,
            ) === true,
          'Reconnect lost the slot/build',
          22000,
        );
        assert.equal(reconnect.id, oldId);
        assert.deepEqual(
          {
            skills: self(reconnect).skills,
            upgrades: self(reconnect).upgrades,
            coins: self(reconnect).coins,
          },
          oldBuild,
        );
        steps.push({
          stage: 'host and reconnect',
          guestCouldNotPause: true,
          allPeersPaused: true,
          pausedChatConfirmed: true,
          purchasesBlockedWhilePaused: true,
          hostDepartureContinued: true,
          inviteTransferredPrivately: true,
          replacementWaitsForBoundary: true,
          reconnectPreservedBuild: true,
        });
      }
      const beforeClear = await snapshot();
      markers.push({
        fight: fight + 1,
        bossId: beforeClear.boss.id,
        arena: beforeClear.arena,
        active: beforeClear.players.filter(
          (p: any) => p.connected && p.status === 'active',
        ).length,
        classes: [
          ...new Set(
            beforeClear.players
              .filter((p: any) => p.connected)
              .map((p: any) => p.classId),
          ),
        ],
        combatTicks: beforeClear.combatTick - start.combatTick,
      });
      assert.equal(beforeClear.arena, 'ossuary-works');
      await server.ask('clear', roomId);
      await until(
        () => active.every((s) => s.view?.phase !== 'combat'),
        'Defeat did not reach all peers',
      );
      if (fight === fights - 1) break;
      await until(
        () =>
          active.every(
            (s) => s.view && s.view.tick >= s.view.boss.defeatedAt + 150,
          ),
        'Five-second defeat interval not reached',
        18000,
      );
      for (const expected of [
        'mutationVote',
        'contractVote',
        'shop',
        'loading',
      ]) {
        await phase(expected);
        if (expected === 'mutationVote' || expected === 'contractVote') {
          for (const [i, s] of active.entries()) s.vote(i % 2);
          await until(
            () =>
              active.every((s) => Object.keys(s.view!.votes).length === size),
            'Votes did not replicate',
          );
          const voted = await snapshot();
          assert.equal(voted.votes.length, size);
          assert.equal(
            voted.votes.filter(([, v]: [string, number]) => v === 0).length,
            size / 2,
          );
          assert.equal(
            voted.votes.filter(([, v]: [string, number]) => v === 1).length,
            size / 2,
          );
        } else if (expected === 'shop') await build(fight + 1);
        await server.ask('advance', roomId);
        await until(
          () => active.every((s) => s.view?.phase !== expected),
          'Phase did not advance',
        );
      }
    }
    if (mode === 'endless') {
      const guest = active.at(-1)!;
      guest.room!.send('endRun');
      await delay(100);
      assert.notEqual((await snapshot()).phase, 'victory');
      host.endRun();
    }
    await until(
      () => active.every((s) => s.teamRecord?.status === 'saved'),
      'Shared result did not reach every peer',
      18000,
    );
    const saved = active[0].teamRecord!;
    assert(saved.status === 'saved');
    for (const s of active) assert.deepEqual(s.teamRecord, saved);
    assert.equal(saved.record.peakPlayers, size);
    assert.equal(saved.record.rosterCount, size + 1);
    assert.equal(saved.record.clears, fights);
    const board = await fetchBoard(
      server.endpoint,
      new URLSearchParams({
        mode,
        difficulty: 'normal',
        sizeBand: squadBand(size),
      }),
    );
    assert.equal(board.total, 1);
    assert.equal(board.rows[0].rank, 1);
    const roster = [];
    let offset: number | null = 0,
      pages = 0;
    while (offset !== null) {
      const page = await fetchRoster(
        server.endpoint,
        saved.record.runId,
        offset,
      );
      roster.push(...page.participants);
      offset = page.nextOffset;
      pages++;
    }
    assert.equal(roster.length, size + 1);
    assert.equal(new Set(roster.map((p) => p.id)).size, size + 1);
    assert(
      roster.some((p) => p.firstEncounter === 2),
      'Replacement should first participate at next encounter',
    );
    const serialized = JSON.stringify({ board, roster });
    for (const s of sessions)
      if (s.id !== 'solo')
        assert(!serialized.includes(s.id), 'Transport ID leaked');
    assert(!serialized.includes('QA-only password'));
    const final = await snapshot();
    result.record = {
      runId: saved.record.runId,
      peakPlayers: saved.record.peakPlayers,
      rosterCount: saved.record.rosterCount,
      clears: saved.record.clears,
      rank: board.rows[0].rank,
      rosterPages: pages,
    };
    result.input = {
      accepted: final.telemetry.acceptedInputs,
      rejected: final.telemetry.rejectedInputs,
      clientsWithEvents: active.filter((s) => stats.get(s)!.events > 0).length,
      encodedOutboundBytes: final.telemetry.encodedOutboundBytes,
      peakProjectiles: final.telemetry.peakProjectiles,
      tickSamples: final.telemetry.tickSamples,
    };
    assert.equal(result.input.rejected, 0);
    assert.equal(result.input.clientsWithEvents, size);
    result.mixedBuilds = new Set(
      active.map((s) =>
        JSON.stringify({
          classId: self(s).classId,
          skills: self(s).skills,
          upgrades: self(s).upgrades,
        }),
      ),
    ).size;
    assert(result.mixedBuilds >= 7);
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    await Promise.allSettled(sessions.map((s) => s.close()));
    result.closed = await server.close();
    const reopened = await authority(database);
    try {
      const restored = await fetchRoster(reopened.endpoint, saved.record.runId);
      assert.deepEqual(restored.record, saved.record);
      result.persistedAfterRestart = true;
    } finally {
      await reopened.close();
    }
    result.database = {
      path: database,
      bytes: fs.statSync(database).size,
      sha256: sha(database),
    };
    result.passed = true;
    announce(size, 'passed');
  } catch (error) {
    result.error = error instanceof Error ? error.stack : String(error);
    try {
      result.failureSnapshot = roomId
        ? await snapshot()
        : await server.ask('capacity');
    } catch {
      result.failureSnapshotUnavailable = true;
    }
    throw Object.assign(error instanceof Error ? error : Error(String(error)), {
      caseResult: result,
    });
  } finally {
    loop.disable();
    result.clientCoordinator = {
      cpu: process.cpuUsage(cpuStart),
      eventLoop: performance.eventLoopUtilization(eluStart),
      delayMs: {
        maximum: loop.max / 1e6,
        mean: loop.mean / 1e6,
        p99: loop.percentile(99) / 1e6,
      },
      memory: process.memoryUsage(),
      requests: requests.slice(requestStart),
    };
    if (timer) clearInterval(timer);
    await Promise.allSettled(sessions.map((s) => s.close()));
    await server.close();
    result.stderr = server.errors();
  }
  return result;
}
try {
  for (const size of sizes) cases.push(await run(size));
} catch (error) {
  failed = error;
  if ((error as any).caseResult) cases.push((error as any).caseResult);
}
const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: !failed,
  freeze,
  cases,
  limits: [
    'Separate-process loopback software evidence with real SDK Sessions and isolated SQLite results. Zero rendered or human players.',
    'Fixture-only invulnerability and boss health clears; intermission deadlines accelerated after a real five-second defeat interval. These are not legitimate qualifying scores or encounter-balance/endurance/WAN/device acceptance.',
    'No active preview, player room, hosted service, personal save, deployment or published release is modified.',
  ],
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', {
  flag: 'wx',
});
console.log(
  JSON.stringify({
    passed: report.passed,
    report: reportPath,
    cases: cases.map((c) => ({
      size: c.size,
      passed: c.passed,
      error: c.error,
    })),
  }),
);
if (failed) process.exitCode = 1;
