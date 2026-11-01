import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { StoryChapter, validStoryChapter } from '../src/shared/story-chapter.ts';
import { StoryTraining, chapterLessons, validStoryTraining } from '../src/shared/story-training.ts';
import { idleInput, HZ, type ClassId } from '../src/shared/protocol.ts';
import { distance } from '../src/shared/geometry.ts';
import { viewOf } from '../src/shared/view.ts';
import { recordProfileView, loadProfile } from '../src/client/profile.ts';
import {
  chapterJournal,
  recordChapterView,
  exportChapterJournal,
  importChapterJournal,
  CHAPTER_JOURNAL_KEY,
} from '../src/client/chapter-journal.ts';
import { menuEnvironment, menuBundle } from './helpers/menu-fixture.ts';
import { validFreePlay } from '../src/shared/free-play.ts';
function game(classId: ClassId = 'soldier', difficulty = 'normal') {
  const g = new Game({
    mode: 'story',
    storyChapterId: 'one-place-left',
    maxPlayers: 1,
    seed: 41,
    runId: 'chapter-test',
    difficulty,
  });
  g.addPlayer('solo', 'Survivor', classId);
  return g;
}
function waitPhase(g: Game, phase: string) {
  for (let n = 0; g.phase === phase && n < 250; n++) g.step();
  assert.notEqual(g.phase, phase);
}
function ready(g: Game) {
  for (const p of g.players.values())
    if (p.connected && p.status !== 'waiting') assert(g.vote(p.id, 1));
  waitPhase(g, g.phase);
}
function lesson(g: Game) {
  const p = [...g.players.values()][0];
  assert(
    g.transact(p.id, { id: 'study', kind: 'study', item: chapterLessons[p.classId].techniqueId })
      .ok,
  );
}
function street(g: Game, route = 0) {
  assert(g.start());
  g.boss.health = 0;
  g.step();
  ready(g);
  assert.equal(g.phase, 'contractVote');
  g.vote('solo', route);
  waitPhase(g, 'contractVote');
  lesson(g);
  ready(g);
  waitPhase(g, 'loading');
  assert(g.objective);
}
function clearStreet(g: Game) {
  const p = g.players.get('solo')!;
  p.invulnerableUntil = 1e9;
  let actedAt = -1;
  for (let n = 0; g.phase === 'combat' && n < HZ * 180; n++) {
    const target = [...g.minions.actors.values()].sort(
        (a, b) => distance(a, p) - distance(b, p),
      )[0],
      near = target ? distance(target, p) : Infinity;
    let q = false,
      e = false;
    if (actedAt < 0) {
      if (p.classId === 'medic') {
        q = true;
        e = true;
        actedAt = n;
      } else if (
        target &&
        near <
          (p.classId === 'tank'
            ? 155
            : p.classId === 'heavy'
              ? 210
              : p.classId === 'mage'
                ? 240
                : 450)
      ) {
        if (p.classId === 'tank') e = true;
        else q = true;
        actedAt = n;
      }
    }
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: p.ack + 1,
      aim: target ? Math.atan2(target.y - p.y, target.x - p.x) : 0,
      fire: actedAt >= 0 && n > actedAt + 30,
      q,
      e,
    });
    g.step();
  }
  assert.equal(g.phase, 'storyScene', p.classId);
  assert.equal(g.encounter, 2);
  assert.equal(g.trainingFor(p.id)?.proofs.length, 1, p.classId + ' proof');
}
function store() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
test('A chapter credits only started-and-present actors, keeps ordinary work separate, and rejects inconsistent histories', () => {
  const c = new StoryChapter();
  assert(c.start(['a']));
  assert(c.clear('gate-constable', ['a', 'late']));
  assert(c.ready());
  assert(c.choose(2));
  assert(c.start(['a', 'late']));
  assert(c.clear('street-clearance', ['a', 'late']));
  assert(c.ready());
  assert(c.start(['a', 'late']));
  assert(c.clear('ward-matron', ['a', 'late']));
  assert(c.ready());
  assert(c.fullParticipant('a'));
  assert(!c.fullParticipant('late'));
  assert(validStoryChapter(c.snapshot()));
  for (const edit of [
    (s: any) => s.completedNodes.reverse(),
    (s: any) => (s.route = null),
    (s: any) => s.participation.a.push('ward-matron'),
    (s: any) => (s.stage = 'choice'),
  ]) {
    const bad = c.snapshot();
    edit(bad);
    assert(!validStoryChapter(bad));
  }
});
test('Proofs require the right owner, lesson, real positive effect and successful instance; failed practice keeps learning only', () => {
  const t = new StoryTraining('a', 'soldier');
  const id = chapterLessons.soldier.techniqueId;
  assert(!t.prepare(id));
  assert(!t.study('soldier-command-path-2-6'));
  assert(t.study(id));
  t.beginPractice('attempt-a', true);
  for (const event of [
    ['b', 'attempt-a', 'rallied-hit', 1],
    ['a', 'wrong', 'rallied-hit', 1],
    ['a', 'attempt-a', 'rallied-hit', 0],
    ['a', 'attempt-a', 'rallied-hit', NaN],
    ['a', 'attempt-a', 'construct-hit', 10],
  ] as const)
    assert(!t.observe(event[0], event[1], event[2], event[3]));
  assert(t.observe('a', 'attempt-a', 'rallied-hit', 1));
  assert(!t.finishPractice('attempt-a', false));
  assert.equal(t.snapshot().learned.length, 1);
  assert.equal(t.snapshot().proofs.length, 0);
  t.beginPractice('attempt-b', false);
  assert(!t.observe('a', 'attempt-b', 'rallied-hit', 1));
  assert(!t.finishPractice('attempt-b', true));
  t.beginPractice('attempt-c', true);
  assert(t.observe('a', 'attempt-c', 'rallied-hit', 1));
  assert(t.finishPractice('attempt-c', true));
  assert(!t.finishPractice('attempt-c', true));
  assert(t.prepare(id));
  assert(validStoryTraining(t.snapshot(), 'soldier'));
  assert(!validStoryTraining(t.snapshot(), 'heavy'));
  const copy = t.snapshot();
  copy.learned.length = 0;
  assert.equal(t.snapshot().learned.length, 1);
  assert(!validStoryTraining(copy, 'soldier'));
});
test('Every current class demonstrates its real kit in a completed ordinary encounter and prepares one actual D-minus effect without SP', () => {
  for (const c of data.classes) {
    const g = game(c.id as ClassId);
    street(g);
    const p = g.players.get('solo')!;
    const before = g.stats(p).ability;
    clearStreet(g);
    assert.equal(p.progress.clears, 1);
    assert.equal(g.completedBossIds.size, 1);
    assert.deepEqual([...g.completedBossIds], ['constable']);
    assert.equal(p.totalSp, 0);
    assert.equal(viewOf(g, 'solo').players[0].sp, 0);
    ready(g);
    assert.equal(g.phase, 'shop');
    assert(
      g.transact('solo', {
        id: 'prepare',
        kind: 'prepare',
        item: chapterLessons[p.classId].techniqueId,
      }).ok,
    );
    assert(g.stats(p).ability > before);
    assert.equal(viewOf(g, 'solo').players[0].sp, 0);
    assert(!g.transact('solo', { id: 'sp', kind: 'skill', item: 'general-sprint' }).ok);
    ready(g);
    waitPhase(g, 'loading');
    assert.equal(g.boss.id, 'matron');
    assert.equal(g.arena.id, 'triage-yard');
    g.boss.health = 0;
    g.step();
    assert.equal(g.chapter?.completedNodes.length, 3);
    assert.equal(p.progress.clears, 2);
    assert.equal(p.progress.campaignClears, 0);
    ready(g);
    assert.equal(g.phase, 'victory');
    assert.equal(g.chapter?.stage, 'complete');
    assert.equal(g.campaignBank, null);
    assert.deepEqual(g.storyChoices, [0]);
    assert.deepEqual(g.mutations, []);
    assert.equal(p.totalSp, 0);
  }
});
test('Chapter boundaries, lessons and ordinary proofs survive safe saves; incoherent training, boss counts, arenas and terminal stage claims fail', () => {
  for (let route = 0; route < 3; route++) {
    const g = game();
    street(g, route);
    clearStreet(g);
    for (const boundary of [
      g,
      (() => {
        const copy = Game.restoreOffline(g.offlineCheckpoint());
        ready(copy);
        return copy;
      })(),
    ]) {
      const saved = JSON.parse(JSON.stringify(boundary.offlineCheckpoint())),
        copy = Game.restoreOffline(saved);
      assert.deepEqual(copy.chapter, boundary.chapter);
      assert.deepEqual(copy.trainingFor('solo'), boundary.trainingFor('solo'));
      assert.equal(copy.players.get('solo')!.totalSp, 0);
      const authority = Game.restoreAuthoritative(
        JSON.parse(JSON.stringify(boundary.authoritativeCheckpoint())),
      );
      assert.deepEqual(authority.chapter, boundary.chapter);
      assert.deepEqual(authority.trainingFor('solo'), boundary.trainingFor('solo'));
      for (const edit of [
        (s: any) => (s.player.totalSp = 27),
        (s: any) => (s.chapter.stage = 'complete'),
        (s: any) => (s.chapter.participation.solo = []),
        (s: any) => s.completedBossIds.push('matron'),
        (s: any) => s.player.skills.push('soldier-command-path-2-6'),
        (s: any) => (s.arenaId = 'crown-crypt'),
        (s: any) => (s.player.training.characterId = 'hux-bell'),
      ]) {
        const bad = structuredClone(saved);
        edit(bad);
        assert.throws(() => Game.restoreOffline(bad));
      }
    }
  }
});
test('Free Play retains rapid SP budgets and no story scenes while chapter commands cannot buy knowledge or proof there', () => {
  const g = new Game({ mode: 'short' }),
    p = g.addPlayer('a', 'Mara', 'soldier');
  assert.equal(p.totalSp, 3);
  assert(
    !g.transact('a', { id: 'lesson', kind: 'study', item: chapterLessons.soldier.techniqueId }).ok,
  );
  assert(g.transact('a', { id: 'sp', kind: 'skill', item: chapterLessons.soldier.techniqueId }).ok);
  g.start();
  g.boss.health = 0;
  g.step();
  assert.equal(g.chapter, undefined);
  assert(p.totalSp > 3);
  assert.equal(g.phase, 'mutationVote');
  assert.throws(() => new Game({ mode: 'short', storyChapterId: 'one-place-left' }));
});
test('Chapter and Free Play extended clocks preserve shared boss health/attacks/grades while the original clock remains standard', () => {
  for (const d of data.difficulties) {
    const original = new Game({ mode: 'short', difficulty: d.id }),
      chapter = game('soldier', d.id),
      replay = new Game({
        mode: 'short',
        difficulty: d.id,
        freePlay: { openingBossId: 'constable', bossDeadlineMultiplier: 2 },
      });
    original.addPlayer('a', 'A', 'soldier');
    replay.addPlayer('a', 'A', 'soldier');
    original.start();
    chapter.start();
    replay.start();
    const { deadline, ...base } = original.boss,
      { deadline: chapterDeadline, ...chapterBoss } = chapter.boss,
      { deadline: replayDeadline, ...replayBoss } = replay.boss;
    assert.deepEqual(chapterBoss, base);
    assert.deepEqual(replayBoss, base);
    assert.equal(chapterDeadline, deadline * 2);
    assert.equal(replayDeadline, deadline * 2);
    assert.equal(replay.customized, true);
    assert.equal(chapter.customized, false);
  }
  for (const invalid of [0, -1, 1.5, 3, Infinity, '2'])
    assert(!validFreePlay({ bossDeadlineMultiplier: invalid }));
  assert(!validFreePlay({ scenarioId: 'ward-approach', bossDeadlineMultiplier: 2 }));
});
test('A late street arrival can continue at the next boundary without inheriting an earlier fight, demonstration or full chapter', () => {
  const g = new Game({ mode: 'story', storyChapterId: 'one-place-left', seed: 41, maxPlayers: 2 });
  g.addPlayer('solo', 'Mara', 'soldier');
  street(g);
  const late = g.addPlayer('late', 'Iona', 'medic');
  assert.equal(late.status, 'waiting');
  clearStreet(g);
  assert.equal(late.status, 'active');
  assert.equal(late.progress.clears, 0);
  assert.equal(g.trainingFor('late')?.proofs.length, 0);
  assert.deepEqual(g.chapter?.participation.late, undefined);
  ready(g);
  ready(g);
  waitPhase(g, 'loading');
  g.boss.health = 0;
  g.step();
  ready(g);
  assert.equal(g.chapter?.stage, 'complete');
  assert.deepEqual(g.chapter?.participation.late, ['ward-matron']);
  assert.equal(late.progress.clears, 1);
  assert.equal(g.trainingFor('late')?.proofs.length, 0);
  const values = store();
  recordChapterView(viewOf(g, 'solo'), 'late', values);
  assert.equal(chapterJournal(values).records[0].chapter.participation.late.length, 1);
});
test('Local chapter journals transfer without touching the earlier profile or supplying authority; malformed and quota-failed imports preserve old bytes', () => {
  const g = game();
  street(g);
  clearStreet(g);
  ready(g);
  const values = store();
  recordChapterView(viewOf(g, 'solo'), 'solo', values);
  recordProfileView(viewOf(g, 'solo'), 'solo', values);
  assert.equal(loadProfile(values).runs.length, 0);
  assert.equal(chapterJournal(values).records[0].training.proofs.length, 1);
  const other = store();
  importChapterJournal(exportChapterJournal(values), other);
  assert.deepEqual(chapterJournal(other), chapterJournal(values));
  const before = other.values.get(CHAPTER_JOURNAL_KEY);
  assert.throws(() => importChapterJournal('{bad', other));
  assert.equal(other.values.get(CHAPTER_JOURNAL_KEY), before);
  assert.throws(() =>
    importChapterJournal(exportChapterJournal(values), {
      getItem: other.getItem,
      setItem() {
        throw Error('quota');
      },
    }),
  );
  assert.equal(other.values.get(CHAPTER_JOURNAL_KEY), before);
  const fresh = game();
  assert.equal(fresh.trainingFor('solo')?.proofs.length, 0);
});
test('Campaign setup launches only chapter progression and Free Play clears that choice without offering a second SP-based Story mode', async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, 'src/client/ui/setup.ts'),
    launches: any[] = [];
  const dispose = ui.mountSetup(env.host, {
    resume() {},
    launch: (...args: any[]) => launches.push(args),
    profileChanged: async () => {},
    settingsHTML: () => '',
    bindSettings() {},
  });
  context.after(dispose);
  env.host.querySelector('#story-campaign')!.click();
  assert.equal(env.host.querySelector('[data-story-classic]'), null);
  env.host.querySelector('[data-story-begin]')!.click();
  assert.equal(ui.setupOptions().storyChapterId, 'one-place-left');
  env.host.querySelector('#setup-next')!.click();
  env.host.querySelector('#setup-next')!.click();
  env.host.querySelector('#launch')!.click();
  assert.equal(launches[0][1].storyChapterId, 'one-place-left');
  env.host.querySelector('#brand-home')!.click();
  env.host.querySelector('#new-run')!.click();
  assert.equal(ui.setupOptions().storyChapterId, undefined);
});
test('The real preparation controls teach without spending SP, expose actual status, and stop acting after disposal', async (context) => {
  const g = game();
  g.start();
  g.boss.health = 0;
  g.step();
  ready(g);
  g.vote('solo', 0);
  waitPhase(g, 'contractVote');
  const env = menuEnvironment(context),
    ui = await menuBundle(context, 'src/client/ui/shop.ts'),
    p = viewOf(g, 'solo').players[0];
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    ui.shopMarkup(p, ['1', '2', '3'], false, 'normal', 'prepare') +
    '</div>';
  assert(!env.host.querySelector('.loadout-summary')!.innerHTML.includes('ui.skillPoints'));
  let calls = 0;
  const binding = ui.bindShop(
    env.host,
    p,
    (request: any) => {
      calls++;
      assert(g.transact('solo', { id: 'native-lesson', ...request }).ok);
    },
    ['1', '2', '3'],
    false,
    'normal',
    'prepare',
  );
  const button = env.host.querySelector('[data-training="study"]')!;
  assert(button);
  button.click();
  assert.equal(g.trainingFor('solo')?.learned.length, 1);
  assert.equal(g.players.get('solo')!.totalSp, 0);
  binding.dispose();
  button.click();
  assert.equal(calls, 1);
});
