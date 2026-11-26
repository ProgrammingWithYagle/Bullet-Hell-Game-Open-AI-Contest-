import assert from "node:assert/strict";
import { Game } from "../../src/shared/game.ts";
import {
  traverseIds as ids,
  clutchId,
  heavyTraverseRules as r,
} from "../../src/shared/heavy-traverse.ts";
import { idleInput } from "../../src/shared/protocol.ts";
// Controlled late Endless27SP, actual authority/purchases/pool/geometry/damage. No ordinary earned acquisition claim.
export function handlingGameFixture(
  mode: "loose" | "spade" | "floating",
  handling?: string,
) {
  const g: any = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9; // Controlled late Endless budget; actual Short acquisition is a separate transport proof.
  const p = g.addPlayer("owner", "Hux", "heavy"),
    ally = g.addPlayer("ally", "Mara", "soldier");
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    ...(mode === "loose" ? [] : [ids[mode]]),
    clutchId,
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert.equal(p.totalSp, 27);
  if (handling)
    assert(
      g.transact(p.id, { id: handling, kind: "skill", item: handling }).ok,
    );
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
  const events: any[] = [],
    shots: any[] = [],
    conversions: any[] = [];
  const actualRound = g.traverse.primaryRound.bind(g.traverse);
  g.traverse.primaryRound = (owner: any, c: any) => {
    const before = g.traverse.status(owner, c.tick),
      accepted = actualRound(owner, c);
    if (accepted)
      conversions.push({
        tick: c.tick,
        ammo: owner.ammo,
        beforeNext: before.heavyTraverseNextAt,
        afterNext: g.traverse.status(owner, c.tick).heavyTraverseNextAt,
      });
    return accepted;
  };
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
    const batch = g.drainEvents();
    events.push(...batch);
    for (const e of batch)
      if (e.type === "shots")
        shots.push(
          ...e.shots
            .filter((s: any) => s.owner === p.id)
            .map((s: any) => ({
              ...s,
              at: g.combatTick,
              admittedAt: g.combatTick,
            })),
        );
    return batch;
  };
  const target = (x: number, y: number) =>
    g.spawnMinion({
      kind: "ordinary",
      x,
      y,
      health: 1000,
      speed: 0,
      radius: 16,
      damage: 0,
    })!;
  return {
    g,
    p,
    ally,
    step,
    events,
    shots,
    conversions,
    target,
    status: () => g.traverse.status(p, g.combatTick),
    flights: (): any[] =>
      [...g.shots.values()].filter((s: any) => g.traverse.has(s.id)),
    special: () =>
      shots.filter((s) => Math.abs(Math.hypot(s.vx, s.vy) - r.speed) < 1e-6),
  };
}
