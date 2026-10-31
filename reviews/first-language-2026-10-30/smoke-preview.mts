import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { Session } from '../../src/client/session.ts';
const audience = process.argv[2];
assert(audience === 'public' || audience === 'testing');
const manifest = JSON.parse(fs.readFileSync('reviews/first-language-2026-10-30/preview-' + audience + '-bytes.json', 'utf8'));
const processes = JSON.parse(fs.readFileSync('reviews/first-language-2026-10-30/preview-' + audience + '-processes.json', 'utf8'));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const expected = (name: string) => manifest.members.find((m: { path: string }) => m.path === name);
const checked: unknown[] = [];
const files = new Set<string>(['index.html', 'preview-build.json']);
const cover = manifest.members.find((m: { path: string }) => /^assets\/cover-v1-.*\.png$/.test(m.path));
assert(cover); files.add(cover.path);
for (const pattern of [/\/index-.*\.js$/, /\/index-.*\.css$/, /offline\.worker-.*\.js$/,
  /survivors-v3-.*\.png$/, /arena-v1-.*\.png$/, /triage-yard-ground-v1-.*\.png$/, /ossuary-works-ground-v1-.*\.png$/,
  /sunken-chapel-ground-v1-.*\.png$/, /bell-foundry-ground-v1-.*\.png$/, /crown-crypt-ground-v1-.*\.png$/,
  /alchemist-action-walk-v2-atlas-.*\.png$/, /bellringer-action-walk-v2-atlas-.*\.png$/]) {
  const member = manifest.members.find((m: { path: string }) => pattern.test(m.path));
  assert(member, 'Missing HTTP sample for ' + pattern); files.add(member.path);
}
for (const name of ['gatehouse-v2','triage-yard-v2','ossuary-works-v2','sunken-chapel-v2','bell-foundry-v2','crown-crypt-v2',
  'triage-yard-v1','ossuary-works-v1','sunken-chapel-v1','bell-foundry-v1','crown-crypt-v1','lava-pit-v1']) {
  const member=manifest.members.find((m:{path:string})=>m.path.startsWith('assets/'+name+'-')&&m.path.endsWith('.png'));
  assert(member,'Missing selected painted asset: '+name);files.add(member.path);
}
for(const name of ['soldier','heavy','tank','medic','mage','engineer','assassin']){
  const member=manifest.members.find((m:{path:string})=>m.path.startsWith('assets/'+name+'-selection-v1-')&&m.path.endsWith('.png'));
  assert(member,'Missing actual character portrait: '+name);files.add(member.path);
}
const catalogFiles: {locale:string;path:string}[]=[];
const localeIds=JSON.parse(fs.readFileSync('content/catalog.json','utf8')).locales.map((item:{id:string})=>item.id);
assert.equal(localeIds.length,15);
for(const id of localeIds){
 const candidates=manifest.members.filter((m:{path:string})=>m.path.startsWith('assets/'+id+'-')&&m.path.endsWith('.js')).filter((m:{path:string})=>{const text=fs.readFileSync(path.join(manifest.root,m.path),'utf8');return ['ui.errorLanguage','ui.loadingLanguage','ui.applyingProfile','ui.welcomeLanguageTitle','ui.defaultDisplayName'].every(key=>text.includes(key));});
 assert.equal(candidates.length,1,'Expected one emitted source-backed catalog for '+id);files.add(candidates[0].path);catalogFiles.push({locale:id,path:candidates[0].path});
}
for (const file of files) {
  const response = await fetch(new URL(file, manifest.url), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, file);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes), expected(file).sha256, 'Served bytes differ from frozen root: ' + file);
  checked.push({ path: file, status: response.status, bytes: bytes.length, sha256: sha(bytes) });
}
const healthResponse = await fetch(manifest.endpoint + '/api/health', { headers: { Origin: manifest.url.slice(0, -1) }, signal: AbortSignal.timeout(10000) });
const health = await healthResponse.json();
assert.equal(healthResponse.status, 200);
assert.equal(healthResponse.headers.get('access-control-allow-origin'), manifest.url.slice(0, -1));
assert.equal(health.sourceCommit, manifest.sourceCommit);
assert.equal(health.protocolVersion, manifest.protocol);
assert.equal(health.contentRevision, manifest.contentRevision);
assert.equal(health.audience, audience);
assert.equal(health.teamRecords?.available, true);
assert.equal(health.teamRecords?.persistent, true);
const boardResponse = await fetch(manifest.endpoint + '/api/leaderboards?mode=short&difficulty=normal&sizeBand=solo');
assert.equal(boardResponse.status, 200);
const board = await boardResponse.json();
assert.equal(board.scope, 'server'); assert.equal(board.total, 0);
assert.equal(health.playable.bosses, 66); assert.equal(health.playable.classes, 7);
assert(Math.abs(Date.parse(health.startedAt) - Date.parse(processes.backend.startedAt)) < 10000);
const denied = await fetch(manifest.endpoint + '/api/health', { headers: { Origin: 'http://127.0.0.1:5213' } });
const otherHealthOrigin = denied.headers.get('access-control-allow-origin');
// Health is a public endpoint. The authored origin restriction applies to socket upgrades.
const deniedUpgradeStatus = await new Promise<number>((resolve, reject) => {
  const req = request(manifest.endpoint + '/', { headers: { Origin: 'http://127.0.0.1:5213',
    Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' } });
  req.on('response', response => { response.resume(); resolve(response.statusCode ?? 0); });
  req.on('upgrade', (_response, socket) => { socket.destroy(); reject(new Error('Wrong-origin socket upgrade was accepted')); });
  req.on('error', reject); req.setTimeout(5000, () => req.destroy(new Error('Upgrade check timed out'))); req.end();
});
assert.equal(deniedUpgradeStatus, 403);
assert.equal(sha(fs.readFileSync(manifest.backend.path)), manifest.backend.sha256);
const wait = async (check: () => boolean) => {
  const deadline = Date.now() + 10000;
  while (!check()) { assert(Date.now() < deadline, 'Public peer state did not arrive'); await new Promise(r => setTimeout(r, 20)); }
};
const before = await fetch(manifest.endpoint + '/api/metrics').then(r => r.json());
assert.equal(before.rooms, 0, 'Dedicated review server already has a room; do not disturb players');
const owner = new Session(manifest.endpoint), observer = new Session(manifest.endpoint);
let peerSample: unknown;
try {
  owner.setChatEnabled(true); observer.setChatEnabled(true);
  const ownerName=JSON.parse(fs.readFileSync('locales/ja.json','utf8')).messages['ui.defaultDisplayName'];
  const observerName=JSON.parse(fs.readFileSync('locales/ar.json','utf8')).messages['ui.defaultDisplayName'];
  const options = { name: ownerName, classId: 'soldier' as const, mode: 'short' as const,
    difficulty: 'baby', openingArenaId: 'gatehouse', arenaSelection:'fixed' as const, openingBossId: 'gate-widow' as const };
  const probePassword='Preview-only lock';
  await owner.connect(options,undefined,'public',probePassword);
  await wait(()=>owner.code.length===6);
  assert(owner.hasPassword);
  const lookup=await observer.lookupRoom(owner.code);assert.equal(lookup.hasPassword,true);
  const listing=(await observer.rooms()).find(room=>room.roomId===owner.room!.roomId);assert(listing?.hasPassword);assert.equal(listing.name,ownerName);assert(!JSON.stringify(listing).includes(probePassword));
  await assert.rejects(()=>observer.connect({...options,name:observerName,classId:'medic'},{roomId:lookup.roomId,code:owner.code,password:'Incorrect fixture value'}),/ui.errorRoomPassword/);
  await observer.connect({ ...options, name: observerName, classId: 'medic' }, { roomId:lookup.roomId,code: owner.code,password:probePassword });
  await wait(() => owner.view?.players.length === 2 && observer.view?.players.length === 2&&observer.code===owner.code);
  observer.start();await new Promise(r=>setTimeout(r,250));
  assert.equal(owner.view!.phase,'lobby');assert.equal(observer.view!.phase,'lobby');
  assert(owner.sendChat('Ready for a quick room check?'));
  await wait(() => observer.chatMessages.length === 1&&owner.chatDelivery.status==='sent');
  assert(owner.sendChat('Keep this draft for a retry'));
  await wait(()=>owner.chatDelivery.status==='cooldown');
  assert.equal(owner.chatDelivery.draft,'Keep this draft for a retry');assert.equal(observer.chatMessages.length,1);
  assert.equal(observer.chatMessages[0].name, ownerName);
  for(const view of [owner.view!,observer.view!]){assert.equal(view.players.find(player=>player.id===owner.id)!.name,ownerName);assert.equal(view.players.find(player=>player.id===observer.id)!.name,observerName);}
  owner.start(); await wait(() => observer.view?.phase === 'combat' && owner.view?.phase === 'combat');
  const a = owner.view!, b = observer.view!;
  assert.equal(a.boss.id, b.boss.id);
  if (audience === 'public') assert.notEqual(a.boss.id, 'gate-widow', 'Public client did not omit the rehearsal opener');
  else assert.equal(a.boss.id, 'gate-widow', 'Testing server did not retain the rehearsal opener');
  assert.equal(a.run.difficulty, 'baby'); assert.equal(a.run.mode, 'short');
  assert.equal(a.arenaId,'gatehouse');assert.equal(b.arenaId,'gatehouse');assert.equal(a.run.arenaSelection,'fixed');
  assert(!a.run.testingModified);
  assert(!b.run.testingModified);
  assert.equal(owner.hostPassword,probePassword);assert.equal(observer.hostPassword,undefined);
  observer.room!.send('pauseMatch',true);await new Promise(r=>setTimeout(r,80));assert.equal(owner.view!.matchPaused,false);
  owner.setMatchPaused(true);await wait(()=>owner.view?.matchPaused===true&&observer.view?.matchPaused===true);
  const pausedTick=observer.view!.tick;await new Promise(r=>setTimeout(r,140));assert.equal(observer.view!.tick,pausedTick);
  owner.setMatchPaused(false);await wait(()=>observer.view?.matchPaused===false&&observer.view.tick>pausedTick);
  owner.setMatchPaused(true);await wait(()=>observer.view?.matchPaused===true);
  await owner.close();await wait(()=>observer.isHost&&observer.view?.matchPaused===false&&observer.view.phase==='combat');
  assert.equal(observer.hostPassword,probePassword);const continued=observer.view!.tick;await wait(()=>observer.view!.tick>continued+2);
  observer.endMatch();await wait(()=>observer.view?.endedByHost===true&&observer.view.phase==='defeat');
  assert.equal(observer.view!.encounter,0);
  peerSample = { peers: 2, phase: b.phase, bossId: b.boss.id, form: b.boss.variant, difficulty: b.run.difficulty,
    mode: b.run.mode, sameBoss: true, chosenRehearsalOpenerIgnored: audience === 'public', chosenRehearsalOpenerRetained: audience === 'testing', testingModified: false,
    localizedDefaultNamesReplicated:true, roomChatDelivered: true,chatServerConfirmed:true,chatCooldownExplicit:true,chatRejectedDraftRetained:true, roomCodeJoined:true, hostStartRequired:true, selectedMapRetained:true,
    passwordProtected:true,incorrectPasswordRejected:true,roomListingLockFlag:true,noPasswordInListing:true,
    hostPasswordRetainedPrivately:true,guestPasswordNotExposed:true,hostPauseAuthoritative:true,guestPauseRejected:true,pausedClockFrozen:true,manualContinueWorks:true,hostLeaveContinues:true,promotedHostInviteAvailable:true,hostEndAllExplained:true,noManufacturedClear:true,
    noPersonalClearClaimed: true };
} finally {
  await Promise.allSettled([owner.close(), observer.close()]);
}
await new Promise(r => setTimeout(r, 1500));
const after = await fetch(manifest.endpoint + '/api/metrics').then(r => r.json());
assert.equal(after.rooms, 0); assert.equal(after.connections, 0);
const boardAfter=await fetch(manifest.endpoint+'/api/leaderboards?mode=short&difficulty=normal&sizeBand=solo').then(r=>r.json());assert.equal(boardAfter.total,board.total);
const report = { passed: true, checkedAt: new Date().toISOString(), sourceCommit: manifest.sourceCommit,
  buildId: manifest.buildId, protocol: manifest.protocol, contentRevision: manifest.contentRevision, audience,
  url: manifest.url, root: manifest.root, endpoint: manifest.endpoint, httpChecks: checked,
  servedCatalogs:catalogFiles, health, cors: { matchingOriginAllowed: true, otherOriginHealthHeaderObserved: otherHealthOrigin,
    wrongOriginSocketUpgradeStatus: deniedUpgradeStatus },
  backendBundleSha256: manifest.backend.sha256, peerSample, probeRoomsClosed: true,
  teamRecords: { available: true, persistent: true, readStatus: boardResponse.status, scope: board.scope,
    qualifyingRowsBeforeProbe: board.total, noSyntheticScoresSubmitted: true },
  renderedAccepted: false, humanAccepted: false,
  limits: ['Native HTTP/hash/CORS and real owner/observer transport only. No browser, personal clear, human balance, audio, native-language or physical-device acceptance.', 'No existing frozen service was stopped or replaced; the smoke room used only this newly created review backend.'] };
fs.writeFileSync('reviews/first-language-2026-10-30/preview-' + audience + '-live-check.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, url: report.url, sourceCommit: report.sourceCommit, httpChecks: checked.length, peerSample, probeRoomsClosed: true }));
