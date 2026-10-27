import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import {
  bossThreat,
  bossThreatProfiles,
  threatCode,
  classifiedContract,
  threatBounty,
  threatHealth,
} from '../src/shared/boss-threat.ts';
import { PROTOCOL, type BossId, type ModeId } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import labels from '../src/client/threat-labels.json';

test('all sixty-six identities have one fixed classification and exactly one above-Calamity secret; the minimum ordinary roster needs eighty-five more original bosses', () => {
  const profiles = bossThreatProfiles.entries;
  assert.equal(profiles.length, 66);
  assert.equal(new Set(profiles.map((p) => p.bossId)).size, 66);
  assert.deepEqual(new Set(profiles.map((p) => p.bossId)), new Set(data.bosses.map((p) => p.id)));
  for (const p of profiles) {
    assert(Number.isInteger(p.level) && p.level >= 1 && p.level <= 11);
    assert(Number.isInteger(p.subtier) && p.subtier >= -2 && p.subtier <= 2);
    assert.equal(p.level > 10, p.bossId === 'uncounted');
  }
  assert.equal(threatCode(bossThreat('constable').level, bossThreat('constable').subtier), '1+');
  assert.equal(
    threatCode(bossThreat('bell-triplets').level, bossThreat('bell-triplets').subtier),
    '3--',
  );
  assert.equal(threatCode(11, 0), '>10');
  let deficit = 0;
  for (let level = 1; level <= 10; level++)
    for (let subtier = -2; subtier <= 2; subtier++)
      deficit += Math.max(
        0,
        3 - profiles.filter((p) => p.level === level && p.subtier === subtier).length,
      );
  assert.equal(deficit, 85);
  assert.equal(10 * 5 * 3 + 1, 151);
});
test('five subtiers have unambiguous codes and Brutal uses its own B marker, with complete labels in every authored locale', () => {
  assert.deepEqual(
    [-2, -1, 0, 1, 2].map((s) => threatCode(1, s)),
    ['1--', '1-', '1', '1+', '1++'],
  );
  assert.equal(threatCode(1, 1, 'brutal'), '1+ B');
  assert.equal(threatCode(10, 2, 'brutal'), '10++ B');
  assert.equal(threatCode(11, 0, 'brutal'), '>10 B');
  assert.equal(Object.keys(labels).length, 15);
  for (const words of Object.values(labels)) {
    assert.equal(words.length, 6);
    assert(words.every((word) => word.trim().length > 0));
    assert.equal(new Set(words.slice(0, 5)).size, 5);
  }
});
test('real opening encounters preserve the same boss grade across routes and difficulties while graded health, difficulty and party size remain separate', () => {
  for (const p of bossThreatProfiles.entries)
    for (const mode of ['short', 'standard', 'long', 'raid', 'endless'] as ModeId[])
      for (const difficulty of data.difficulties.map((d) => d.id)) {
        const game = new Game({
          mode,
          difficulty,
          openingBossId: p.bossId as BossId,
          maxPlayers: 1,
        });
        game.addPlayer('p', 'Threat fixture', 'soldier');
        assert(game.start());
        const save = game.offlineCheckpoint();
        assert.equal(game.boss.threat, p.level);
        assert.equal(game.boss.id, p.bossId);
        const boss = data.bosses.find((b) => b.id === p.bossId)!,
          setting = data.difficulties.find((d) => d.id === difficulty)!;
        const expected =
          1800 *
          1.22 ** (Math.min(10, p.level) - 1) *
          (1 + p.subtier * 0.08) *
          (boss.timer / 120) *
          boss.healthFactor *
          setting.health * (difficulty==='hellish'?data.rules.crazed.healthMultiplier:difficulty==='insane'?data.rules.brutal.healthMultiplier:1) *
          (mode === 'raid' && p.level <= 10 ? 1.25 : 1);
        assert(Math.abs(game.boss.maxHealth - expected) < 1e-7);
        assert.equal(save, null);
      }
});
test('the high-tier Constable classification produces its declared projectile pressure without changing its telegraph', () => {
  const game = new Game({ mode: 'endless', maxPlayers: 1 });
  game.addPlayer('solo', 'Threat fixture', 'soldier');
  game.start();
  game.players.get('solo')!.invulnerableUntil = 1e9;
  for (let n = 0; n < 60; n++) game.step();
  const warning = game.warnings.find((w) => w.kind === 'fan')!;
  assert(warning);
  assert.equal(warning.count, 8);
  assert(Math.abs(warning.speed - 163.2) < 1e-9);
  assert(Math.abs(warning.damage - 12.3) < 1e-9);
  assert.equal(warning.at - game.combatTick, 26);
});

test('actual campaign offers carry the concealed boss fixed grade and reward instead of a hidden card-position risk, including after a saved vote', () => {
  for (const mode of ['short', 'standard', 'long', 'raid'] as ModeId[])
    for (const seed of [1, 21, 773]) {
      let game = new Game({
        mode,
        maxPlayers: 1,
        seed,
        openingBossId: mode === 'raid' && seed === 773 ? 'city-eater' : undefined,
      });
      game.addPlayer('solo', 'Threat fixture', 'soldier');
      game.start();
      const route = data.modes.find((m) => m.id === mode)!.encounters!;
      const seen = new Set<BossId>();
      for (let fight = 0; fight < route; fight++) {
        assert(!seen.has(game.boss.id));
        seen.add(game.boss.id);
        assert.equal(game.boss.threat, bossThreat(game.boss.id).level);
        game.boss.health = 0;
        game.step();
        if (fight === route - 1) break;
        game.phaseEnds = game.tick;
        game.step();
        assert.equal(game.phase, 'contractVote');
        const before = game.offlineCheckpoint()!;
        const restored = Game.restoreOffline(before);
        assert.deepEqual(restored.contractCards, game.contractCards);
        const publicView = viewOf(game, 'solo');
        for (const [index, card] of game.contractCards.entries()) {
          const profile = bossThreat(card.bossId!);
          assert.equal(card.threat, profile.level);
          assert.equal(card.subtier, profile.subtier);
          assert.equal(card.risk, 0);
          assert.equal(card.bounty, threatBounty(card.bossId!, card.variant));
          assert(card.bounty <= 3);
          assert.equal(publicView.contractCards[index].bossId, undefined);
          assert.equal(publicView.contractCards[index].subtier, profile.subtier);
          assert.notEqual(card.bossId, 'uncounted');
        }
        game = restored;
        for (let phase = 0; game.phase !== 'combat' && phase < 5; phase++) {
          game.phaseEnds = game.tick;
          game.step();
        }
        assert.equal(game.phase, 'combat');
      }
    }
});
test('protocol-thirteen Practice migration reclassifies boundary contracts without losing player progress, money, run identity or extension history', () => {
  const game = new Game({
    mode: 'endless',
    openingBossId: 'lantern-warden',
    maxPlayers: 1,
    seed: 311,
  });
  game.addPlayer('solo', 'Old fixture', 'engineer');
  const save = game.offlineCheckpoint()!;
  const old = structuredClone(save);
  old.protocolVersion = 13;
  old.selectedContract.threat = 1;
  old.selectedContract.risk = 2;
  delete old.selectedContract.subtier;
  const original = JSON.stringify(old);
  const migrated = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(JSON.stringify(old), original);
  assert.equal(migrated.protocolVersion, PROTOCOL);
  assert.equal(PROTOCOL, 21);
  assert.equal(migrated.settings.runId, old.settings.runId);
  assert.deepEqual(migrated.player.progress, old.player.progress);
  assert.equal(migrated.player.coins, old.player.coins);
  assert.deepEqual(migrated.endlessHistory, old.endlessHistory);
  assert.equal(migrated.selectedContract.threat, 2);
  assert.equal(migrated.selectedContract.subtier, -2);
  assert.equal(migrated.selectedContract.risk, 0);
  assert.equal(migrated.selectedContract.bounty, threatBounty('lantern-warden'));
});
test('current boundaries reject forged fixed grades, hidden positional risk and nonfinite subtiers rather than changing a boss classification', () => {
  const game = new Game({ mode: 'endless', maxPlayers: 1 });
  game.addPlayer('solo', 'Threat fixture', 'soldier');
  const save = game.offlineCheckpoint()!;
  for (const change of [
    (s: typeof save) => {
      s.selectedContract.threat = 10;
    },
    (s: typeof save) => {
      s.selectedContract.subtier = -2;
    },
    (s: typeof save) => {
      s.selectedContract.subtier = NaN;
    },
    (s: typeof save) => {
      s.selectedContract.risk = 2;
    },
  ]) {
    const copy = structuredClone(save);
    change(copy);
    assert.throws(() => Game.restoreOffline(copy));
  }
  const canonical = classifiedContract('constable', 'brutal');
  assert.equal(canonical.risk, 0);
  assert.equal(canonical.threat, 1);
  assert.equal(canonical.subtier, 1);
  assert(canonical.bounty > classifiedContract('constable').bounty);
  assert(threatHealth('constable') > 1);
});
