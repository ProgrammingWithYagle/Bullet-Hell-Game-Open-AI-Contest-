import assert from "node:assert/strict";
import { Game } from "../../src/shared/game.ts";
import {
  traverseIds as ids,
  clutchId,
} from "../../src/shared/heavy-traverse.ts";
import { viewOf } from "../../src/shared/view.ts";
import { idleInput, type InputFrame } from "../../src/shared/protocol.ts";
export function clutchPresentationFixture(
  mode: "loose" | "spade" | "floating" = "loose",
) {
  const g = new Game({
      mode: "raid",
      seed: 41,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Hux", "heavy");
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    clutchId,
    ...(mode === "loose" ? [] : [ids[mode]]),
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.start());
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.health = g.boss.maxHealth = 1e6;
  p.x = p.oldX = 600;
  p.y = p.oldY = 780;
  g.drainEvents();
  let sequence = 0;
  const frame = (input: Partial<InputFrame> = {}) => ({
      ...idleInput(),
      sequence: ++sequence,
      aim: 0,
      ...input,
    }),
    step = (input: Partial<InputFrame> = {}) => {
      const i = frame(input);
      assert(g.submitInput(p.id, i));
      g.step();
      return i;
    };
  return { g, p, frame, step, view: () => viewOf(g, p.id) };
}
