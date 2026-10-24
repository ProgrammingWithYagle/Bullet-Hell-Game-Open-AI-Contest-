import messages from '../src/client/profile-messages.json';
import { profileText } from '../src/client/profile-text.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { PROTOCOL, CONTENT_REVISION, idleInput } from '../src/shared/protocol.ts';
import { freshProgress, validProgress } from '../src/shared/run-progress.ts';
import {
  loadProfile,
  saveProfile,
  recordProfileView,
  summary,
  importProfile,
  exportProfile,
  freshProfile,
  PROFILE_KEY,
  PROFILE_BACKUP_KEY,
  MAX_PROFILE_BYTES,
  difficultyUnlocked,
} from '../src/client/profile.ts';
import {
  defaultControls,
  rebind,
  validControls,
  ActionLatch,
} from '../src/client/input-bindings.ts';
const storage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
};
const stepToCombat = (g: Game) => {
  while (g.phase !== 'combat') {
    g.phaseEnds = g.tick;
    g.step();
  }
};
function campaign(difficulty = 'hard') {
  const g = new Game({ mode: 'raid', difficulty, runId: 'profile-fixture', seed: 53 });
  g.addPlayer('solo', 'Test', 'soldier');
  g.start();
  return g;
}
function finish(g: Game) {
  while (g.encounter < 3) {
    stepToCombat(g);
    g.boss.health = 0;
    g.step();
  }
  return g;
}

test('personal progress credits actual deployments, persists boundaries and rejects impossible history', () => {
  const g = campaign();
  g.boss.health = 0;
  g.step();
  const p = g.players.get('solo')!;
  assert.deepEqual(p.progress, {
    clears: 1,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 0,
    clearedBossIds: ['chain-colossus'],
  });
  assert.deepEqual(
    Game.restoreOffline(g.offlineCheckpoint()).players.get('solo')!.progress,
    p.progress,
  );
  const save = g.offlineCheckpoint()!;
  save.player.progress.clears = 3;
  assert.throws(() => Game.restoreOffline(save));
  assert(!validProgress({ ...freshProgress(), firstEncounter: 2, clears: 2 }, 3));
});
test('all six difficulties use the complete budget and Hard full participation unlocks the last two', () => {
  const store = storage();
  for (const difficulty of data.difficulties) {
    const g = campaign(difficulty.id);
    assert.equal(g.difficulty.health, difficulty.health);
    assert.equal(g.players.get('solo')!.totalSp, 12);
  }
  assert(!difficultyUnlocked(loadProfile(store), 'insane'));
  const g = finish(campaign());
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  const profile = loadProfile(store);
  assert(difficultyUnlocked(profile, 'insane'));
  assert(difficultyUnlocked(profile, 'hellish'));
  assert(!difficultyUnlocked(profile, 'unknown'));
  assert.equal(summary(profile).classes.soldier.xp, 300);
  const next = campaign();
  assert.equal(next.players.get('solo')!.health, data.classes[0].health);
  assert.deepEqual(next.players.get('solo')!.skills, []);
  assert.deepEqual(next.players.get('solo')!.upgrades, {});
});
test('late arrivals cannot turn a partial campaign and secret clear into a full Hard unlock', () => {
  const store = storage(),
    g = campaign();
  g.accords = 3;
  g.boss.health = 0;
  g.step();
  const late = g.addPlayer('late', 'Late', 'medic');
  assert.equal(late.progress.firstEncounter, -1);
  finish(g);
  assert.equal(g.phase, 'secretOffer');
  assert.equal(late.progress.clears, 2);
  assert.equal(late.progress.campaignClears, 2);
  assert(g.vote('solo', 1));
  assert(g.vote('late', 1));
  stepToCombat(g);
  g.boss.health = 0;
  g.step();
  recordProfileView(viewOf(g, 'late'), 'late', store);
  const s = summary(loadProfile(store));
  assert.equal(s.totalClears, 3);
  assert(!s.hardUnlocked);
  assert(s.memorial);
  assert(s.lore.has('uncounted'));
});
test('completed Endless mastery survives defeat, extraction, repeated views and stale restored checkpoints', () => {
  const store = storage(),
    g = new Game({ mode: 'endless', runId: 'vigil', maxPlayers: 1 });
  g.addPlayer('solo', 'Vigil', 'engineer');
  g.start();
  g.boss.health = 0;
  g.step();
  const boundary = structuredClone(g.offlineCheckpoint());
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  stepToCombat(g);
  g.boss.health = 0;
  g.step();
  for (let i = 0; i < 10; i++) recordProfileView(viewOf(g, 'solo'), 'solo', store);
  stepToCombat(g);
  g.players.get('solo')!.status = 'eliminated';
  g.step();
  assert.equal(g.phase, 'defeat');
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  const old = Game.restoreOffline(boundary);
  recordProfileView(viewOf(old, 'solo'), 'solo', store);
  const s = summary(loadProfile(store));
  assert.equal(s.classes.engineer.clears, 2);
  assert.equal(s.streaks.normal.personal, 2);
  assert.equal(loadProfile(store).runs.length, 1);
});
test('secret failure retains campaign mastery; a later stale view never removes the memorial', () => {
  const store = storage(),
    g = campaign();
  g.accords = 3;
  finish(g);
  const offered = viewOf(g, 'solo');
  recordProfileView(offered, 'solo', store);
  g.vote('solo', 1);
  stepToCombat(g);
  g.players.get('solo')!.status = 'eliminated';
  g.step();
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  assert.equal(summary(loadProfile(store)).totalClears, 3);
  assert(summary(loadProfile(store)).hardUnlocked);
  assert(!summary(loadProfile(store)).memorial);
  const h = campaign();
  h.accords = 3;
  finish(h);
  h.vote('solo', 1);
  stepToCombat(h);
  h.boss.health = 0;
  h.step();
  recordProfileView(viewOf(h, 'solo'), 'solo', store);
  recordProfileView(offered, 'solo', store);
  assert(summary(loadProfile(store)).memorial);
  assert.equal(summary(loadProfile(store)).totalClears, 4);
});
test('teammate channel rescues count once and solo self-revival does not award cooperation', () => {
  const g = campaign();
  g.addPlayer('late', 'Late', 'medic');
  g.boss.health = 0;
  g.step();
  stepToCombat(g);
  const a = g.players.get('solo')!,
    b = g.players.get('late')!;
  a.x = b.x = 250;
  a.y = b.y = 800;
  a.invulnerableUntil = b.invulnerableUntil = 1e9;
  b.status = 'downed';
  b.downUntil = 1e9;
  for (let n = 1; n <= 65; n++) {
    g.submitInput('solo', { ...idleInput(), sequence: n, interact: true });
    g.step();
  }
  assert.equal(a.progress.rescues, 1);
  assert.equal(b.status, 'active');
  const solo = campaign();
  const p = solo.players.get('solo')!;
  p.status = 'downed';
  p.downUntil = 1e9;
  for (let n = 1; n <= 61; n++) {
    solo.submitInput('solo', { ...idleInput(), sequence: n, interact: true });
    solo.step();
  }
  assert.equal(p.status, 'active');
  assert.equal(p.progress.rescues, 0);
});
test('protocol-12 Practice migration preserves the secret offer and personal solo history', () => {
  const g = campaign();
  g.accords = 3;
  finish(g);
  const save: any = structuredClone(g.offlineCheckpoint());
  save.protocolVersion = 12;
  delete save.settings.runId;
  delete save.player.progress;
  const restored = Game.restoreOffline(save);
  assert.equal(PROTOCOL, 13);
  assert.equal(restored.phase, 'secretOffer');
  assert.deepEqual(restored.campaignBank, g.campaignBank);
  assert.deepEqual(restored.endless.state, g.endless.state);
  assert.equal(restored.players.get('solo')!.progress.campaignClears, 3);
  save.serverOnly = true;
  assert.throws(() => Game.restoreOffline(save));
});
test('profiles migrate existing preferences and retain unverified legacy clears without granting unlocks', () => {
  const store = storage();
  store.setItem('ga-settings', JSON.stringify({ volume: 0.7, reduceMotion: true, textScale: 8 }));
  store.setItem('ga-language', 'ar');
  const p = loadProfile(store);
  assert.equal(p.settings.volume, 0.7);
  assert.equal(p.settings.textScale, 1.4);
  assert.equal(p.locale, 'ar');
  saveProfile(store, p);
  assert.deepEqual(loadProfile(store), p);
  assert(!summary(p).hardUnlocked);
});
test('import validates all bytes before replacement and keeps an exact prior backup', () => {
  const store = storage(),
    before = freshProfile();
  saveProfile(store, before);
  const after = freshProfile();
  after.locale = 'ja';
  after.settings.music = 0;
  importProfile(store, JSON.stringify(after));
  assert.deepEqual(JSON.parse(store.getItem(PROFILE_BACKUP_KEY)!), before);
  const current = store.getItem(PROFILE_KEY);
  for (const raw of [
    '{',
    JSON.stringify({ ...after, coins: 9999 }),
    JSON.stringify({ ...after, settings: { ...after.settings, health: 9999 } }),
    ' '.repeat(MAX_PROFILE_BYTES + 1),
    JSON.stringify({ ...after, verified: true }),
    JSON.stringify({ ...after, selectedCosmetic: 'remembered-bell' }),
  ]) {
    assert.throws(() => importProfile(store, raw));
    assert.equal(store.getItem(PROFILE_KEY), current);
  }
  assert.deepEqual(JSON.parse(exportProfile(store)), after);
});
test('storage failures and corrupt prior files preserve the previous profile bytes', () => {
  const store = storage();
  saveProfile(store, freshProfile());
  const previous = store.getItem(PROFILE_KEY)!;
  const next = freshProfile();
  next.locale = 'fr';
  const failing = {
    getItem: store.getItem,
    setItem: (k: string, v: string) => {
      if (k === PROFILE_KEY) throw Error('quota');
      store.setItem(k, v);
    },
  };
  assert.throws(() => saveProfile(failing, next));
  assert.equal(store.getItem(PROFILE_KEY), previous);
  store.setItem(PROFILE_KEY, 'corrupt');
  assert.throws(() => loadProfile(store));
  assert.equal(store.getItem(PROFILE_KEY), 'corrupt');
  importProfile(store, JSON.stringify(next));
  assert.equal(store.getItem(PROFILE_BACKUP_KEY), 'corrupt');
});
test('bindings reject conflicts and reserved navigation, and touch/gamepad can share action names', () => {
  const controls = defaultControls();
  assert(validControls(controls));
  const alt = rebind(controls, 'q', 0, 'KeyV')!;
  assert(alt);
  assert.equal(alt.bindings.q[0], 'KeyV');
  for (const code of ['Escape', 'Tab', 'F5', 'KeyR'])
    assert.equal(rebind(controls, 'q', 0, code), null);
  const duplicate = structuredClone(controls);
  duplicate.gamepad.q = duplicate.gamepad.e;
  assert(!validControls(duplicate));
  assert.equal(rebind(controls, 'q', 0, 'KeyQ')?.bindings.q[0], 'KeyQ');
});
test('hold/toggle latches recognize quick taps, hold edges and reset on blur/pause', () => {
  const latch = new ActionLatch();
  assert(latch.sample(false, true, 'toggle'));
  assert(latch.sample(false, false, 'toggle'));
  assert(!latch.sample(true, true, 'toggle'));
  assert(!latch.sample(true, false, 'toggle'));
  latch.clear();
  assert(!latch.sample(false, false, 'toggle'));
  assert(latch.sample(false, true, 'hold'));
  assert(!latch.sample(false, false, 'hold'));
});

test('profile messages cover fifteen locales, preserve placeholders and interpolate toggle instructions', () => {
  assert.deepEqual(Object.keys(messages).sort(), data.locales.map((l) => l.id).sort());
  const placeholders = (s: string) => [...s.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();
  for (const [locale, catalog] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(messages.en).sort());
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      assert(catalog[key].trim());
      assert.deepEqual(placeholders(catalog[key]), placeholders(messages.en[key]));
    }
    assert(!profileText(locale, 'toggleRevive', { binding: 'V', player: 'Mara' }).includes('{'));
  }
});
test('replayed branches may discover another story without double-awarding encounter mastery', () => {
  const store = storage(),
    g = campaign();
  g.boss.health = 0;
  g.step();
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  const branch = campaign();
  branch.boss.id = 'bell-triplets';
  branch.boss.health = 0;
  branch.step();
  recordProfileView(viewOf(branch, 'solo'), 'solo', store);
  recordProfileView(viewOf(g, 'solo'), 'solo', store);
  const s = summary(loadProfile(store));
  assert.equal(s.totalClears, 1);
  assert(s.lore.has('chain-colossus'));
  assert(s.lore.has('bell-triplets'));
});
test('legacy Hard campaign records stay portable but never infer missing participation or grant mastery', () => {
  const store = storage();
  const g = finish(campaign());
  const bank = g.campaignBank!;
  store.setItem(
    'ga-practice-campaign-records-v1',
    JSON.stringify([
      {
        schemaVersion: 1,
        id: bank.runId,
        practiceOnly: true,
        verified: false,
        contentRevision: CONTENT_REVISION,
        protocol: 12,
        mode: bank.mode,
        difficulty: bank.difficulty,
        classId: 'soldier',
        completedEncounters: bank.encounters,
        accords: bank.accords,
        combatTicks: bank.combatTick,
        secret: 'locked',
        memorial: false,
      },
    ]),
  );
  const p = loadProfile(store);
  assert.equal(p.legacyCampaigns.length, 1);
  assert(!summary(p).hardUnlocked);
  assert.equal(summary(p).totalClears, 0);
  saveProfile(store, p);
  assert.equal(JSON.parse(exportProfile(store)).legacyCampaigns.length, 1);
});
