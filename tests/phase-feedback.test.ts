import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import progress from '../src/shared/development-progress.json';
import concepts from '../docs/early-watch-concepts-2026-10-25.json';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeGame } from '../src/shared/practice-start.ts';
import { data } from '../src/shared/game.ts';
import {
  BossPhaseFeedback,
  constablePhaseHint,
  constablePhaseHints,
} from '../src/client/boss-phase-feedback.ts';
import { bossVariantAppearance } from '../src/client/boss-variant-appearance.ts';
import { rhythmHit, rhythmWave, CombatRhythm } from '../src/client/combat-rhythm.ts';
import tempos from '../src/client/music-tempos.json';
import scores from '../assets/production/audio/boss-themes/library.json';

function gameAt(phase: number, variant: 'normal' | 'brutal') {
  const game = createPracticeGame({ mode: 'endless', seed: 721 }, 'Mara', 'soldier', variant);
  assert(game.start());
  game.players.get('solo')!.invulnerableUntil = 1e9;
  game.boss.health = game.boss.maxHealth * [1, 0.49][Math.min(1,phase)];
  while (game.boss.phase < Math.min(1,phase)) {
    game.step();
    assert(game.combatTick < 1000);
  }
  const start = game.combatTick;
  while (game.boss.castAt <= start || !game.warnings.some((w) => w.kind !== 'zone')) {
    game.step();
    assert(game.combatTick - start < 250);
  }
  return game;
}
test('Brutal adds real pincer, ring and triple-ring responses from the opening phase while Normal keeps its calibrated patterns', () => {
  for (let phase = 0; phase < 2; phase++) {
    const normal = gameAt(phase, 'normal'),
      brutal = gameAt(phase, 'brutal');
    const nw = normal.warnings.filter((w) => w.kind !== 'zone'),
      bw = brutal.warnings.filter((w) => w.kind !== 'zone');
    assert.equal(normal.boss.threat, brutal.boss.threat);
    assert.equal(brutal.boss.threat, 1);
    assert(bw.reduce((n, w) => n + w.count, 0) > nw.reduce((n, w) => n + w.count, 0));
    if (phase === 0) {
      assert.equal(nw.length, 2);
      assert.equal(bw.length, 4);
      assert.equal(new Set(bw.map((w) => `${w.x},${w.y}`)).size, 3);
    }
    if (phase === 1) {
      assert.equal(nw.filter(w=>w.kind==='ring').length,2);
      assert.equal(bw.filter(w=>w.kind==='ring').length,3);
      assert.equal(bw.filter(w=>w.kind==='fan').length,2);
    }
    const locked = bw.map((w) => ({ ...w }));
    brutal.drainEvents();
    let released = 0;
    const origin = { x: brutal.boss.x, y: brutal.boss.y };
    const end = brutal.boss.castEndsAt;
    while (brutal.combatTick < end - 1) {
      brutal.step();
      assert.equal(brutal.boss.x, origin.x);
      assert.equal(brutal.boss.y, origin.y);
      const emitted = brutal.drainEvents().flatMap((e) => (e.type === 'shots' ? e.shots : []));
      const due = locked.filter((w) => w.at === brutal.combatTick);
      if (due.length) {
        assert.equal(
          emitted.filter((s) => s.owner === 'hostile').length,
          due.reduce((n, w) => n + w.count, 0),
        );
        released += due.length;
      }
    }
    assert.equal(released, locked.length);
  }
});
test('Brutal Curfew combines three rings with a delayed pincer, preserving a common ring escape sector', () => {
  const game = gameAt(3, 'brutal');
  const rings = game.warnings.filter((w) => w.kind === 'ring');
  const fans = game.warnings.filter((w) => w.kind === 'fan');
  assert.equal(rings.length, 3);
  assert.equal(fans.length, 2);
  assert(fans.every((w) => w.at > Math.max(...rings.map((r) => r.at))));
  const gap =
    rings[0].arc - (Math.max(...rings.map((r) => r.aim)) - Math.min(...rings.map((r) => r.aim)));
  assert(gap > Math.PI / 4);
  assert(game.warnings.every((w) => w.at - game.combatTick >= 25));
});
test('phase-entry cues trigger once per actual phase and survive repeated patches, pauses and reduced-motion presentation', () => {
  const cue = new BossPhaseFeedback();
  assert(cue.sample(0, 'constable', 0, 'normal', 100, true));
  assert(cue.sample(0, 'constable', 0, 'normal', 219, true));
  assert(!cue.sample(0, 'constable', 0, 'normal', 220, true));
  assert(cue.sample(0, 'constable', 1, 'normal', 300, true));
  assert(cue.sample(0, 'constable', 1, 'normal', 300, true));
  assert(!cue.sample(0, 'constable', 1, 'normal', 420, true));
  assert(cue.sample(1, 'constable', 1, 'normal', 500, true));
  assert(!cue.sample(1, 'constable', 1, 'normal', 501, false));
  assert(cue.sample(1, 'constable', 1, 'normal', 502, true));
});
test('all fifteen phase-hint sets distinguish Normal and Brutal and explain each different response', () => {
  assert.deepEqual(Object.keys(constablePhaseHints).sort(), data.locales.map((l) => l.id).sort());
  for (const language of data.locales)
    for (let phase = 0; phase < 4; phase++) {
      const n = constablePhaseHint(phase, 'normal', language.id),
        b = constablePhaseHint(phase, 'brutal', language.id);
      assert(n && b && n !== b);
    }
  assert(constablePhaseHint(0, 'brutal', 'en').includes('pincer'));
  assert(constablePhaseHint(1, 'brutal', 'en').includes('ring'));
});
test('Brutal has an explicit persistent red treatment and switching to Normal or defeat clears it', () => {
  const brutal = bossVariantAppearance('brutal');
  assert.notEqual(brutal.tint, 0xffffff);
  assert.equal(brutal.marks, 4);
  for (const appearance of [
    bossVariantAppearance('normal'),
    bossVariantAppearance('brutal', false),
  ]) {
    assert.equal(appearance.tint, 0xffffff);
    assert.equal(appearance.marks, 0);
    assert.equal(appearance.ringAlpha, 0);
  }
});
test('all sixty-six theme pulse clocks match the issued composition tempos without changing theme masters', () => {
  assert.equal(Object.keys(tempos).length, 66);
  for (const score of scores.tracks)
    assert.deepEqual(tempos[score.bossId as keyof typeof tempos], {
      bpm: score.bpm,
      beatsPerBar: score.beatsPerBar,
    });
});
test('later phases and Brutal add bounded musical accents in even and odd meters', () => {
  for (const meter of [2.5, 3, 3.5, 4, 5]) {
    const hits = (phase: number, brutal: boolean) =>
      Array.from({ length: Math.round(meter * 2) }, (_, s) =>
        rhythmHit(s, meter, phase, brutal),
      ).filter(Boolean);
    assert(hits(2, false).length > hits(0, false).length);
    assert(hits(0, true).length > hits(0, false).length);
    assert(hits(3, true).every((hit) => hit!.gain <= 0.16));
  }
  for (const kind of ['low', 'rim'] as const) {
    const wave = rhythmWave(kind, 44100);
    assert(wave.every(Number.isFinite));
    assert(Math.max(...wave.map(Math.abs)) < 1);
    assert.deepEqual(wave, rhythmWave(kind, 44100));
    assert.equal(Math.abs(wave[0]), 0);
    assert(Math.abs(wave.at(-1)!) < 0.01);
  }
});
test('music pulse scheduler stays bounded, follows volume/ducking and never bursts after hidden or suspended time', () => {
  let visible = true;
  const sources: any[] = [];
  const gains: any[] = [];
  const context: any = {
    currentTime: 0,
    state: 'running',
    sampleRate: 44100,
    destination: {},
    createGain: () => {
      const g: any = {
        gain: {
          value: 0,
          cancelScheduledValues() {},
          setTargetAtTime(v: number, at: number) {
            g.values.push({ v, at });
          },
        },
        values: [],
        connect: () => g,
        disconnect() {},
      };
      gains.push(g);
      return g;
    },
    createBuffer: () => ({ copyToChannel() {} }),
    createBufferSource: () => {
      const source: any = {
        buffer: null,
        at: 0,
        onended: null,
        connect: (target: any) => target,
        disconnect() {},
        start(at: number) {
          source.at = at;
        },
        stop() {
          source.onended?.();
        },
      };
      sources.push(source);
      return source;
    },
  };
  const rhythm = new CombatRhythm(() => visible);
  try {
    rhythm.configure(2, true, 0.3, 0);
    rhythm.start(context, 108, 4, 0);
    assert(sources.length >= 1);
    visible = false;
    context.currentTime = 20;
    const before = sources.length;
    rhythm.tick();
    assert.equal(sources.length, before);
    visible = true;
    rhythm.tick();
    assert(sources.slice(before).every((s) => s.at >= 20));
    assert(sources.length - before <= 1);
    rhythm.configure(2, true, 0, 0);
    context.currentTime = 25;
    const muted = sources.length;
    rhythm.tick();
    assert.equal(sources.length, muted);
    rhythm.configure(1, false, 0.4, 26);
    assert(gains[0].values.some((v: any) => Math.abs(v.v - 0.22) < 1e-8));
    context.state = 'suspended';
    rhythm.tick();
    assert.equal(sources.length, muted);
  } finally {
    rhythm.stop();
  }
});

test('one progress ledger keeps local, Wiki and in-game counts aligned with executable content and pending review', () => {
  execFileSync(process.execPath, ['tools/sync-development-progress.mjs', '--check']);
  assert.equal(progress.playableBosses, data.bosses.length);
  assert.equal(progress.ordinaryBossesRemaining, 85);
  assert.equal(progress.generatedConcepts, 0);
  assert.equal(progress.ordinaryTarget, 150);
  assert.equal(progress.items.find((i) => i.id === 'boss-quality')!.remaining, 54);
  assert.equal(progress.items.find((i) => i.id === 'class-abilities')!.remaining, 0);
  assert.equal(progress.items.find((i) => i.id === 'map-layout')!.remaining, 0);
  assert.equal(progress.items.find((i) => i.id === 'map-layout')!.humanAccepted, 0);
});
test('the three original new-boss concepts preserve exact requests and native returns without inflating playable counts', () => {
  assert.equal(concepts.playableBossesAdded, 0);
  assert.equal(concepts.concepts.length, 3);
  const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
  for (const concept of concepts.concepts) {
    assert.equal(sha(concept.native), concept.nativeSha256);
    assert.equal(sha(concept.request), concept.requestSha256);
    assert(data.bosses.some((b) => b.id === concept.bossId)); // The issued concept remains immutable; admission is recorded separately.
    assert.equal(concept.renderedAccepted, false);
  }
});
