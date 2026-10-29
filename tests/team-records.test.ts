import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { Game } from '../src/shared/game.ts';
import { CONTENT_REVISION } from '../src/shared/protocol.ts';
import { damageRatioKey, teamScore, RECORD_RULES, RECORD_SEASON, type RecordParticipant, type TeamRecord } from '../src/shared/team-records.ts';
import { TeamRun } from '../src/server/team-run.ts';
import { TeamRecordStore, BoardQueryError } from '../src/server/team-record-store.ts';
import { isRankedTeamRecord, isTeamBoardPage, mondayUTC } from '../src/client/team-records.ts';

function fixture(overrides: Partial<TeamRecord> = {}) {
  const participants: RecordParticipant[] = [{ id: randomUUID(), name: 'Mara', classId: 'soldier', firstEncounter: 1, lastEncounter: 5, encounters: 5, survived: true }];
  const record: TeamRecord = { runId: randomUUID(), mode: 'short', difficulty: 'normal', contentRevision: CONTENT_REVISION,
    rules: RECORD_RULES, season: RECORD_SEASON, peakPlayers: 1, sizeBand: 'solo', clears: 5,
    combatTicks: 4500, lastClearTicks: 4500, deadlineTicks: 9000, damageMilli: 25000, healthMilli: 100000,
    lastClearDamageMilli: 25000, lastClearHealthMilli: 100000, survivors: 1, rosterCount: 1,
    endedAt: Date.UTC(2026,9,28), secretCleared: false, ...overrides };
  return { record, participants };
}
function nextCombat(g: Game) {
  for (let i = 0; g.phase !== 'combat' && i < 8; i++) { g.tick = g.phaseEnds; g.step(); }
  assert.equal(g.phase, 'combat');
}
function clear(g: Game) {
  g.boss.health = 0;
  g.step();
  assert.notEqual(g.phase, 'combat');
}

test('team score rounds exact fractions once and damage keys retain safe-integer ratio order', () => {
  const { record } = fixture();
  assert.equal(teamScore(record), 850000);
  assert.equal(teamScore({ ...record, combatTicks: 1, deadlineTicks: 499999, damageMilli: 0 }), 999999);
  assert.equal(teamScore({ ...record, combatTicks: 1, deadlineTicks: 500000, damageMilli: 0 }), 1000000);
  assert.equal(teamScore({ ...record, damageMilli: 200000 }), 775000);
  const max = Number.MAX_SAFE_INTEGER;
  assert(damageRatioKey(max - 2, max - 1) < damageRatioKey(max - 1, max));
  assert.equal(damageRatioKey(1, 3), damageRatioKey(2, 6));
  assert.throws(() => teamScore({ ...record, survivors: 0 }));
  assert.throws(() => teamScore({ ...record, combatTicks: record.deadlineTicks }));
});

test('real simulation hooks retain departed entrants, admit waiting players at the next fight and freeze survivors before healing', () => {
  const store = new TeamRecordStore(':memory:');
  try {
    const g = new Game({ maxPlayers: 4, difficulty: 'normal', mode: 'short' });
    const a = g.addPlayer('private-session-a', 'Mara', 'soldier');
    const departed = g.addPlayer('private-session-departed', 'Fin', 'medic');
    const tracker = new TeamRun(store, () => {});
    g.scoreObserver = tracker;
    g.start();
    const late = g.addPlayer('private-session-late', 'Rue', 'tank');
    assert.equal(late.status, 'waiting');
    clear(g);
    g.setConnected(departed.id, false); departed.expired = true;
    for (let fight = 1; fight < 5; fight++) {
      nextCombat(g);
      a.invulnerableUntil = late.invulnerableUntil = 1e9;
      if (fight === 4) { late.health = 0; late.status = 'downed'; }
      clear(g);
    }
    assert.equal(tracker.status?.status, 'saved');
    if (tracker.status?.status !== 'saved') throw Error('Result missing');
    const result = tracker.status.record;
    assert.equal(result.rosterCount, 3);
    assert.equal(result.survivors, 1);
    assert.equal(result.peakPlayers, 2);
    assert.equal(late.status, 'active', 'Victory healed the real player after metrics froze');
    const roster = store.roster(result.runId)!;
    assert.equal(roster.participants.find(p => p.name === 'Rue')?.firstEncounter, 2);
    assert.equal(roster.participants.find(p => p.name === 'Fin')?.encounters, 1);
    assert.equal(JSON.stringify(roster).includes('private-session'), false);
    const banked = structuredClone(result);
    g.combatTick += 500;
    tracker.damage(a.id, 99999);
    g.secretStatus = 'cleared'; tracker.observe(g);
    assert.deepEqual(store.find(result.runId), { ...banked, secretCleared: true });
  } finally { store.close(); }
});

test('testing changes, zero-duration clears and individual deadline violations never receive team ranks', () => {
  for (const bad of ['testing','zero','deadline']) {
    const store = new TeamRecordStore(':memory:');
    try {
      const g = new Game(); g.addPlayer('a','Mara','soldier');
      const tracker = new TeamRun(store, () => {}); g.scoreObserver = tracker; g.start();
      if (bad === 'testing') g.testingModified = true;
      if (bad === 'zero') tracker.clear(g);
      if (bad === 'deadline') { g.combatTick = g.boss.deadline - 1; }
      for (let i=0;i<5;i++) { if (i) nextCombat(g); clear(g); }
      assert.notEqual(tracker.status?.status, 'saved');
      assert.equal(store.board({ mode: 'short', difficulty: 'normal', sizeBand: 'solo' }).total, 0);
    } finally { store.close(); }
  }
});

test('persistent boards preserve shared competition ranks, exact filters, weekly boundaries and immutable idempotent results', () => {
  const dir = mkdtempSync(join(tmpdir(),'grave-records-'));
  const filename = join(dir,'records.sqlite');
  let store = new TeamRecordStore(filename);
  try {
    const first = fixture(), second = fixture(), third = fixture({ combatTicks: 6000, lastClearTicks: 6000 });
    store.save(first.record, first.participants); store.save(second.record, second.participants); store.save(third.record, third.participants);
    store.save(first.record, first.participants);
    store.close(); store = new TeamRecordStore(filename);
    const filter = { mode: 'short' as const, difficulty: 'normal', sizeBand: 'solo' };
    assert.deepEqual(store.board(filter).rows.map(r => r.rank), [1,1,3]);
    assert.equal(store.board({ ...filter, limit: 2 }).nextOffset, 2);
    assert.deepEqual(store.board({ ...filter, offset: 2 }).rows.map(r => r.rank), [3]);
    assert.equal(store.board({ ...filter, difficulty: 'easy' }).total, 0);
    assert.equal(store.board({ ...filter, week: '2026-10-26' }).total, 3);
    assert.equal(store.board({ ...filter, week: '2026-11-02' }).total, 0);
    assert.throws(() => store.board({ ...filter, week: '2026-10-27' }), BoardQueryError);
    assert.throws(() => store.board({ ...filter, sizeBand: '17-50' }), BoardQueryError);
    assert.throws(() => store.board({ ...filter, limit: 100 }), BoardQueryError);
    assert.throws(() => store.save({ ...first.record, combatTicks: 4000, lastClearTicks: 4000 }, first.participants));
    assert.equal(store.board(filter).total, 3);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('endless ranks use only completed clears and last-clear time/ratio; final failed-fight duration is display only', () => {
  const store = new TeamRecordStore(':memory:');
  try {
    for (const extra of [100,9000]) {
      const f = fixture({ mode: 'endless', combatTicks: 4500 + extra });
      store.save(f.record, f.participants);
    }
    const slower = fixture({ mode: 'endless', combatTicks: 9000, lastClearTicks: 6000 }); store.save(slower.record, slower.participants);
    assert.deepEqual(store.board({ mode: 'endless', difficulty: 'normal', sizeBand: 'solo' }).rows.map(r => r.rank), [1,1,3]);
  } finally { store.close(); }
});

test('a failed record write never stops combat and can retry the exact banked result without duplicating it', () => {
  const store = new TeamRecordStore(':memory:');
  try {
    let attempts = 0, clock = 10000;
    const tracker = new TeamRun({ save(r,p) { if (++attempts === 1) throw Error('offline'); return store.save(r,p); } }, () => {}, () => clock);
    const g = new Game(); g.addPlayer('a','Mara','soldier'); g.scoreObserver = tracker; g.start();
    for(let i=0;i<5;i++){ if(i)nextCombat(g); clear(g); }
    assert.equal(tracker.status?.status,'unavailable');
    tracker.observe(g); assert.equal(attempts,1);
    clock += 2001; tracker.observe(g);
    assert.equal(tracker.status?.status,'saved');
    assert.equal(store.board({ mode:'short',difficulty:'normal',sizeBand:'solo' }).total,1);
  } finally { store.close(); }
});

test('file-backed records work beyond 300-character paths and historical rosters page past fifty without losing members', () => {
  const dir = mkdtempSync(join(tmpdir(),'grave-record-deep-'));
  const filename = join(dir,'a'.repeat(90),'b'.repeat(90),'c'.repeat(90),'records.sqlite');
  assert(filename.length>300);
  const store = new TeamRecordStore(filename);
  try {
    const f=fixture({mode:'endless',peakPlayers:50,sizeBand:'17-50',rosterCount:55});
    f.participants=Array.from({length:55},(_,i)=>({id:randomUUID(),name:i===0?'<Mara>':'Survivor '+i,classId:'soldier' as const,
      firstEncounter:1,lastEncounter:5,encounters:5,survived:i===0}));
    store.save(f.record,f.participants);
    const first=store.roster(f.record.runId)!,second=store.roster(f.record.runId,50)!;
    assert.equal(first.participants.length,50);assert.equal(first.nextOffset,50);
    assert.equal(second.participants.length,5);assert.equal(second.nextOffset,null);
    assert.equal(new Set([...first.participants,...second.participants].map(p=>p.id)).size,55);
  } finally { store.close(); assert.equal(dirname(resolve(dir)),resolve(tmpdir())); rmSync(dir,{recursive:true,force:true}); }
});

test('the browser accepts only matching board identities and safe display counters; weeks start on Monday in UTC',()=>{
  const store=new TeamRecordStore(':memory:');
  try{
    const f=fixture();store.save(f.record,f.participants);
    const page=store.board({mode:'short',difficulty:'normal',sizeBand:'solo'});
    assert(isTeamBoardPage(page));assert(isRankedTeamRecord(page.rows[0]));
    assert(!isTeamBoardPage({...page,rows:[{...page.rows[0],difficulty:'easy'}]}));
    assert(!isTeamBoardPage({...page,contentRevision:'foreign'}));
    assert(!isRankedTeamRecord({...page.rows[0],rank:NaN}));
    assert(!isRankedTeamRecord({...page.rows[0],score:1000001}));
    assert.equal(mondayUTC(Date.UTC(2026,9,25,23,59)),'2026-10-19');
    assert.equal(mondayUTC(Date.UTC(2026,9,26,0,0)),'2026-10-26');
  }finally{store.close();}
});
