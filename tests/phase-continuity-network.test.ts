import { Client } from "@colyseus/sdk";
import { randomUUID } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { encounterPhases } from "../src/shared/encounter-policy.ts";
import type { Game } from "../src/shared/game.ts";

async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Continuing attack did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
function until(g: Game, check: () => boolean) {
  for (let n = 0; n < 2000 && !check(); n++) g.step();
  assert(check(), "Required authoritative attack not reached: " + g.boss.id);
}
test(
  "real owner/observer retain phase-crossing reagent children, route movement, shootable needles and arena currents",
  { timeout: 45000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    try {
      await assert.rejects(
        new Client(endpoint).create("grave", {
          name: "Old client",
          classId: "soldier",
          mode: "endless",
          difficulty: "normal",
          visibility: "public",
          createKey: randomUUID(),
          protocolVersion: 35,
          contentRevision:
            "7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2",
        }),
        /versionMismatch/,
      );
      for (const [id, kind] of [
        ["alchemist", "mold-flask"],
        ["courier", "charge"],
        ["glass-surgeon", "service-beam"],
        ["sluice-keeper", "service-current"],
      ] as const) {
        const a = new Session(endpoint),
          b = new Session(endpoint);
        try {
          const options = {
            name: "Host",
            classId: "soldier" as const,
            mode: "endless" as const,
            difficulty: "normal",
            openingBossId: id,
            openingArenaId: "gatehouse",
          };
          await a.connect(options);
          await b.connect(
            { ...options, name: "Observer" },
            { roomId: a.room!.roomId },
          );
          await wait(() => a.view?.players.length === 2);
          a.start();
          await wait(() => b.view?.phase === "combat");
          const g = liveRooms.get(a.room!.roomId)!.game;
          g.boss.deadline = 1e9;
          for (const p of g.players.values()) p.invulnerableUntil = 1e9;
          until(g, () =>
            g
              .bossCues()
              .some(
                (q) => q.kind === kind && "at" in q && q.at > g.combatTick + 10,
              ),
          );
          const locked = structuredClone(
            g
              .bossCues()
              .find(
                (q) => q.kind === kind && "at" in q && q.at > g.combatTick + 10,
              )!,
          );
          const before = { x: g.boss.x, y: g.boss.y };
          const next = encounterPhases(id, g.boss.variant)[1];
          g.boss.health = g.boss.maxHealth * (next.healthThreshold - 0.001);
          g.step();
          assert.equal(g.boss.phase, 1);
          await wait(() =>
            [a, b].every(
              (s) =>
                s.view?.boss.phase === 1 &&
                s.view.bossCues.some(
                  (q) => q.kind === locked.kind && q.id === locked.id,
                ),
            ),
          );
          for (const s of [a, b]) {
            const q = s.view!.bossCues.find(
              (q) => q.kind === locked.kind && q.id === locked.id,
            )!;
            for (const key of [
              "at",
              "until",
              "beganAt",
              "x",
              "y",
              "x1",
              "y1",
              "x2",
              "y2",
              "width",
              "damage",
            ])
              if (key in locked)
                assert.deepEqual(
                  Reflect.get(q, key),
                  Reflect.get(locked, key),
                  id + ":" + key,
                );
          }
          if (locked.kind === "mold-flask") {
            while (g.combatTick < locked.at) g.step();
            const pool = g
              .bossCues()
              .find(
                (q) =>
                  q.kind === "mold-pool" &&
                  q.reagent === locked.reagent &&
                  q.x === locked.x &&
                  q.y === locked.y,
              );
            assert(pool && pool.kind === "mold-pool");
            assert.equal(pool.at, locked.at);
            await wait(() =>
              [a, b].every((s) =>
                s.view?.bossCues.some(
                  (q) => q.id === pool.id && q.kind === "mold-pool",
                ),
              ),
            );
            for (const s of [a, b])
              assert.deepEqual(
                s.view!.bossCues.find((q) => q.id === pool.id),
                pool,
              );
          } else if (locked.kind === "charge") {
            until(
              g,
              () => Math.hypot(g.boss.x - before.x, g.boss.y - before.y) > 5,
            );
            await wait(() =>
              [a, b].every(
                (s) =>
                  s.view &&
                  Math.hypot(
                    s.view.boss.x - before.x,
                    s.view.boss.y - before.y,
                  ) > 1,
              ),
            );
          } else if (locked.kind === "service-beam") {
            const weak = locked.dependencies[0];
            assert(g.director.weakPoints().some((q) => q.id === weak));
            assert(g.director.hitWeakPoint(1e9, g.combatTick, weak) > 0);
            g.step();
            await wait(() =>
              [a, b].every((s) =>
                s.view?.bossCues.some(
                  (q) =>
                    q.kind === "service-beam" &&
                    q.id === locked.id &&
                    q.disabled,
                ),
              ),
            );
          }
          g.boss.health = 0;
          g.step();
          await wait(() =>
            [a, b].every(
              (s) =>
                s.view?.phase !== "combat" &&
                !s.view?.bossCues.some((q) => q.id === locked.id),
            ),
          );
        } finally {
          await b.close();
          await a.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
