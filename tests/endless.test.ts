import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EndlessDirector,
  exclusiveBossIds,
  finalBossIds,
  endlessSolids,
  leaveMovingBlocks,
  type EndlessCue,
} from '../src/shared/endless-director.ts';
import {
  EndlessSchedule,
  routeBossIds,
  openingBossIds,
  validEndlessHistory,
} from '../src/shared/endless-schedule.ts';
import { Random } from '../src/shared/random.ts';
import type { SignatureContext } from '../src/shared/boss-director.ts';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, PROTOCOL, type BossId, type Shot } from '../src/shared/protocol.ts';
import { Prediction } from '../src/client/prediction.ts';
import { viewOf, personalView } from '../src/shared/view.ts';
import { recordPracticeCampaign, practiceRecords } from '../src/client/progress.ts';
import { signatureHelp, extensionText } from '../src/client/extension-ui.ts';
import messages from '../src/client/extension-ui.json';
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function fixture(id: BossId, brutal = false, party = 1) {
  const d = new EndlessDirector();
  d.reset(id, true);
  let serial = 1;
  const hurt: number[] = [],
    shots: { x: number; y: number; angle: number; speed: number }[] = [],
    summons: number[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 400 },
    bossMaximumHealth: 4000,
    radius: 58,
    targets: Array.from({ length: party }, (_, i) => ({
      id: 'p' + i,
      x: 800,
      y: 750,
      oldX: 800,
      oldY: 750,
    })),
    obstacles: [],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    interactors: [],
    damageScale: brutal ? 2 : 1,
    brutal,
    phase: 0,
    id: () => serial++,
    damage: (_id, n) => hurt.push(n),
    spawnRat: () => {},
    emitHostile: (p, angle, speed) => shots.push({ x: p.x, y: p.y, angle, speed }),
    spawnOrdinary: (_p, _s, _h, _d, cap) => summons.push(cap),
    relocateBoss: (p) => {
      c.boss.x = p.x;
      c.boss.y = p.y;
    },
  };
  const cast = () =>
    d.cast(c, c.targets[0], {
      kind: 'fan',
      count: 11,
      speed: 140,
      damage: 13,
      telegraph: 1.5,
      interval: 10,
    });
  const step = (to: number) => {
    while (c.tick < to) {
      c.tick++;
      d.step(c);
    }
  };
  return { d, c, hurt, shots, summons, cast, step };
}
function of<K extends EndlessCue['kind']>(f: ReturnType<typeof fixture>, kind: K) {
  return f.d.cues().filter((c): c is Extract<EndlessCue, { kind: K }> => c.kind === kind);
}
test('all ten signatures are finite in Normal/Brutal phases for solo and sixteen-player objectives', () => {
  for (const id of finalBossIds)
    for (const brutal of [false, true])
      for (const party of [1, 16]) {
        const f = fixture(id, brutal, party);
        Object.assign(f.c.boss, { id, privateField: 'never-copy' });
        f.d.prepare(f.c);
        for (let phase = 0; phase < (brutal ? 4 : 3); phase++) {
          f.c.phase = phase;
          f.d.reset(id);
          assert(f.cast());
          assert(f.d.cues().every((c) => Number.isSafeInteger(c.id)));
          assert(!JSON.stringify(f.d.cues()).includes('never-copy'));
          f.step(f.c.tick + 470);
          assert(f.d.cues().length < 110);
          assert(!JSON.stringify(f.d.cues()).includes('null'));
        }
        f.d.reset('constable', true);
        assert.equal(f.d.cues().length, 0);
      }
});
test('Widow fans emit only after warning and replay the exact eleven trajectories once after 2.5 seconds', () => {
  const f = fixture('hourglass-widow');
  f.cast();
  const fans = of(f, 'endless-state');
  assert.equal(fans.length, 2);
  assert.equal(fans[1].at - fans[0].at, 75);
  f.step(fans[0].at - 1);
  assert.equal(f.shots.length, 0);
  f.step(fans[0].at);
  assert.equal(f.shots.length, 11);
  const first = structuredClone(f.shots);
  f.c.targets[0].x = 100;
  f.step(fans[1].at);
  assert.equal(f.shots.length, 22);
  assert.deepEqual(f.shots.slice(11), first);
  f.step(fans[1].at + 200);
  assert.equal(f.shots.length, 22);
});
test('Astronomer has two damaging orbits and one harmless hollow safe orbit around its deployed core', () => {
  const f = fixture('unlit-astronomer');
  f.d.prepare(f.c);
  assert.equal(f.c.boss.y, 500);
  f.cast();
  const orbs = of(f, 'endless-marker');
  assert.deepEqual(
    orbs.map((o) => o.orbit),
    [180, 300, 240],
  );
  assert.equal(orbs[2].damage, 0);
  f.step(orbs[0].at);
  const safe = orbs[2];
  Object.assign(f.c.targets[0], { x: safe.x, y: safe.y, oldX: safe.x, oldY: safe.y });
  f.step(f.c.tick + 1);
  assert.equal(f.hurt.length, 0);
  const danger = orbs[0];
  Object.assign(f.c.targets[0], { x: danger.x, y: danger.y, oldX: danger.x, oldY: danger.y });
  f.step(f.c.tick + 1);
  assert(f.hurt.length > 0);
  assert.notEqual(danger.x, danger.oldX);
});
test('Fold reflects one actual hostile shot at the visible segment and never reflects it twice', () => {
  const f = fixture('folded-man');
  f.cast();
  const line = of(f, 'endless-line').find((l) => l.style === 'fold')!;
  const shot: Shot = {
    id: 800,
    owner: 'hostile',
    x: line.x1 - 50,
    y: (line.y1 + line.y2) / 2,
    vx: 3000,
    vy: 0,
    radius: 5,
    damage: 12,
    expires: 999,
    pierce: 0,
  };
  const old = { x: shot.x, y: shot.y },
    next = { x: line.x1 + 50, y: shot.y };
  assert.equal(f.d.reflectShot(shot, old, { ...next }, line.at - 1), false);
  assert(f.d.reflectShot(shot, old, next, line.at));
  assert.equal(next.x, line.x1);
  assert.equal(shot.vx, -3000);
  assert.equal(f.d.reflectShot(shot, next, old, line.at + 1), false);
  assert(of(f, 'endless-line').some((l) => l.style === 'exit'));
  const miss = { ...shot, id: 801, vx: 3000 };
  assert.equal(
    f.d.reflectShot(
      miss,
      { x: line.x1 - 20, y: line.y2 + 1 },
      { x: line.x1 + 20, y: line.y2 + 1 },
      line.at,
    ),
    false,
  );
});
test('Red Comet visits three ordered warned waypoints at bounded speed and leaves oldest trails harmless first', () => {
  const f = fixture('red-comet');
  f.c.obstacles = [{ x: 950, y: 300, width: 100, height: 200 }];
  f.cast();
  const paths = of(f, 'endless-state').filter((s) => s.style === 'dash'),
    trails = of(f, 'endless-line');
  assert.equal(paths.length, 3);
  assert(paths[1].at > paths[0].until);
  assert(trails.every((t) => t.disabled));
  let before = { ...f.c.boss };
  for (let n = 1; n < paths[2].until; n++) {
    f.step(n);
    assert(distance(before, f.c.boss) <= 360 / 30 + 1e-6);
    before = { ...f.c.boss };
  }
  assert(trails[0].until < trails[1].until && trails[1].until < trails[2].until);
  f.step(trails[0].until);
  assert(!f.d.cues().some((c) => c.id === trails[0].id));
});
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
test('Memory Taxer leaves numbered history visible and hurts only outside the requested complete pad', () => {
  const f = fixture('memory-taxer', false, 2);
  f.cast();
  const memory = of(f, 'endless-state')[0],
    pads = of(f, 'endless-pad'),
    safe = pads.find((p) => p.correct)!;
  assert.deepEqual(memory.history, [0, 1, 2]);
  Object.assign(f.c.targets[0], { x: safe.x, y: safe.y, oldX: safe.x, oldY: safe.y });
  Object.assign(f.c.targets[1], { x: 100, y: 100, oldX: 100, oldY: 100 });
  f.step(119);
  assert.equal(f.hurt.length, 0);
  assert.equal(memory.history.length, 3);
  f.step(120);
  assert.deepEqual(f.hurt, [18]);
  f.step(121);
  assert.equal(f.hurt.length, 1);
});
test('Moth ribbons contain real curved bodies, retain a 180px crossing and stop at masonry', () => {
  const f = fixture('choir-of-moths');
  f.cast();
  const moths = of(f, 'endless-marker');
  assert.equal(moths.length, 16);
  const broken = moths.filter((m) => m.index === 0).sort((a, b) => a.offset - b.offset);
  assert(broken[2].offset - broken[1].offset - 18 >= 180);
  f.step(moths[0].at);
  for (let t = 0; t < 40; t++) {
    f.step(f.c.tick + 1);
    for (const m of moths) assert(distance(m, { x: m.oldX, y: m.oldY }) <= 130 / 30 + 1e-8);
  }
  assert(moths.some((m) => Math.abs(m.y - m.oldY) > 0.01));
  const first = moths[0];
  f.c.obstacles = [{ x: first.x + 1, y: first.y - 50, width: 10, height: 100 }];
  f.step(f.c.tick + 1);
  assert(!f.d.cues().some((c) => c.id === first.id));
});
test('Conductor counts four fixed beats, leaving one visually marked safe lane on every pulse', () => {
  const f = fixture('zero-hour-conductor');
  f.cast();
  const beats = of(f, 'endless-state');
  assert.equal(beats.length, 4);
  assert.deepEqual(
    beats.map((s) => s.at - beats[0].at),
    [0, 27, 54, 81],
  );
  for (const beat of beats) {
    const lines = of(f, 'endless-line').filter((l) => l.at === beat.at);
    assert.equal(lines.length, 3);
    const x = (1600 * (beat.history[0] + 0.5)) / 4;
    assert(lines.every((l) => Math.abs(x - l.x1) > l.width / 2 + 9));
  }
  assert.deepEqual(
    beats.map((s) => s.history[0]),
    [0, 1, 0, 1],
  );
});
test('Walking District blocks move exactly 55px/s, are actual shared solids and expose a timed core', () => {
  const f = fixture('walking-district');
  f.cast();
  const blocks = of(f, 'endless-prop').filter((p) => p.role === 'block'),
    core = of(f, 'endless-prop').find((p) => p.role === 'core')!;
  assert.equal(blocks.length, 2);
  assert.equal(endlessSolids(f.d.cues(), blocks[0].at - 1).length, 0);
  assert(!f.d.weakPoints().some((p) => p.role === 'core'));
  f.step(blocks[0].at);
  const before = blocks[0].y;
  f.step(f.c.tick + 30);
  assert(Math.abs(blocks[0].y - before - 55) < 0.15);
  assert.equal(endlessSolids(f.d.cues(), f.c.tick).length, 2);
  const clear = leaveMovingBlocks(blocks[0], endlessSolids(f.d.cues(), f.c.tick), []);
  assert(distance(clear, blocks[0]) > 60);
  f.step(core.at);
  assert(f.d.transfersDamage(core.id));
  f.step(core.until);
  assert(!f.d.weakPoints().some((p) => p.role === 'core'));
});
test('Knocker announces three harmless counts, swings a bounded door sector and opens recovery', () => {
  const f = fixture('last-knocker');
  f.cast();
  const knock = of(f, 'endless-state')[0];
  f.step(knock.at - 1);
  assert.equal(knock.progress, 3);
  assert.equal(f.hurt.length, 0);
  Object.assign(f.c.targets[0], { x: 800, y: 200, oldX: 800, oldY: 200 });
  f.step(knock.until - 1);
  assert.equal(f.hurt.length, 0);
  assert.equal(f.d.bodyMultiplier(f.c.tick), 1.5);
  assert.equal(f.d.bodyMultiplier(f.c.tick + 105), 1);
});
test('Uncounted bounds four ledger echoes, warns its relocation, creates offset beams, a wide ring gap and capped summons', () => {
  const f = fixture('uncounted', false, 16);
  f.cast();
  assert.equal(of(f, 'endless-echo').length, 4);
  const warp = of(f, 'endless-state').find((s) => s.style === 'warp')!,
    ring = of(f, 'endless-ring')[0];
  assert.equal(Math.round((ring.gap * 180) / Math.PI), 40);
  assert.equal(of(f, 'endless-line').filter((l) => l.style === 'echo').length, 4);
  const before = { ...f.c.boss };
  f.step(warp.at - 1);
  assert.deepEqual(f.c.boss, before);
  f.step(warp.at);
  assert.equal(f.c.boss.x, warp.endX);
  assert.equal(f.c.boss.y, warp.endY);
  f.step(warp.at + 20);
  assert.equal(f.summons.length, 4);
  assert(f.summons.every((cap) => cap === 8));
});
test('seeded bags guarantee exclusive fights every fourth slot, readable openings and twelve-completion repeat protection', () => {
  assert.equal(routeBossIds.length, 56);
  for (let seed = 1; seed <= 16; seed++) {
    const s = new EndlessSchedule(),
      rng = new Random(seed),
      seen = new Set<string>(),
      history: BossId[] = ['constable'];
    s.record('constable');
    for (let completed = 1; completed < 250; completed++) {
      const offer = s.offer(completed, rng);
      assert.equal(new Set(offer).size, 3);
      assert(offer.every((id) => !s.state.recent.includes(id) && id !== 'uncounted'));
      assert(
        offer.every((id) =>
          (completed + 1) % 4 === 0
            ? exclusiveBossIds.some((x) => x === id)
            : routeBossIds.includes(id),
        ),
      );
      if (completed < 3) assert(offer.every((id) => openingBossIds.some((x) => x === id)));
      const id = offer[Math.floor(rng.next() * 3)];
      assert(!history.slice(-12).includes(id));
      seen.add(id);
      history.push(id);
      s.record(id);
      assert(validEndlessHistory(s.state));
    }
    assert.equal(seen.size, 65);
  }
});
test('actual Endless route preserves bags, history, seeded choices and power caps across restored boundaries', () => {
  let g = new Game({ mode: 'endless', maxPlayers: 1, seed: 829 });
  g.addPlayer('solo', 'Vigil', 'soldier');
  g.start();
  const recent: BossId[] = [];
  for (let n = 0; n < 110; n++) {
    assert(!recent.slice(-12).includes(g.boss.id));
    recent.push(g.boss.id);
    assert.notEqual(g.boss.id, 'uncounted');
    g.boss.health = 0;
    g.step();
    assert.equal(g.phase, 'mutationVote');
    const save = g.offlineCheckpoint()!,
      copy = Game.restoreOffline(save);
    g.phaseEnds = g.tick;
    copy.phaseEnds = copy.tick;
    g.step();
    copy.step();
    assert.deepEqual(copy.contractCards, g.contractCards);
    assert.deepEqual(copy.endless.state, g.endless.state);
    g = copy;
    while (g.phase !== 'combat') {
      g.phaseEnds = g.tick;
      g.step();
    }
    const p = [...g.players.values()][0];
    assert(p.totalSp <= 27);
    assert(p.incomeGranted <= 2400);
    assert.equal(g.campaignBank, null);
  }
});
test('new local history validation rejects duplicate cooldown identities, foreign bag entries and secret claims in old saves', () => {
  const g = new Game({ mode: 'raid', maxPlayers: 1 });
  g.addPlayer('p', 'Old', 'engineer');
  const save = g.offlineCheckpoint()!;
  save.protocolVersion = 11;
  assert.equal(Game.restoreOffline(save).offlineCheckpoint()!.protocolVersion, PROTOCOL);
  save.settings.openingBossId = 'hourglass-widow';
  assert.throws(() => Game.restoreOffline(save));
  const fresh = new Game({ maxPlayers: 1 });
  fresh.addPlayer('p', 'New', 'soldier');
  const bad = fresh.offlineCheckpoint()!;
  bad.endlessHistory.recent = ['courier', 'courier'];
  assert.throws(() => Game.restoreOffline(bad));
  bad.endlessHistory.recent = [];
  bad.endlessHistory.routeBag = ['uncounted'];
  assert.throws(() => Game.restoreOffline(bad));
});
test('fold direction changes replicate the same projectile identity instead of creating a duplicate', () => {
  const g = new Game({ mode: 'endless', maxPlayers: 1, openingBossId: 'folded-man' }),
    p = g.addPlayer('solo', 'Fold', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  advance(g, 111);
  g.boss.staggerUntil = 1e9;
  const fold = g.director.endless
    .cues()
    .find(
      (c): c is Extract<EndlessCue, { kind: 'endless-line' }> =>
        c.kind === 'endless-line' && c.style === 'fold',
    )!;
  assert(fold);
  const s: Shot = {
    id: 900001,
    owner: 'hostile',
    x: fold.x1 - 10,
    y: (fold.y1 + fold.y2) / 2,
    vx: 600,
    vy: 0,
    radius: 5,
    damage: 12,
    pierce: 0,
    expires: 10000,
  };
  g.shots.set(s.id, s);
  g.drainEvents();
  g.step();
  assert(g.shots.get(s.id));
  assert.equal(g.shots.get(s.id)!.vx, -600);
  assert(
    g
      .drainEvents()
      .some((e) => e.type === 'shots' && e.shots.some((x) => x.id === s.id && x.vx === -600)),
  );
});
test('moving-block authority and prediction share analytical positions and clear a newly occupied rectangle', () => {
  const g = new Game({ mode: 'endless', maxPlayers: 1, openingBossId: 'walking-district' }),
    p = g.addPlayer('solo', 'Blocks', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  advance(g, 119);
  g.boss.staggerUntil = 1e9;
  const block = g.director.endless
    .cues()
    .find((c) => c.kind === 'endless-prop' && c.role === 'block')!;
  assert(block && block.kind === 'endless-prop');
  p.x = block.x;
  p.y = block.y;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, p.id), p.id);
  for (let sequence = 1; sequence <= 25; sequence++) {
    const input = { ...idleInput(), sequence, moveX: 1, dodge: sequence === 15 };
    prediction.submit(input, viewOf(g, p.id));
    g.submitInput(p.id, input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-7);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-7);
  }
});
function campaign(difficulty = 'normal', players = 1) {
  const g = new Game({ mode: 'raid', difficulty, maxPlayers: players, seed: 38 });
  for (let n = 0; n < players; n++) g.addPlayer('p' + n, 'Survivor ' + n, 'soldier');
  g.start();
  return g;
}
function finish(g: Game, accords = 3) {
  g.accords = accords;
  for (let n = 0; n < 3; n++) {
    g.boss.health = 0;
    g.step();
    if (n < 2)
      while (g.phase !== 'combat') {
        g.phaseEnds = g.tick;
        g.step();
      }
  }
  return g;
}
test('Normal+ timeout-free campaign victory banks before the offer and keeps Easy locked without requiring removed Accords', () => {
  const yes = finish(campaign());
  assert.equal(yes.phase, 'secretOffer');
  assert.equal(yes.campaignBank!.encounters, 3);
  assert.equal(yes.campaignBank!.accords, 3);
  assert.equal(yes.campaignBank!.timeouts, 0);
  for (const difficulty of ['baby', 'easy']) {
    const no = finish(campaign(difficulty));
    assert.equal(no.phase, 'victory');
    assert.equal(no.secretStatus, 'locked');
  }
  assert.equal(finish(campaign(), 0).phase, 'secretOffer');
  const timeout = campaign();
  timeout.timeouts = 1;
  assert.equal(finish(timeout).phase, 'victory');
});
test('three actual Easy Standard shield holds still award genuine Accords across separate encounters', () => {
  const g=new Game({difficulty:'easy',mode:'endless',maxPlayers:1}),p=g.addPlayer('p','Accord','assassin');g.start();
  for(let n=0;n<3;n++) {
    if(n){g.boss.health=0;g.step();while(g.phase!=='combat'){g.phaseEnds=g.tick;g.step();}}
    p.invulnerableUntil=1e9;g.boss.deadline=1e9;
    g.boss.health=g.boss.maxHealth*.49;g.step();assert(g.accord);
    p.x=g.accord.points[0].x;p.y=g.accord.points[0].y;advance(g,90);
  }
  assert.equal(g.accords,3);
});
test('each survivor may bank and leave while willing allies continue; only consenting entrants scale the secret', () => {
  const g = finish(campaign('normal', 2)),
    bank = structuredClone(g.campaignBank);
  assert(g.vote('p0', 1));
  assert.equal(g.phase, 'secretOffer');
  assert(g.vote('p1', 0));
  assert.equal(g.phase, 'loading');
  assert.deepEqual(g.extensionParticipants, ['p0']);
  assert.equal(personalView(viewOf(g, 'p1'), 'p1').phase, 'victory');
  assert.equal(personalView(viewOf(g, 'p1'), 'p1').secretStatus, 'declined');
  g.phaseEnds = g.tick;
  g.step();
  assert.equal(g.players.get('p1')!.status, 'waiting');
  const base = new Game({ maxPlayers: 1, openingBossId: 'uncounted' });
  base.addPlayer('p', 'Baseline', 'soldier');
  base.start();
  const healthModifiers = g.mutations.reduce(
    (n, a) =>
      n *
      Number(
        (data.mutations.find((m) => m.id === a.id)!.modifiers as Record<string, unknown>)
          .bossHealth ?? 1,
      ),
    1,
  );
  assert(Math.abs(g.boss.maxHealth - base.boss.maxHealth * healthModifiers) < 1e-8);
  assert.deepEqual(g.campaignBank, bank);
  const timeout = finish(campaign());
  timeout.phaseEnds = timeout.tick;
  timeout.step();
  assert.equal(timeout.phase, 'victory');
  assert(timeout.campaignBank);
});
test('an unanswered offer expires into the accepted subset, and all-declined offers preserve a terminal victory', () => {
  const accepted = finish(campaign('normal', 2));
  accepted.vote('p0', 1);
  accepted.phaseEnds = accepted.tick;
  accepted.step();
  assert.equal(accepted.phase, 'loading');
  assert.deepEqual(accepted.extensionParticipants, ['p0']);
  assert.equal(personalView(viewOf(accepted, 'p1'), 'p1').phase, 'victory');
  const declined = finish(campaign('normal', 2));
  declined.vote('p0', 0);
  assert.equal(declined.phase, 'secretOffer');
  assert.equal(personalView(viewOf(declined, 'p0'), 'p0').phase, 'victory');
  declined.vote('p1', 0);
  assert.equal(declined.phase, 'victory');
  assert.equal(declined.secretStatus, 'declined');
});
test('offer, acceptance and loading restore exactly; extension defeat retains the campaign bank and never auto-rewards a memorial', () => {
  let g = finish(campaign());
  g = Game.restoreOffline(g.offlineCheckpoint()!);
  assert.equal(g.phase, 'secretOffer');
  const p = [...g.players.values()][0];
  assert(g.vote(p.id, 1));
  assert.equal(g.phase, 'loading');
  g = Game.restoreOffline(g.offlineCheckpoint()!);
  const bank = structuredClone(g.campaignBank);
  g.phaseEnds = g.tick;
  g.step();
  assert.equal(g.boss.id, 'uncounted');
  assert.equal(g.boss.threat, 11);
  assert.equal(g.arena.id, 'crown-crypt');
  assert.equal(g.phase, 'combat');
  g.boss.deadline = g.combatTick;
  g.step();
  assert.equal(g.secretStatus, 'failed');
  assert.equal(g.phase, 'victory');
  assert.deepEqual(g.campaignBank, bank);
});
test('local Practice victory and memorial records persist, cannot be erased by stale state, and remain separate from verified ranks', () => {
  const map = new Map<string, string>(),
    store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
  const g = finish(campaign()),
    view = viewOf(g, 'p0');
  assert(recordPracticeCampaign(view, 'p0', store));
  assert.equal(practiceRecords(store).length, 1);
  assert.equal(practiceRecords(store)[0].verified, false);
  assert(g.vote('p0', 1));
  g.phaseEnds = g.tick;
  g.step();
  g.boss.health = 0;
  g.step();
  assert.equal(g.secretStatus, 'cleared');
  assert(recordPracticeCampaign(viewOf(g, 'p0'), 'p0', store));
  assert(practiceRecords(store)[0].memorial);
  assert(recordPracticeCampaign(view, 'p0', store));
  assert(practiceRecords(store)[0].memorial);
  const rehearsal = new Game({ maxPlayers: 1, openingBossId: 'uncounted' });
  rehearsal.addPlayer('p', 'Rehearsal', 'soldier');
  rehearsal.start();
  rehearsal.boss.health = 0;
  rehearsal.step();
  assert(recordPracticeCampaign(viewOf(rehearsal, 'p'), 'p', store));
  assert.equal(practiceRecords(store).length, 1);
});
test('new consent and visual-history messages cover all fifteen locales with matching placeholders', () => {
  assert.deepEqual(Object.keys(messages).sort(), data.locales.map((l) => l.id).sort());
  for (const [locale, words] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(words), Object.keys(messages.en));
    assert(Object.values(words).every((x) => x.trim().length > 4));
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[])
      assert(
        !extensionText(locale, key, {
          history: '1 → 2 → 3',
          first: 1,
          beat: 2,
          lane: 3,
          count: 2,
        }).includes('{'),
      );
  }
  const g = new Game({ maxPlayers: 1 });
  g.addPlayer('p', 'Read', 'soldier');
  const f = fixture('memory-taxer');
  f.cast();
  const v = viewOf(g, 'p');
  v.bossCues = f.d.cues();
  assert(signatureHelp(v, 'en').includes('1 → 2 → 3'));
  assert(signatureHelp(v, 'ar').includes('التسلسل'));
});
test('all ten bosses execute actual Normal and Brutal phases on real arena geometry and clear every cue on victory', () => {
  for (const id of finalBossIds)
    for (const brutal of [false, true]) {
      const lobby = new Game({
        mode: 'endless',
        openingBossId: id,
        maxPlayers: 1,
        openingArenaId: 'sunken-chapel',
      });
      lobby.addPlayer('p', 'Mara', 'soldier');
      const save = lobby.offlineCheckpoint()!;
      save.selectedContract.variant = brutal ? 'brutal' : 'normal';
      const g = Game.restoreOffline(save);
      g.start();
      [...g.players.values()][0].invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      for (let phase = 0; phase < (brutal ? 4 : 3); phase++) {
        if (phase) {
          g.boss.health =
            g.boss.maxHealth * (brutal ? [1, 0.74, 0.49, 0.24][phase] : [1, 0.74, 0.39][phase]);
          g.step();
          assert.equal(g.boss.phase, phase);
          assert.equal(g.accord,null);
          g.step();
        }
        // Existing scores finish naturally; require a fresh signature within its bounded recovery.
        const prior = new Set(g.director.cues().map(c => c.id));
        const budget = Math.max(180,g.director.endless.nextSignatureAt-g.combatTick+90);
        assert(budget<=3000,'Unbounded signature recovery');
        let seen = false;
        for (let t = 0; t < budget; t++) {
          g.step();
          seen ||= g.director.cues().some((c) => c.kind.startsWith('endless-') && !prior.has(c.id));
        }
        assert(seen, id + ' phase ' + phase);
      }
      assert(
        [...g.shots.values()].filter((s) => s.owner === 'hostile').length <=
          data.rules.maximumHostileProjectiles,
      );
      g.boss.health = 0;
      g.step();
      assert.equal(g.director.cues().length, 0);
    }
});

test('reward-time arrivals cannot claim a campaign or memorial, and reconnecting non-consenters keep the campaign only', () => {
  const map = new Map<string, string>(),
    store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
  const g = new Game({ mode: 'raid', difficulty: 'normal', maxPlayers: 2, seed: 38 });
  g.addPlayer('p0', 'Host', 'soldier');
  g.start();
  g.accords = 3;
  for (let n = 0; n < 2; n++) {
    g.boss.health = 0;
    g.step();
    while (g.phase !== 'combat') {
      g.phaseEnds = g.tick;
      g.step();
    }
  }
  const late = g.addPlayer('late', 'Late', 'medic');
  assert(!late.eligible);
  g.boss.health = 0;
  g.step();
  assert.equal(g.phase, 'secretOffer');
  assert(recordPracticeCampaign(viewOf(g, 'late'), 'late', store));
  assert.equal(practiceRecords(store).length, 0);
  assert.throws(() => g.addPlayer('new', 'New', 'medic'));
  const pair = finish(campaign('normal', 2));
  pair.setConnected('p1', false);
  assert(pair.vote('p0', 1));
  assert.deepEqual(pair.extensionParticipants, ['p0']);
  const restored = Game.restoreAuthoritative(pair.authoritativeCheckpoint()!);
  assert.deepEqual(restored.extensionParticipants, ['p0']);
  pair.phaseEnds = pair.tick;
  pair.step();
  pair.setConnected('p1', true);
  assert.equal(pair.players.get('p1')!.status, 'waiting');
  pair.boss.health = 0;
  pair.step();
  assert.equal(pair.secretStatus, 'cleared');
  assert(recordPracticeCampaign(viewOf(pair, 'p1'), 'p1', store));
  assert.equal(practiceRecords(store)[0].memorial, false);
  assert(recordPracticeCampaign(viewOf(pair, 'p0'), 'p0', store));
  assert.equal(practiceRecords(store)[0].memorial, true);
});
