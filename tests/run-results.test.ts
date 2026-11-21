import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeGame } from '../src/shared/practice-start.ts';
import { viewOf, personalView } from '../src/shared/view.ts';
import { runResultModel, runResultsMarkup, phaseCountdownMarkup } from '../src/client/ui/run-results.ts';
import { loadProfile, recordProfileView, summary } from '../src/client/profile.ts';
import type { Phase } from '../src/shared/protocol.ts';

const labels = {
  language: 'en', mode: 'Mode <unsafe>', difficulty: 'Baby', className: 'Soldier',
  number: String, clock: (s: number) => Math.floor(s / 60) + ':' + String(Math.ceil(s) % 60).padStart(2, '0'),
};

test('run results use the same personally earned clears and experience as the saved profile without awarding anything', () => {
  const g = createPracticeGame({ mode: 'short', seed: 16 }, 'New player', 'soldier');
  g.start(); g.boss.health = 0; g.step();
  const view = viewOf(g, 'solo'), player = view.players[0];
  const before = structuredClone(view);
  const model = runResultModel(view, player);
  assert.equal(model.teamClears, 1);
  assert.equal(model.personalClears, 1);
  assert.equal(model.showPersonalClears, false);
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  recordProfileView(view, player.id, store);
  const earned = summary(loadProfile(store));
  assert.equal(model.experience, earned.classes.soldier.xp);
  const profileBytes = [...values.entries()];
  const markup = runResultsMarkup(view, player, labels);
  assert(markup.includes('Mode &lt;unsafe&gt;'));
  assert(!markup.includes('<unsafe>'));
  assert(markup.includes('100 XP'));
  assert(!markup.includes('id="phase-time"'));
  assert.deepEqual(view, before);
  assert.deepEqual([...values.entries()], profileBytes);
  view.run.testingModified = true;
  assert.equal(runResultModel(view, player).experience, 0);
  const modified = runResultsMarkup(view, player, labels);
  assert(modified.includes('0 XP') && modified.includes('does not count toward saved progress'));
});

test('late join, zero-clear defeat, timeout and banked victories retain their actual meanings in the result screen', () => {
  const g = createPracticeGame({ mode: 'short', seed: 19 }, 'New player', 'soldier');
  g.start();
  let view = viewOf(g, 'solo');
  view.phase = 'defeat';
  assert.equal(runResultModel(view, view.players[0]).reason, 'resultSoloDown');
  assert.equal(runResultModel(view, view.players[0]).personalClears, 0);
  view.combatTick = view.boss.deadline;
  assert.equal(runResultModel(view, view.players[0]).reason, 'resultTimeout');
  view.combatTick = 900; view.encounter = 5;
  view.players[0].progress = { clears: 2, rescues: 1, firstEncounter: 3, campaignClears: 2, clearedBossIds: ['constable', 'ratcatcher'] };
  view.players.push({ ...structuredClone(view.players[0]), id: 'teammate' });
  const late = runResultModel(view, view.players[0]);
  assert.equal(late.reason, 'resultTeamDown');
  assert.equal(late.teamClears, 5); assert.equal(late.personalClears, 2);
  assert.equal(late.rescues, 1); assert.equal(late.experience, 200);
  assert(late.showPersonalClears);
  view.campaignBank = { runId: view.run.id, mode: 'short', difficulty: 'baby', encounters: 5, accords: 0, combatTick: 600, timeouts: 0, bankedAt: view.tick };
  view.secretStatus = 'active'; view.extensionParticipants = ['teammate'];
  view = personalView(view, 'solo');
  assert.equal(view.phase, 'victory');
  view.encounter = 6; view.combatTick = 1200;
  const banked = runResultModel(view, view.players[0]);
  assert.equal(banked.reason, null);
  assert.equal(banked.teamClears, 5);
  assert.equal(banked.combatSeconds, 20);
});

test('only automatic timed steps show a countdown; lobby, combat and terminal screens have none', () => {
  const phases: Phase[] = ['lobby', 'combat', 'mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer', 'victory', 'defeat'];
  for (const phase of phases) {
    const markup = phaseCountdownMarkup(phase, 'en');
    const timed = ['mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(phase);
    assert.equal(markup.includes('id="phase-time"'), timed, phase);
    if (timed) assert(markup.includes('Time left'));
    else assert.equal(markup, '');
  }
});
