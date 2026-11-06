import test from "node:test";
import assert from "node:assert/strict";
import { Game, type Player } from "../src/shared/game.ts";
import { HZ, idleInput } from "../src/shared/protocol.ts";

function hit() {
  const g = new Game({
    mode: "short",
    difficulty: "normal",
    seed: 2209,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  assert(g.start());
  // Let normal opening protection expire on the next tick. This actual hostile
  // zone hits once, expires naturally and leaves its ordinary short slow.
  for (let i = 0; i < HZ - 1; i++) g.step();
  g.fields.push({
    id: 9999,
    owner: "hostile",
    kind: "zone",
    x: p.x,
    y: p.y,
    radius: 30,
    potency: 1,
    until: g.combatTick + 2,
  });
  g.step();
  assert(p.slowUntil > g.combatTick);
  assert(p.damageTaken > 0);
  return { g, p };
}
function move(g: Game, p: Player) {
  const from = { x: p.x, y: p.y };
  assert(
    g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, moveX: 1 }),
  );
  g.step();
  return Math.hypot(p.x - from.x, p.y - from.y);
}

test("A last-zone slow cannot cross a fresh encounter or change movement after any safe intermission restore", () => {
  const { g, p } = hit();
  g.boss.health = 0;
  g.step();
  assert(p.slowUntil > g.combatTick);
  const copies: { phase: string; game: Game }[] = [];
  let previous = "",
    steps = 0;
  while (true) {
    if (g.phase !== previous) {
      previous = g.phase;
      const save = g.offlineCheckpoint();
      assert(save);
      const restored = Game.restoreOffline(JSON.parse(JSON.stringify(save)));
      assert.deepEqual(restored.offlineCheckpoint(), save);
      copies.push({ phase: g.phase, game: restored });
    }
    if (g.phase === "loading") break;
    assert(++steps < 5000);
    if (
      ["mutationVote", "contractVote"].includes(g.phase) &&
      !g.votes.has("solo")
    )
      assert(g.vote("solo", 0));
    g.step();
  }
  assert.deepEqual(
    copies.map((c) => c.phase),
    ["mutationVote", "contractVote", "shop", "loading"],
  );
  let reference: number | undefined;
  for (const copy of [{ phase: "uninterrupted", game: g }, ...copies]) {
    steps = 0;
    while (copy.game.phase !== "combat") {
      assert(++steps < 5000);
      if (
        ["mutationVote", "contractVote"].includes(copy.game.phase) &&
        !copy.game.votes.has("solo")
      )
        assert(copy.game.vote("solo", 0));
      copy.game.step();
    }
    const player = copy.game.players.get("solo")!,
      distance = move(copy.game, player),
      expected = copy.game.stats(player).speed / HZ;
    assert(
      Math.abs(distance - expected) < 1e-8,
      copy.phase + ": new encounter starts at ordinary movement speed",
    );
    if (reference === undefined) reference = distance;
    else assert.equal(distance, reference, copy.phase);
  }
});

test("The actual zone slow still reduces movement during the current encounter and expires on its ordinary combat clock", () => {
  const { g, p } = hit(),
    expiry = p.slowUntil,
    base = g.stats(p).speed / HZ;
  const slowed = move(g, p);
  assert(Math.abs(slowed - base * 0.65) < 1e-8);
  assert.equal(p.slowUntil, expiry);
  while (g.combatTick < expiry) g.step();
  assert(Math.abs(move(g, p) - base) < 1e-8);
});
