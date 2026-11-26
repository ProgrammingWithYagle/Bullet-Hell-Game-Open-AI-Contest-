import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  HeavySeamPresentation,
  drawHeavySeam,
} from "../src/client/heavy-seam-presentation.ts";
import type { SeamPrivateEvent } from "../src/shared/heavy-seam.ts";
function fixture() {
  const g = new Game({ runId: "private-view-test" });
  g.addPlayer("local", "Hux", "heavy");
  g.addPlayer("host", "Mera", "medic");
  g.start();
  const v = viewOf(g, "local");
  v.owner = "host";
  v.combatTick = 10;
  const event: SeamPrivateEvent = {
    type: "private-class-cues",
    owner: "local",
    at: 10,
    run: v.run.id,
    encounter: v.encounter,
    cues: [
      {
        kind: "heavy-flak-seam-owner",
        id: 42,
        owner: "local",
        at: 8,
        until: 26,
        points: [
          { x: 600, y: 600 },
          { x: 615, y: 600 },
          { x: 630, y: 600 },
        ],
        broken: false,
        stage: "flight",
      },
    ],
  };
  return { v, event, m: new HeavySeamPresentation() };
}
test("private presentation follows the local actor rather than the room host, and copies every vertex", () => {
  const { v, event, m } = fixture();
  m.ingest(event, v, "local");
  const frame = m.frame(v, "local");
  assert.equal(frame.length, 1);
  event.cues[0].points[0].x = 1;
  frame[0].points[1].y = 1;
  assert.deepEqual(m.frame(v, "local")[0].points, [
    { x: 600, y: 600 },
    { x: 615, y: 600 },
    { x: 630, y: 600 },
  ]);
  assert.deepEqual(m.frame(v, "host"), []);
});
for (const kind of [
  "foreign",
  "run",
  "encounter",
  "old tick",
  "invalid",
  "expired",
] as const)
  test(
    "private presentation rejects " +
      kind +
      " without replacing its actual current path",
    () => {
      const { v, event, m } = fixture();
      m.ingest(event, v, "local");
      const wrong = structuredClone(event);
      if (kind === "foreign") {
        wrong.owner = "foreign";
        wrong.cues[0].owner = "foreign";
      }
      if (kind === "run") wrong.run = "old-run";
      if (kind === "encounter") wrong.encounter++;
      if (kind === "old tick") wrong.at = 9;
      if (kind === "invalid") wrong.cues[0].points[0].x = Infinity;
      if (kind === "expired") {
        wrong.at = 26;
        wrong.cues[0].until = 26;
      }
      m.ingest(wrong, v, "local");
      assert.equal(m.frame(v, "local")[0].id, 42);
    },
  );
for (const kind of [
  "run",
  "encounter",
  "phase",
  "owner",
  "expiry",
  "clear",
] as const)
  test("private presentation clears at " + kind + " boundaries", () => {
    const { v, event, m } = fixture();
    m.ingest(event, v, "local");
    let owner = "local";
    if (kind === "run") v.run.id = "next-run";
    if (kind === "encounter") v.encounter++;
    if (kind === "phase") v.phase = "shop";
    if (kind === "owner") owner = "next-owner";
    if (kind === "expiry") v.combatTick = 26;
    if (kind === "clear") m.clear();
    assert.deepEqual(m.frame(v, owner), []);
  });
test("an explicit empty private snapshot clears its owner and later older snapshots cannot restore it", () => {
  const { v, event, m } = fixture();
  m.ingest(event, v, "local");
  m.ingest({ ...event, at: 11, cues: [] }, v, "local");
  m.ingest(event, v, "local");
  assert.deepEqual(m.frame(v, "local"), []);
});
test("the renderer draws only actual copied segments with finite bounded alpha and no motion or new geometry", () => {
  const { v, event, m } = fixture();
  m.ingest(event, v, "local");
  for (const high of [false, true])
    for (const stage of ["flight", "cut"] as const)
      for (const broken of [false, true]) {
        const calls: any[] = [];
        const pen = {
          lineStyle(...args: number[]) {
            calls.push(["style", ...args]);
            return this;
          },
          lineBetween(...args: number[]) {
            calls.push(["line", ...args]);
            return this;
          },
        };
        const cue = {
          ...m.frame(v, "local")[0],
          stage,
          broken,
          at: 10,
          until: 16,
        };
        drawHeavySeam(pen, [cue], 12, high);
        assert.deepEqual(calls.slice(1), [
          ["line", 600, 600, 615, 600],
          ["line", 615, 600, 630, 600],
        ]);
        assert(calls.every((c) => c.slice(1).every(Number.isFinite)));
        assert(calls[0][3] > 0 && calls[0][3] <= 0.8);
        calls.length = 0;
        drawHeavySeam(pen, [cue], 16, high);
        assert.deepEqual(calls, []);
      }
});
