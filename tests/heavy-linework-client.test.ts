import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { lineworkIds } from '../src/shared/heavy-linework.ts';
import { heavyActions } from '../src/client/heavy-actions.ts';
import {
  drawLinework,
  lineworkProjectilePlan,
  lineworkRenderPlan,
} from '../src/client/heavy-linework-presentation.ts';
import {
  heavyLineworkDuration,
  heavyLineworkSample,
  lineworkSoundIds,
} from '../src/client/heavy-linework-sound.ts';
import {
  specializationMapLayout,
  specializationRoutes,
} from '../src/client/ui/specialization-map.ts';
import { lineworkMenu } from './helpers/heavy-linework-menu-flow.ts';
import { lineworkFixture } from './helpers/heavy-linework-fixture.ts';

test('source Lineworker graph exposes the entry, fitting fork and acquired reserve with real prerequisites', () => {
  const routes = specializationRoutes('heavy');
  assert.deepEqual(
    routes.map((route) => route.id),
    ['heavy-flak-1', 'heavy-traverse-1', lineworkIds.entry],
  );
  const map = specializationMapLayout('heavy', lineworkIds.entry)!;
  assert.deepEqual(
    map.nodes.filter((node) => !node.reference).map((node) => node.id),
    Object.values(lineworkIds),
  );
  assert.deepEqual(
    map.nodes.filter((node) => node.reference).map((node) => node.id),
    ['heavy-ordnance-1'],
  );
  assert.deepEqual(map.edges, [
    { from: 'heavy-ordnance-1', to: lineworkIds.entry },
    { from: lineworkIds.entry, to: lineworkIds.yoke },
    { from: lineworkIds.entry, to: lineworkIds.sheave },
    { from: lineworkIds.entry, to: lineworkIds.reserve },
    { from: lineworkIds.entry, to: lineworkIds.guide },
  ]);
  assert.deepEqual(map.exclusions, [{ a: lineworkIds.yoke, b: lineworkIds.sheave }, { a: lineworkIds.reserve, b: lineworkIds.guide }]);
});

for (const fitting of [lineworkIds.yoke, lineworkIds.sheave]) {
  test(
    'the actual menu buys the 3SP entry and shows only the legal ' +
      fitting +
      ' fitting under a controlled earned9SP view',
    async () => {
      const game = new Game({ mode: 'short', difficulty: 'baby' });
      const player = game.addPlayer('solo', 'Controlled menu Hux', 'heavy');
      const menu = await lineworkMenu(() => viewOf(game, player.id).players[0]);
      let serial = 0;
      const buy = (item: string) => async () => {
        assert(
          game.transact(player.id, { kind: 'skill', id: 'controlled-menu-' + ++serial, item }).ok,
        );
      };
      try {
        await menu.inspect(lineworkIds.entry, false);
        await menu.inspect('heavy-ordnance-1', true, buy('heavy-ordnance-1'));
        await menu.inspect(lineworkIds.entry, true, buy(lineworkIds.entry));
        await menu.inspect(fitting, false);
        player.totalSp = 9;
        await menu.inspect(fitting, true, buy(fitting));
        await menu.inspect(
          fitting === lineworkIds.yoke ? lineworkIds.sheave : lineworkIds.yoke,
          false,
        );
        await menu.inspect(fitting, false);
        assert.equal(serial, 3);
        assert.deepEqual(
          menu.observations.filter((o) => o.requests).map((o) => o.earned),
          [3, 3, 9],
        );
        assert.equal(viewOf(game, player.id).players[0].sp, 4);
      } finally {
        await menu.close();
      }
    },
  );
}

test('actual authority selects waiting, engage, brake and release labels and remaps both inputs', async () => {
  const fixture = lineworkFixture('yoke');
  const current = () =>
    viewOf(fixture.g, fixture.p.id).players.find((player) => player.id === fixture.p.id)!;
  const menu = await lineworkMenu(current);
  const label = (slot: 'technique1' | 'technique2') =>
    menu.guide.heavyHudLabel(current(), slot, fixture.g.combatTick);
  const actions = () => heavyActions(current(), fixture.g.combatTick).extras;
  try {
    assert.equal(label('technique2'), 'Needs an anchor');
    fixture.step({ technique1: true });
    assert.equal(label('technique1'), 'Release anchor');
    assert.equal(label('technique2'), 'Waiting for attachment');
    assert(actions()[1].blocked);
    while (!fixture.status().lineworkUntil && fixture.g.combatTick < 20) fixture.step();
    assert.equal(label('technique2'), 'Engage haul');
    fixture.step({ technique2: true });
    assert.equal(label('technique2'), 'Brake motor');
    assert(!actions()[1].blocked);
    fixture.step({ technique1: true });
    assert.equal(label('technique1'), 'Anchor Cartridge');
    assert(actions()[0].at > fixture.g.combatTick);
  } finally {
    await menu.close();
  }
});

test('line rendering follows an acknowledged anchor and the drawn owner body, then stops on expiry, scope or lost ownership', () => {
  const fixture = lineworkFixture('sheave');
  fixture.attach();
  fixture.step({ technique2: true });
  const view = viewOf(fixture.g, fixture.p.id),
    owner = view.players.find((p) => p.id === fixture.p.id)!;
  const before = structuredClone(owner),
    body = { x: owner.x + 1, y: owner.y };
  const plan = lineworkRenderPlan(owner, view, owner.id, body)!;
  assert(plan.active);
  assert.deepEqual(plan.from, body);
  assert.deepEqual(plan.anchor, fixture.status().lineworkAnchor);
  const calls: unknown[][] = [];
  const graphics = {
    lineStyle(...args: unknown[]) {
      calls.push(args);
      return this;
    },
    lineBetween(...args: unknown[]) {
      calls.push(args);
      return this;
    },
    strokeCircle(...args: unknown[]) {
      calls.push(args);
      return this;
    },
  };
  drawLinework(graphics, plan);
  assert.deepEqual(calls[1], [body.x, body.y, plan.anchor.x, plan.anchor.y]);
  assert.equal(lineworkRenderPlan(owner, view, 'observer'), undefined);
  assert.equal(
    lineworkRenderPlan(owner, { ...view, encounter: view.encounter + 1 }, owner.id),
    undefined,
  );
  assert.equal(lineworkRenderPlan(owner, { ...view, phase: 'defeat' }, owner.id), undefined);
  assert.equal(
    lineworkRenderPlan(owner, view, owner.id, body, fixture.status().lineworkUntil),
    undefined,
  );
  assert.deepEqual(owner, before);
  assert.equal(
    viewOf(fixture.g, 'observer').players.find((p) => p.id === owner.id)!.kit.lineworkConnection,
    undefined,
  );
  const anchor = fixture.shots.find((shot) => shot.visual === 'heavy-anchor');
  assert(anchor);
  assert.equal(lineworkProjectilePlan(anchor)?.texture, 'projectile-anchor');
  assert.equal(lineworkProjectilePlan({ ...anchor, visual: undefined }), undefined);
});

test('each Lineworker cue is bounded and each catalog has the authored action labels', () => {
  const vectors = new Set<string>();
  for (const sound of lineworkSoundIds) {
    const duration = heavyLineworkDuration(sound);
    assert(duration > 0 && duration < 0.2);
    assert.equal(heavyLineworkSample(sound, 0), 0);
    assert.equal(heavyLineworkSample(sound, duration), 0);
    const samples = Array.from({ length: 64 }, (_, index) =>
      heavyLineworkSample(sound, (duration * (index + 1)) / 65),
    );
    assert(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) < 1));
    assert(samples.some((sample) => Math.abs(sample) > 0.01));
    vectors.add(samples.join(','));
  }
  assert.equal(vectors.size, lineworkSoundIds.length);
  for (const { id } of data.locales) {
    const { messages } = JSON.parse(
      readFileSync(new URL(`../locales/${id}.json`, import.meta.url), 'utf8'),
    );
    for (const key of [
      'pathway.heavy-linework-1.name',
      'ui.heavy.lineworkAction',
      'ui.heavy.lineworkDrive',
      'ui.heavy.lineworkEngage',
      'ui.heavy.lineworkBrake',
    ])
      assert(messages[key]?.trim(), id + ': ' + key);
  }
});
