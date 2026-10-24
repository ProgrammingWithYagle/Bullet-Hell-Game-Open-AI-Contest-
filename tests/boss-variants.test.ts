import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';

function encounter(variant: 'normal' | 'brutal') {
  const initial = new Game({ seed: 45, mode: 'endless', maxPlayers: 1 });
  initial.addPlayer('solo', 'Mara', 'soldier');
  const save = initial.offlineCheckpoint()!;
  save.selectedContract.variant = variant;
  const game = Game.restoreOffline(save);
  game.start();
  game.players.get('solo')!.invulnerableUntil = 1e9;
  return game;
}

test('all sixty bosses retain their identity and gain four bounded Brutal phases', () => {
  for (const boss of data.bosses) {
    const brutal = boss.variants.brutal;
    assert.equal(brutal.identity, boss.id + '-brutal');
    assert.equal(brutal.signature, boss.signature.id);
    assert.equal(brutal.healthMultiplier, 2);
    assert.equal(brutal.damageMultiplier, 2);
    assert.deepEqual(
      brutal.phases.map((phase) => phase.healthThreshold),
      [1, 0.75, 0.5, 0.25],
    );
    for (const phase of brutal.phases)
      for (const attack of phase.attacks) {
        assert(attack.telegraph >= data.rules.brutal.minimumTelegraphSeconds);
        assert(attack.interval > attack.telegraph);
        assert(attack.count > 0 && attack.count <= 200);
      }
  }
});

test('Brutal combat doubles health and attack damage, extends the deadline while first Warden contracts remain Normal', () => {
  const normal = encounter('normal'),
    brutal = encounter('brutal');
  assert.equal(brutal.boss.maxHealth, normal.boss.maxHealth * 2);
  assert.equal(brutal.boss.deadline, normal.boss.deadline * 1.5);
  for (let tick = 0; tick < 61; tick++) {
    normal.step();
    brutal.step();
  }
  assert(normal.warnings.length > 0);
  assert.equal(brutal.warnings[0].damage, normal.warnings[0].damage * 2);
  normal.boss.health = 0;
  normal.step();
  while (normal.phase === 'mutationVote') normal.step();
  assert.equal(normal.phase, 'contractVote');
  assert.equal(normal.contractCards.length, 3);
  for (const [risk, card] of normal.contractCards.entries()) {
    assert.equal(card.bossId, 'lantern-warden');
    assert.equal(card.variant, 'normal');
    assert.equal(card.bounty, 1 + risk * 0.15);
  }
});

test('Constable transitions produce crossing volleys, gapped rings and a fourth Brutal phase', () => {
  for (const variant of ['normal', 'brutal'] as const) {
    const game = encounter(variant),
      seen = new Set<string>();
    game.boss.health = game.boss.maxHealth * 0.2;
    let sawCrossing = false;
    for (let tick = 0; tick < 1000; tick++) {
      game.step();
      for (const warning of game.warnings) seen.add(warning.kind);
      const fans = game.warnings.filter((warning) => warning.kind === 'fan');
      if (fans.some((a) => fans.some((b) => a.at === b.at && a.x !== b.x))) sawCrossing = true;
    }
    assert.equal(game.boss.phase, variant === 'brutal' ? 3 : 2);
    assert(sawCrossing, variant + ' did not telegraph crossing volleys');
    assert(seen.has('ring'), variant + ' did not telegraph a gapped ring');
    assert(seen.has('zone'), variant + ' did not telegraph arresting zones');
    assert.equal(game.phase, 'combat');
  }
});
