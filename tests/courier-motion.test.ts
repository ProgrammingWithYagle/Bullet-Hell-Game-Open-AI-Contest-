import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Game } from '../src/shared/game.ts';
import { HZ } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { courierArt, courierCombatFrame } from '../src/client/courier-presentation.ts';
import { encounterFrame, encounterArt } from '../src/client/encounter-presentation.ts';
import {
  bossTextureReferences,
  bossTexturePose,
  bossTexturePresentation,
  retireBossTexture,
} from '../src/client/boss-textures.ts';
import provenance from '../docs/courier-actions-2026-10-25.json';
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(variant: 'normal' | 'brutal' = 'normal',difficulty='normal') {
  const lobby = new Game({difficulty, openingBossId: 'courier', mode: 'endless', maxPlayers: 1, seed: 981 });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  save.selectedContract.variant = variant;
  const game = Game.restoreOffline(save);
  assert(game.start());
  game.players.get('solo')!.invulnerableUntil = 1e9;
  game.boss.deadline = 1e9;
  return game;
}
const frame = (game: Game, reduced = false) =>
  courierCombatFrame(game.boss, game.tick, game.combatTick, game.director.cues(), reduced)!;

test('Courier motion binds three complete native strips and the retained sixteen-pose source prefix', () => {
  assert.equal(provenance.requests.length, 3);
  assert.equal(courierArt.frames, 28);
  assert.equal(courierArt.preservedFrames, 16);
  assert.equal(sha(courierArt.atlas), courierArt.atlasSha256);
  assert.equal(sha(courierArt.baseAtlas), courierArt.baseAtlasSha256);
  const png = readFileSync(courierArt.atlas);
  assert.equal(png.readUInt32BE(16), 1536);
  assert.equal(png.readUInt32BE(20), 2688);
  for (const request of provenance.requests) {
    assert.equal(sha(request.file), request.sha256);
    assert.equal(sha(request.request), request.requestSha256);
    for (const input of request.inputBindings) assert.equal(sha(input.projectPath), input.sha256);
  }
  assert.deepEqual(
    courierArt.motionSources.map((x) => x.motion),
    ['idle', 'hurt', 'stagger'],
  );
  assert.equal(encounterArt.find((x) => x.bossId === 'courier')!.atlas, courierArt.atlas);
});

test('normal and Brutal Courier charges keep their exact authoritative action poses ahead of hit reactions and drawing lead', () => {
  for (const variant of ['normal', 'brutal'] as const) {
    const game = fixture(variant);
    let attempts = 0;
    while (!game.director.cues().some((c) => c.kind === 'charge')) {
      game.step();
      assert(++attempts < 1200);
    }
    const lane = game.director.cues().find((c) => c.kind === 'charge')!;
    assert(lane.kind === 'charge');
    const original = { x: game.boss.x, y: game.boss.y };
    while (game.combatTick <= lane.at + 7) {
      const view = viewOf(game, 'solo');
      view.boss.hurtAt = view.combatTick;
      const before = JSON.stringify(view);
      const pose = courierCombatFrame(view.boss, view.tick, view.combatTick, view.bossCues, false, {
        tick: view.tick + 1.5,
        combatTick: view.combatTick + 1.5,
      });
      assert.equal(pose, encounterFrame(view.boss, view.combatTick, view.bossCues));
      assert.equal(JSON.stringify(view), before);
      if (game.combatTick < lane.at) {
        assert(pose === 1 || pose === 2);
        assert.deepEqual({ x: game.boss.x, y: game.boss.y }, original);
      } else assert(pose !== null && pose >= 3 && pose <= 5);
      game.step();
    }
    assert(Math.hypot(game.boss.x - original.x, game.boss.y - original.y) > 0);
  }
});

test('Courier idle shows all four breathing poses and a real friendly hit starts and completes all four recoil poses', () => {
  const game = fixture();
  const idle = new Set<number>();
  for (let tick = 0; tick < 30; tick++)
    idle.add(courierCombatFrame({ ...game.boss, hurtAt: -1 }, tick, tick, [])!);
  assert.deepEqual([...idle], [16, 17, 18, 19]);
  game.shots.set(999001, {
    id: 999001,
    owner: 'solo',
    x: game.boss.x,
    y: game.boss.y,
    vx: 0,
    vy: 0,
    radius: 3,
    damage: 1,
    expires: game.combatTick + 60,
    pierce: 0,
  });
  const health = game.boss.health;
  game.step();
  assert(game.boss.health < health);
  assert.equal(game.boss.hurtAt, game.combatTick);
  const hurt = new Set<number>();
  for (let n = 0; n < 10; n++) {
    hurt.add(frame(game));
    game.step();
  }
  assert.deepEqual([...hurt], [20, 21, 22, 23]);
  assert(frame(game) >= 16 && frame(game) <= 19);
  assert.equal(courierCombatFrame(game.boss, game.tick, game.combatTick, [], true), 16);
  assert.equal(
    courierCombatFrame(game.boss, game.tick, game.combatTick, [], false, {
      tick: NaN,
      combatTick: Infinity,
    }),
    frame(game),
  );
});

test('a real successful Accord plays the upright entry once then loops three weak Courier poses for the full authoritative stagger', () => {
  const game = fixture('normal','easy');
  game.boss.health = game.boss.maxHealth * 0.49;
  const player = game.players.get('solo')!;
  player.x = 560;
  player.y = 550;
  while (!game.accords) {
    game.step();
    assert(game.combatTick < 100);
  }
  assert.equal(game.director.cues().length, 0);
  const end = game.boss.staggerUntil;
  assert.equal(end - game.combatTick, 4 * HZ);
  const seen = new Set<number>();
  let entryTicks = 0;
  while (game.combatTick < end) {
    const pose = frame(game);
    assert(pose >= 24 && pose <= 27);
    seen.add(pose);
    if (pose === 24) entryTicks++;
    assert.equal(frame(game, true), 25);
    const lead = courierCombatFrame(game.boss, game.tick, game.combatTick, [], false, {
      tick: game.tick + 1.5,
      combatTick: game.combatTick + 1.5,
    })!;
    assert(lead >= 24 && lead <= 27);
    game.step();
  }
  assert.deepEqual([...seen], [24, 25, 26, 27]);
  assert.equal(entryTicks, 5);
  assert(frame(game) < 24);
});

test('Courier death overrides recoil, charge and Accord and completes on world time with rewards banked only once', () => {
  for (const variant of ['normal', 'brutal'] as const) {
    const game = fixture(variant);
    game.boss.staggerUntil = game.combatTick + 120;
    game.boss.health = 0;
    game.step();
    const banked = game.players.get('solo')!.coins,
      combat = game.combatTick;
    const seen = new Set<number>();
    for (let n = 0; n < 50; n++) {
      seen.add(frame(game));
      game.step();
    }
    assert.deepEqual([...seen], [8, 9, 10, 11, 12, 13, 14, 15]);
    assert.equal(frame(game), 15);
    assert.equal(frame(game, true), 15);
    assert.equal(game.combatTick, combat);
    assert.equal(game.players.get('solo')!.coins, banked);
  }
});

test('all cropped identities retain world anchors through loading and eviction, and live Courier poses never select a corpse fallback', () => {
  for (const reference of [
    ...bossTextureReferences.entries,
    ...bossTextureReferences.settledReferences,
  ]) {
    const clip = encounterArt.find((c) => c.bossId === reference.bossId)!;
    const pose = bossTexturePresentation(reference.bossId, reference.sourceFrame, false, clip);
    const png = readFileSync(reference.reference);
    assert.equal(sha(reference.reference), reference.referenceSha256);
    assert.equal(png.readUInt32BE(16), reference.referenceWidth);
    assert.equal(png.readUInt32BE(20), reference.referenceHeight);
    for (const [axis, length, display] of [
      [0, reference.referenceWidth, pose.displayWidth],
      [1, reference.referenceHeight, pose.displayHeight],
    ])
      for (const pixel of [0, length / 2, length - 1]) {
        const old =
          ((pixel + reference.sourceRect[axis] - clip.origin[axis] * clip.cellSize) *
            clip.displayCell) /
          clip.cellSize;
        const current = ((pixel - pose.origin[axis] * length) * display) / length;
        assert(Math.abs(old - current) < 1e-9);
      }
    const calls: string[] = [];
    const holder = {
      texture: { key: reference.bossId + '-action' },
      frame: { name: String(reference.sourceFrame) },
      anims: {
        stop() {
          calls.push('stop');
        },
      },
      setTexture(key: string) {
        this.texture.key = key;
        calls.push('texture');
      },
      setOrigin(x: number, y: number) {
        assert.deepEqual([x, y], reference.origin);
        calls.push('origin');
      },
      setDisplaySize(width: number, height: number) {
        assert.equal(width, reference.displayWidth);
        assert.equal(height, reference.displayHeight);
        calls.push('size');
      },
    };
    retireBossTexture(reference.bossId, holder, {
      exists: () => true,
      remove() {
        assert.deepEqual(calls, ['stop', 'texture', 'origin', 'size']);
        calls.push('remove');
      },
    });
    assert.equal(calls.at(-1), 'remove');
  }
  for (let frame = 16; frame < 28; frame++)
    assert.deepEqual(bossTexturePose('courier', frame, false), {
      key: 'courier-reference',
      frame: 0,
    });
  const full = bossTexturePresentation('courier', 26, true, courierArt);
  assert.equal(full.displayWidth, courierArt.displayCell);
  assert.deepEqual(full.origin, courierArt.origin);
  assert(bossTextureReferences.summary.referenceReductionPercent > 60);
  assert(bossTextureReferences.summary.maximumCachedDecodedBytes < 100 * 1048576);
});
