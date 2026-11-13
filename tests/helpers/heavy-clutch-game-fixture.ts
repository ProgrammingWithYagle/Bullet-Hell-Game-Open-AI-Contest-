import assert from "node:assert/strict";
import { Game } from "../../src/shared/game.ts";
import {
  traverseIds as ids,
  clutchId,
} from "../../src/shared/heavy-traverse.ts";
import { idleInput } from "../../src/shared/protocol.ts";
// Controlled Raid12 purchases/boss/body/cover; earned Short progression is verified separately.
export function clutchGameFixture(
  mode: "loose" | "spade" | "floating" = "loose",
) {
  const g: any = new Game({
      mode: "raid",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("owner", "Hux", "heavy"),
    ally = g.addPlayer("ally", "Mara", "soldier");
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    ...(mode === "loose" ? [] : [ids[mode]]),
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.transact(p.id, { id: clutchId, kind: "skill", item: clutchId }).ok);
  assert(g.start());
  g.boss.id = "constable";
  g.director.reset("constable");
  Object.assign(g.boss, {
    x: 1200,
    y: 200,
    health: 1e6,
    maxHealth: 1e6,
    staggerUntil: 1e9,
    deadline: 1e9,
  });
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = g.arena.lavaPits.length = 0;
  Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600 });
  Object.assign(ally, { x: 1400, y: 900, oldX: 1400, oldY: 900 });
  g.drainEvents();
  let sequence = 0;
  const emitted: any[] = [],
    events: any[] = [];
  const step = (input: any = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        sequence: ++sequence,
        aim: 0,
        ...input,
      }),
    );
    g.step();
    for (const e of g.drainEvents()) {
      events.push(e);
      if (e.type === "shots")
        emitted.push(
          ...e.shots
            .filter((s: any) => s.owner === p.id)
            .map((s: any) => ({ ...s })),
        );
    }
  };
  return {
    g,
    p,
    ally,
    step,
    emitted,
    events,
    status: () => g.traverse.status(p, g.combatTick),
    flights: () =>
      [...g.shots.values()].filter((s: any) => g.traverse.has(s.id)),
  };
}
