import test from "node:test";
import assert from "node:assert/strict";
import { handlingGameFixture } from "./helpers/heavy-clutch-handling-game-fixture.ts";
import { heavyClutchHandlingOperation } from "./helpers/heavy-clutch-handling-flow.ts";
import { openId } from "../src/shared/heavy-traverse.ts";
import { viewOf } from "../src/shared/view.ts";
for (const mode of ["loose", "floating"] as const)
  test(
    "actual existing slow and paid recoil still require observed forward walking before the Open primary: " +
      mode,
    { timeout: 15000 },
    async () => {
      const f = handlingGameFixture(mode, openId);
      f.p.slowUntil = 1e9;
      const events: any[] = [];
      let paused = false;
      const timer = setInterval(() => {
        if (!paused) {
          f.g.step();
          events.push(...f.g.drainEvents());
        }
      }, 1000 / 30);
      try {
        const r = await heavyClutchHandlingOperation(
          {
            owner: f.p.id,
            view: () => viewOf(f.g, f.p.id),
            events,
            bursts: new Map(),
            input: (i) => {
              if (!paused) assert(f.g.submitInput(f.p.id, i));
            },
            purchase: async () => assert.fail(),
            start: async () => assert.fail(),
            pause: async (value) => {
              f.g.clearInputs();
              paused = value;
            },
          },
          mode,
          openId,
        );
        assert(r.actualLiftedManualWalkingProof.forwardProgress > 5);
        assert(r.actualLiftedManualWalkingProof.feedLifted);
        assert(
          r.actualLiftedManualWalkingProof.tick <
            r.actualLiftedManualWalkingProof.originalUntil,
        );
        assert.equal(
          r.actualCrounds + r.actualTradedSlots + r.actualPassedSlots,
          4,
        );
        assert.equal(r.originalUntil - r.originalBorn, 31);
        assert.equal(r.actualPrimaryRounds, 1);
      } finally {
        clearInterval(timer);
      }
    },
  );
