import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  traverseIds,
  clutchId,
  lanyardId,
} from "../src/shared/heavy-traverse.ts";
import { menuAcquirer } from "./helpers/heavy-post-menu-flow.ts";
import { earnedPostWorkerFlow } from "./helpers/heavy-post-worker-flow.ts";

test("actual menuAcquirer admits controlled21SP, submits one authoritative capstone purchase, and rejects a duplicate", async () => {
  const game = new Game({ mode: "short", difficulty: "baby" });
  const player = game.addPlayer("solo", "Hux", "heavy");
  const menu = await menuAcquirer({
    id: player.id,
    get view() {
      return viewOf(game, player.id);
    },
  });
  let requests = 0;
  const buy = async (item: string) =>
    menu.acquire(item, true, async () => {
      const result = game.transact(player.id, {
        id: "menu21-regression-" + ++requests,
        kind: "skill",
        item,
      });
      assert(result.ok, JSON.stringify(result));
    });
  try {
    await buy("heavy-ordnance-1");
    await buy(traverseIds.entry);
    // Controlled shop budgets test this exact wrapper. The next case earns all
    // three real clears without budget, health, position or checkpoint injection.
    player.totalSp = 15;
    await buy(clutchId);
    await menu.acquire(lanyardId, false, async () =>
      assert.fail("gate inspection cannot buy"),
    );
    player.totalSp = 21;
    const before = viewOf(game, player.id).players[0].sp;
    await buy(lanyardId);
    assert.equal(requests, 4);
    assert.equal(viewOf(game, player.id).players[0].sp, before - 4);
    await menu.acquire(lanyardId, false, async () =>
      assert.fail("duplicate cannot buy"),
    );
    assert.equal(requests, 4);
    assert.deepEqual(
      menu.observations.map((o) => o.actualEarnedSP),
      [3, 3, 15, 15, 21, 21],
    );
    const purchase = menu.observations.find(
      (o) => o.item === lanyardId && o.commit,
    );
    assert(purchase?.sourceMenuDOM);
    assert.equal(purchase.actualEarnedSP, 21);
    assert.equal(purchase.purchaseRequests, 1);
    assert.equal(purchase.skillsBefore.includes(lanyardId), false);
    assert.equal(purchase.skillsAfter.includes(lanyardId), true);
  } finally {
    await menu.close();
  }
});

test(
  "whole unmodified optimized Short worker earns3→9→15→21 through three clears and buys/posts via the actual menuAcquirer",
  { timeout: 300000 },
  async () => {
    const code = (
      await build({
        entryPoints: ["src/client/offline.worker.ts"],
        bundle: true,
        minify: true,
        write: false,
        platform: "browser",
        format: "esm",
        define: {
          __GA_TESTING_BUILD__: "true",
          "import.meta.env.DEV": "false",
        },
        logLevel: "silent",
      })
    ).outputFiles[0].text;
    const result = await earnedPostWorkerFlow(
      code,
      "loose",
      undefined,
      "short",
    );
    assert(result.passed && result.wholeOptimizedWorkerExecuted);
    assert.equal(result.workerPatched, false);
    assert(result.sourceBoundMenuDOMAtActual3And9And15And21);
    assert.deepEqual(result.actualEarnedSequence, [3, 9, 15, 21]);
    assert.deepEqual(
      result.clears.map((c) => c.actualEarnedSP),
      [9, 15, 21],
    );
    assert.equal(result.actualBossClears, 3);
    assert.equal(result.actualPostPurchaseAt, 21);
    assert.equal(result.sourceMenuPurchases, 4);
    assert.equal(result.spentSkillSP, 10);
    assert.equal(result.remainingSP, 11);
    assert(result.noCheckpointOrBudgetHealthPositionHazardInjection);
    const purchase = result.menuObservations.filter(
      (o: any) => o.item === lanyardId && o.commit,
    );
    assert.equal(purchase.length, 1);
    assert.equal(purchase[0].actualEarnedSP, 21);
    assert.equal(purchase[0].purchaseRequests, 1);
    assert(result.actualThirdSeparatePost);
    assert(result.actualPostedWalking.forwardProgress > 5);
    assert.equal(result.originalUntil - result.originalBorn, 31);
    assert.equal(result.actualCrounds + result.actualForfeitedSlots, 4);
    assert.equal(result.actualPrimaryTrades, 0);
    assert(result.originalOpportunitiesConserved && result.oneOriginalRecovery);
    assert(result.pausedBeforeAndDuringPost && result.pausedRequestsDiscarded);
  },
);
