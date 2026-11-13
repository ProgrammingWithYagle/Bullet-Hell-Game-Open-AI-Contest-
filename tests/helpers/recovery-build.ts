// Synthetic clears and shortened intermissions exercise persistence, not combat balance.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Game, data } from '../../src/shared/game.ts';
import { finishBossDefeat } from './boss-defeat.ts';
import { implementedClassIds, type Command } from '../../src/shared/protocol.ts';

export function recoveryBuild(size = 50) {
  const game = new Game({ mode: 'endless', maxPlayers: size, seed: 18291 });
  let serial = 0;
  const successful = new Map<string, Command>();
  const replies = new Map<string, Command>();
  for (let n = 0; n < size; n++) {
    const p = game.addPlayer(
      'participant-' + n,
      'Fixture ' + n + ' 山',
      implementedClassIds[n % 7],
    );
    const command = { id: 'starter-medkit-' + n, kind: 'supply' as const, item: 'medkit' };
    assert(game.transact(p.id, command).ok);
    successful.set(p.id, command);
  }
  const build = () => {
    for (const [n, p] of [...game.players.values()].entries()) {
      const buy = (kind: Command['kind'], item: string) =>
        game.transact(p.id, { id: 'build-' + ++serial, kind, item }).ok;
      const cl = data.classes.find((c) => c.id === p.classId)!;
      const paths = cl.branches.flatMap((b) => b.subbranches);
      const path = paths[n % paths.length].id;
      for (const skill of data.skills
        .filter((s) => s.classId === p.classId && s.subbranchId === path)
        .sort((a, b) => a.depth - b.depth))
        if (!p.skills.includes(skill.id) && !buy('skill', skill.id)) break;
      const tier = data.weapons.find((w) => w.id === p.weapon)!.tier;
      for (const weapon of data.weapons
        .filter((w) => w.classId === p.classId && w.tier > tier)
        .sort((a, b) => b.tier - a.tier))
        if (buy('weapon', weapon.id)) break;
      const upgrade = data.upgrades[n % data.upgrades.length];
      if ((p.upgrades[upgrade.id] ?? 0) < upgrade.maximum) buy('upgrade', upgrade.id);
    }
  };
  build();
  assert(game.start());
  for (let fight = 0; fight < 10; fight++) {
    assert.equal(game.phase, 'combat');
    game.boss.health = 0;
    game.step();
    finishBossDefeat(game);
    if (fight === 9) break;
    let phases = 0;
    while (game.phase !== 'combat') {
      assert(++phases <= 4);
      if (game.phase === 'mutationVote' || game.phase === 'contractVote')
        for (const p of game.players.values()) assert(game.vote(p.id, 0));
      if (game.phase === 'shop') build();
      game.phaseEnds = game.tick;
      game.step();
    }
  }
  while (game.phase !== 'shop') {
    if (game.phase === 'mutationVote' || game.phase === 'contractVote')
      for (const p of game.players.values()) assert(game.vote(p.id, 0));
    game.phaseEnds = game.tick;
    game.step();
  }
  build();
  for (const p of game.players.values()) {
    assert.equal(p.totalSp, 27);
    assert.equal(p.progress.clears, 10);
    for (let n = 0; n < 16; n++) {
      const command = { id: randomUUID(), kind: 'weapon' as const, item: 'unavailable-weapon' };
      assert.deepEqual(game.transact(p.id, command), { ok: false, reason: 'incompatibleItem' });
      replies.set(p.id, command);
    }
  }
  const checkpoint = game.authoritativeCheckpoint()!;
  assert(
    checkpoint.transactions.every((t) => t.history.some(([id]) => id === successful.get(t.id)!.id)),
  );
  assert(Buffer.byteLength(JSON.stringify(checkpoint)) > 65536);
  return { game, successful, replies };
}
