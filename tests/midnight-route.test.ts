import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { finishBossDefeat } from './helpers/boss-defeat.ts';
import { serviceBossIds } from '../src/shared/service-director.ts';
import { HZ, idleInput, PROTOCOL, type Shot } from '../src/shared/protocol.ts';
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function finishIntermission(g: Game) {
  for (let guard = 0; guard < 5 && g.phase !== 'combat' && g.phase !== 'victory'; guard++) {
    g.phaseEnds = g.tick;
    g.step();
  }
  assert(['combat', 'victory'].includes(g.phase));
}
test('Midnight Circuit completes ten distinct fixed-grade fights with a reserved finale and normalized base budgets', () => {
  for (const seed of [2, 19, 831]) {
    let g = new Game({ mode: 'standard', maxPlayers: 1, seed });
    g.addPlayer('p', 'Sable', 'mage');
    g.start();
    const seen = new Set<string>(),
      maps = new Set<string>();
    for (let encounter = 0; encounter < 10; encounter++) {
      assert.equal(g.phase, 'combat');
      assert.equal(g.encounter, encounter);
      assert(!seen.has(g.boss.id));
      seen.add(g.boss.id);
      maps.add(g.arena.id);
      const pool = data.bosses
        .filter(
          (b) =>
            ['short', 'standard', 'long', 'raid'].includes(b.route) &&
            b.finale === (encounter === 9),
        )
        .map((b) => b.id);
      assert(pool.includes(g.boss.id));
      const p = [...g.players.values()][0];
      assert.equal(p.totalSp, 3 + Math.floor((24 * encounter) / 9));
      assert.equal(
        p.incomeGranted,
        Math.floor((120 + (2280 * encounter) / 9) * g.difficulty.coins),
      );
      g.boss.health = 0;
      g.step();
      if (encounter === 9) {
        if((g.phase as string)==='secretOffer')for(const survivor of g.players.values())g.vote(survivor.id,0);
        assert.equal(g.phase, 'victory');
        assert.equal(g.encounter, 10);
        assert.equal(g.completedBossIds.size, 10);
        break;
      }
      assert.equal(g.phase, 'mutationVote');
      const save = g.offlineCheckpoint()!;
      g = Game.restoreOffline(save);
      finishBossDefeat(g);
      g.phaseEnds = g.tick;
      g.step();
      assert.equal(g.phase, 'contractVote');
      assert.equal(new Set(g.contractCards.map((c) => c.bossId)).size, 3);
      assert(g.contractCards.every((c) => !seen.has(c.bossId!)));
      assert(
        g.contractCards.every((c) =>
          data.bosses.some(
            (b) =>
              b.id === c.bossId &&
              ['short', 'standard', 'long', 'raid'].includes(b.route) &&
              b.finale === (encounter === 8),
          ),
        ),
      );
      finishIntermission(g);
    }
    assert(maps.size >= 5);
  }
});
test('every Midnight identity executes all Normal/Brutal phases on actual maps and clears signatures at victory', () => {
  for (const id of serviceBossIds)
    for (const brutal of [false, true]) {
      const lobby = new Game({
        mode: 'endless',
        maxPlayers: 1,
        openingBossId: id,
        openingArenaId: 'sunken-chapel',
      });
      lobby.addPlayer('p', 'Mara', 'soldier');
      const save = lobby.offlineCheckpoint()!;
      save.selectedContract.variant = brutal ? 'brutal' : 'normal';
      const g = Game.restoreOffline(save);
      g.start();
      [...g.players.values()][0].invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      const definition=data.bosses.find(b=>b.id===id)!;
      const schedule=brutal?definition.variants.brutal.phases:definition.phases;
      const phases = schedule.length;
      for (let phase = 0; phase < phases; phase++) {
        if (phase) {
          g.boss.health =
            g.boss.maxHealth * (schedule[phase].healthThreshold-.01);
          g.step();
          assert.equal(g.boss.phase, phase);
          assert.equal(g.accord,null);
          g.step();
        }
        let observed = false;
        for (let tick = 0; tick < 150; tick++) {
          g.step();
          observed ||= g.director.cues().some((c) => (c.kind.startsWith('service-')||c.kind.startsWith('mold-') || c.kind.startsWith('bell-')));
        }
        assert(observed, id + ' did not execute its signature in phase ' + phase);
      }
      assert.equal(
        [...g.shots.values()].filter((s) => s.owner === 'hostile').length <=
          data.rules.maximumHostileProjectiles,
        true,
      );
      g.boss.health = 0;
      g.step();
      assert.equal(g.director.cues().length, 0);
      assert.equal(g.minions.actors.size, 0);
    }
});
test('Choir projectiles damage a separate caster and transfer exactly once to team boss damage credit', () => {
  const g = new Game({ openingBossId: 'choir', maxPlayers: 1 }),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.start();
  assert.equal(
    g.director.weakPoints().filter((c) => c.kind === 'service-prop' && c.role === 'caster').length,
    3,
    'All three visible/targetable singers must exist at deployment',
  );
  p.invulnerableUntil = 1e9;
  advance(g, 61);
  g.boss.staggerUntil = 1e9;
  const caster = g.director
    .weakPoints()
    .find((c) => c.kind === 'service-prop' && c.role === 'caster' && c.index === 0)!;
  assert(caster);
  const before = g.boss.health,
    credited = p.damageDealt,
    partHealth = caster.health;
  const shot: Shot = {
    id: 900000,
    owner: p.id,
    x: caster.x,
    y: caster.y + 100,
    vx: 0,
    vy: -6000,
    radius: 3,
    damage: 25,
    expires: g.combatTick + 30,
    pierce: 0,
  };
  g.shots.set(shot.id, shot);
  g.step();
  assert.equal(before - g.boss.health, 25);
  assert.equal(p.damageDealt - credited, 25);
  assert.equal(g.director.weakPoints().find((c) => c.id === caster.id)!.health, partHealth - 25);
});
test('Matron packs remain capped in a real long-lived encounter and are removed at the boundary', () => {
  const g = new Game({ openingBossId: 'matron', maxPlayers: 1 }),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  let peak = 0;
  for (let tick = 0; tick < 80 * HZ; tick++) {
    g.step();
    peak = Math.max(peak, g.minions.actors.size);
    assert(g.minions.actors.size <= 18);
  }
  assert(peak >= 6);
  assert(
    g.director.weakPoints().filter((c) => c.kind === 'service-prop' && c.role === 'nest').length <=
      3,
  );
  g.boss.health = 0;
  g.step();
  assert.equal(g.minions.actors.size, 0);
});
test('bounded local protocol-8 saves preserve seven-class builds but cannot claim new routes or boss identities', () => {
  const g = new Game({ maxPlayers: 1 });
  g.addPlayer('p', 'Vale', 'assassin');
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 8;
  const restored = Game.restoreOffline(old);
  assert.equal(restored.players.get('solo')!.classId, 'assassin');
  assert.equal(restored.offlineCheckpoint()!.protocolVersion, PROTOCOL);
  for (const mutate of [
    (s: typeof old) => {
      s.settings.mode = 'standard';
    },
    (s: typeof old) => {
      s.settings.openingBossId = 'matron';
    },
    (s: typeof old) => {
      s.completedBossIds = ['matron'];
    },
  ]) {
    const invalid = structuredClone(old);
    mutate(invalid);
    assert.throws(() => Game.restoreOffline(invalid));
  }
});
