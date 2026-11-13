import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Session } from '../../src/client/session.ts';
import { CONTENT_REVISION, PROTOCOL } from '../../src/shared/protocol.ts';
const endpoint = 'https://grave-accord-contest.onrender.com', origin = 'https://grave-accord.yigallin0423.chatgpt.site';
const output = 'reviews/shared-network-2026-10-30/hosted-smoke-01.json';
assert(!fs.existsSync(output));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) { const end = Date.now() + 12000; while (!check()) { assert(Date.now() < end, 'Hosted peer state timed out'); await wait(30); } }
const host = new Session(endpoint), guest = new Session(endpoint), denied = new Session(endpoint);
const report: Record<string, unknown> = { startedAt: new Date().toISOString(), endpoint, origin, passed: false, limits: ['Two real hosted SDK clients plus one wrong-password rejection. No accelerated clear, invented result, rendered client, full-host stress or endurance. Server records use ephemeral Free-host local storage.'] };
try {
  const start = Date.now(), res = await fetch(endpoint + '/api/health', { headers: { Origin: origin }, signal: AbortSignal.timeout(75000) });
  const health = await res.json(); assert.equal(res.status, 200); assert.equal(res.headers.get('access-control-allow-origin'), origin);
  assert.equal(health.protocolVersion, PROTOCOL); assert.equal(health.contentRevision, CONTENT_REVISION);
  assert.equal(health.sourceCommit, '71fc34cfd88a245d7003f16df7a7dc5e90986410'); assert.equal(health.audience, 'public');
  assert.equal(health.capacity.reservedSlots, 0); assert.equal(health.capacity.instanceLimit, 8); assert.equal(health.capacity.roomLimit, 1);
  assert.equal(health.teamRecords.available, true); report.health = health; report.healthElapsedMs = Date.now() - start;
  const options = { name: 'QA publication host', classId: 'soldier' as const, mode: 'short' as const, difficulty: 'baby' };
  host.setChatEnabled(true); guest.setChatEnabled(true);
  await host.connect(options, undefined, 'public', 'QA publication password'); await until(() => !!host.code && host.isHost);
  const rooms = await guest.rooms(); const listed = rooms.find(r => r.roomId === host.room!.roomId)!;
  assert(listed?.hasPassword); assert(!JSON.stringify(rooms).includes('QA publication password'));
  const found = await guest.lookupRoom(host.code); assert.equal(found.hasPassword, true);
  await assert.rejects(denied.connect({ ...options, name: 'QA denied' }, { roomId: found.roomId, code: host.code, password: 'Wrong value' }), /ui.errorRoomPassword/);
  await guest.connect({ ...options, name: 'QA publication guest 日本語', classId: 'medic' }, { roomId: found.roomId, code: host.code, password: 'QA publication password' });
  await until(() => host.view?.players.length === 2 && guest.view?.players.length === 2);
  assert.equal(host.view!.phase, 'lobby'); host.start(); await until(() => guest.view?.phase === 'combat');
  guest.pause(true); await wait(180); assert.equal(host.view!.matchPaused, false);
  host.setMatchPaused(true); await until(() => guest.view?.matchPaused === true);
  const tick = guest.view!.tick; await wait(220); assert.equal(guest.view!.tick, tick);
  assert(host.sendChat('QA publication connection check')); await until(() => guest.chatMessages.some(m => m.text === 'QA publication connection check'));
  host.setMatchPaused(false); await until(() => guest.view?.matchPaused === false && guest.view.tick > tick);
  await host.close(); await until(() => guest.isHost && guest.view?.phase === 'combat');
  guest.endMatch(); await until(() => guest.view?.endedByHost === true);
  const board = await fetch(endpoint + '/api/leaderboards?mode=short&difficulty=baby&sizeBand=2-4&offset=0&limit=10', { headers: { Origin: origin } });
  assert.equal(board.status, 200); const records = await board.json(); assert(Array.isArray(records.rows)); assert.equal(records.rows.length, 0);
  Object.assign(report, { passed: true, publicDiscovery: true, roomCodeLookup: true, passwordEnforced: true, manualHostStart: true, guestMenuDidNotPause: true, hostPauseContinue: true, chatConfirmed: true, hostDepartureTransferred: true, explicitHostEnd: true, recordsReadable: true, noInventedQualifyingResult: true });
} catch (error) { report.error = error instanceof Error ? error.stack : String(error); process.exitCode = 1; }
finally {
  await Promise.allSettled([host.close(), guest.close(), denied.close()]);
  for (let i = 0; i < 20; i++) { const health = await fetch(endpoint + '/api/health').then(r => r.json()); if (!health.capacity.reservedSlots && !health.capacity.rooms) { report.allSlotsReleased = true; break; } await wait(100); }
  assert.equal(report.allSlotsReleased, true); report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(report));
}
