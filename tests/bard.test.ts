import test from "node:test";
import assert from "node:assert/strict";
import { Game, data, type Player } from "../src/shared/game.ts";
import { BardKit, CADENCE_HIT_INTERVAL } from "../src/shared/bard-kit.ts";
import {
  idleInput,
  HZ,
  type InputFrame,
  CONTENT_REVISION,
  type Shot,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { chapterLessons } from "../src/shared/story-training.ts";
import { survivorPose } from "../src/client/survivor-presentation.ts";
import motion from "../assets/production/motion/bard-library.json";
import actions from "../assets/production/motion/bard-actions/library.json";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

test("Bard action candidates retain their own source bindings, all four facings and complete fall/attack strips", () => {
  assert.equal(actions.entries.length, 20);
  assert.equal(
    actions.entries.reduce((n, c) => n + c.frames, 0),
    68,
  );
  for (const action of ["idle", "attack", "hurt", "dash", "downed"]) {
    const clips = actions.entries.filter((c) => c.action === action);
    assert.deepEqual(clips.map((c) => c.direction).sort(), [
      "east",
      "north",
      "south",
      "west",
    ]);
    for (const clip of clips) {
      for (const [path, hash] of [
        [clip.source, clip.sourceSha256],
        [clip.atlas, clip.atlasSha256],
      ])
        assert.equal(
          createHash("sha256").update(readFileSync(path)).digest("hex"),
          hash,
        );
      assert.equal(clip.frames, action === "idle" ? 1 : 4);
      assert.deepEqual(clip.origin, [0.5, 0.859375]);
    }
  }
});

function fixture(difficulty = "normal", party = 1) {
  const g = new Game({
    mode: "endless",
    difficulty,
    maxPlayers: Math.max(2, party),
    seed: 41,
  });
  const p = g.addPlayer("p", "Iven", "bard");
  for (let i = 1; i < party; i++)
    g.addPlayer("ally" + i, "Ally", i === 1 ? "bard" : "soldier");
  g.start();
  g.boss.x = 1000;
  g.boss.y = 700;
  g.boss.maxHealth = g.boss.health = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  for (const a of g.players.values()) {
    a.x = a.oldX = 800;
    a.y = a.oldY = 700;
    a.shield = 0;
    a.invulnerableUntil = 1e9;
  }
  return { g, p };
}
function step(g: Game, n: number) {
  for (let i = 0; i < n; i++) g.step();
}
function press(g: Game, input: Partial<InputFrame>, id = "p") {
  const p = g.players.get(id)!;
  g.submitInput(id, { ...idleInput(), sequence: p.ack + 1, aim: 0, ...input });
  g.step();
}
function fill(g: Game, p: Player) {
  step(g, CADENCE_HIT_INTERVAL);
  for (let n = 0; n < 3; n++) {
    assert(g.bard.primaryHit(p, 1, g.combatTick));
    step(g, CADENCE_HIT_INTERVAL);
  }
}
function purchase(g: Game, p: Player, lane: number) {
  const phase = g.phase;
  g.phase = "lobby";
  p.totalSp = 27;
  for (const s of data.skills
    .filter(
      (s) =>
        s.classId === "bard" &&
        s.branchId === "performance" &&
        s.lane === lane &&
        s.depth <= 3,
    )
    .sort((a, b) => a.depth - b.depth))
    assert(g.transact(p.id, { id: s.id, kind: "skill", item: s.id }).ok);
  g.phase = phase;
}

test("Cadence requires positive owned hits, has a bounded hit rate and never grows past three", () => {
  const { g, p } = fixture(),
    kit = new BardKit();
  for (const amount of [0, -1, NaN, Infinity])
    assert(!kit.primaryHit(p, amount, 1));
  assert(!kit.primaryHit(undefined, 1, 1));
  assert(kit.primaryHit(p, 1, 1));
  assert(!kit.primaryHit(p, 100, 1));
  assert(!kit.primaryHit(p, 1, CADENCE_HIT_INTERVAL));
  for (let n = 1; n < 15; n++)
    kit.primaryHit(p, 1, 1 + n * CADENCE_HIT_INTERVAL);
  assert.equal(kit.status(p.id).cadence, 3);
  p.connected = false;
  assert(!kit.primaryHit(p, 1, 200));
  kit.clear();
  assert.equal(kit.status(p.id).cadence, 0);
  assert.equal(g.bard.status(p.id).cadence, 0);
});

test("Real primary notes earn cadence on collision, while misses and ability damage cannot refill it", () => {
  const { g, p } = fixture();
  press(g, { fire: true, aim: Math.PI });
  step(g, HZ);
  assert.equal(g.bard.status(p.id).cadence, 0);
  press(g, { fire: true });
  assert.equal(g.bard.status(p.id).cadence, 0);
  step(g, 12);
  assert(g.bard.status(p.id).cadence > 0);
  press(g, {});
  fill(g, p);
  const before = g.boss.health;
  press(g, { q: true, e: true, ultimate: true });
  assert(g.boss.health < before);
  assert.equal(g.bard.status(p.id).cadence, 0);
  step(g, HZ * 6);
  assert.equal(g.bard.status(p.id).cadence, 0);
  assert.equal(viewOf(g, p.id).players[0].kit.cadence, 0);
});

test("Resolving Phrase spends once, pulses three times, follows its owner and refreshes a finite shield", () => {
  const { g, p } = fixture();
  fill(g, p);
  press(g, { q: true });
  assert.equal(g.bard.status(p.id).cadence, 0);
  assert.equal(g.classKits.status(p.id, g.combatTick).shield, 15);
  p.x += 40;
  step(g, Math.ceil(HZ * 0.75));
  const cue = g.bard.cues().find((c) => c.kind === "bard-phrase")!;
  assert.equal(cue.x, p.x);
  assert.equal(cue.beat, 1);
  assert.equal(g.classKits.status(p.id, g.combatTick).shield, 15);
  step(g, Math.ceil(HZ * 0.75));
  assert.equal(g.bard.cues().find((c) => c.kind === "bard-phrase")!.beat, 2);
  step(g, HZ * 3);
  assert.equal(g.bard.cues().length, 0);
  assert.equal(g.classKits.status(p.id, g.combatTick).shield, 0);
});

test("Two Bards refresh the strongest shield rather than adding it, and Hellish grants none", () => {
  const { g, p } = fixture("normal", 3),
    other = g.players.get("ally1")!;
  fill(g, p);
  fill(g, other);
  press(g, { q: true });
  press(g, { q: true }, other.id);
  assert.equal(g.classKits.status("ally2", g.combatTick).shield, 15);
  const hell = fixture("hellish");
  fill(hell.g, hell.p);
  press(hell.g, { q: true });
  assert.equal(hell.g.classKits.status(hell.p.id, hell.g.combatTick).shield, 0);
});

test("Cut In erases at most eight actual projectiles and retains warnings and fields", () => {
  const { g, p } = fixture();
  const emit = Reflect.get(g, "emitShot") as Function;
  const ids: number[] = [];
  for (let i = 0; i < 12; i++)
    ids.push(
      (emit.call(g, "hostile", p.x + 50 + i * 8, p.y, 0, 0, 5, 3) as Shot).id,
    );
  const warning = {
    id: 900001,
    kind: "zone" as const,
    x: 1200,
    y: 400,
    aim: 1,
    count: 1,
    arc: 0,
    speed: 100,
    damage: 12,
    radius: 70,
    at: g.combatTick,
    until: 1e6,
  };
  g.warnings.push(warning);
  press(g, { e: true });
  assert.equal(ids.filter((id) => !g.shots.has(id)).length, 8);
  assert.deepEqual(
    g.warnings.find((w) => w.id === warning.id),
    warning,
  );
  assert.equal(g.bard.status(p.id).cadence, 0);
});

test("Cut In stops at cover, leaving projectiles on the far side", () => {
  const { g, p } = fixture();
  p.x = p.oldX = 500;
  p.y = p.oldY = 500;
  Object.defineProperty(g, "obstacles", {
    value: [
      {
        x: 560,
        y: 450,
        width: 40,
        height: 100,
      },
    ],
  });
  const emit = Reflect.get(g, "emitShot") as Function;
  const near = emit.call(g, "hostile", 530, 500, 0, 0, 5, 3) as Shot;
  const far = emit.call(g, "hostile", 640, 500, 0, 0, 5, 3) as Shot;
  press(g, { e: true });
  assert(!g.shots.has(near.id));
  assert(g.shots.has(far.id));
  const cue = g.bard.cues().find((c) => c.kind === "bard-cut")!;
  assert(cue.x2! < 560);
});

test("Encore stays at its stage and the purchased Travelling Chorus changes actual pulse positions", () => {
  for (const travelling of [false, true]) {
    const { g, p } = fixture();
    if (travelling) purchase(g, p, 1);
    fill(g, p);
    const origin = p.x;
    press(g, { ultimate: true });
    p.x += 80;
    step(g, HZ);
    const cue = g.bard.cues().find((c) => c.encore)!;
    assert.equal(cue.x, travelling ? p.x : origin);
    assert.equal(cue.beat, 1);
    assert.equal(g.bard.status(p.id).cadence, 0);
  }
});

test("Held Note changes the final real pulse and Borrowed Cue creates one finite destructible lure", () => {
  const held = fixture();
  purchase(held.g, held.p, 0);
  fill(held.g, held.p);
  press(held.g, { q: true });
  const first = held.g.bard.cues().find((c) => c.kind === "bard-phrase")!;
  const shield = held.g.classKits.status(held.p.id, held.g.combatTick).shield;
  step(held.g, 2 * Math.ceil(HZ * 0.75));
  const last = held.g.bard.cues().find((c) => c.kind === "bard-phrase")!;
  assert.equal(last.radius, first.radius * 1.4);
  assert.equal(
    held.g.classKits.status(held.p.id, held.g.combatTick).shield,
    shield * 2,
  );
  const decoy = fixture();
  purchase(decoy.g, decoy.p, 2);
  press(decoy.g, { e: true });
  const lure = decoy.g.classKits.constructs().find((c) => c.kind === "decoy")!;
  assert.equal(lure.health, 30);
  assert.equal(lure.until - lure.at, HZ * 4);
  assert.equal(
    decoy.g.classKits.decoyTargets([decoy.p], decoy.g.combatTick).length,
    1,
  );
  decoy.g.classKits.hitDecoy("decoy:" + lure.id, 30);
  assert.equal(
    decoy.g.classKits.decoyTargets([decoy.p], decoy.g.combatTick).length,
    0,
  );
});

test("Performances stop when their owner disconnects, is downed, or the host ends the run", () => {
  for (const end of ["disconnect", "down", "host"]) {
    const { g, p } = fixture("normal", 2);
    fill(g, p);
    press(g, { q: true, ultimate: true });
    assert(g.bard.cues().length > 0);
    if (end === "disconnect") p.connected = false;
    else if (end === "down") p.status = "downed";
    else g.endByHost();
    g.step();
    assert.equal(g.bard.cues().length, 0, end);
    assert.equal(g.bard.status(p.id).cadence, 0, end);
  }
});

test("Bard Free Play owns its full legal SP tree while fresh Story uses the named D-minus lesson", () => {
  const quick = new Game({ mode: "short" }),
    q = quick.addPlayer("q", "Iven", "bard");
  assert.equal(q.totalSp, 3);
  assert(
    quick.transact(q.id, {
      id: "buy",
      kind: "skill",
      item: "bard-performance-1",
    }).ok,
  );
  const story = new Game({ mode: "story" }),
    s = story.addPlayer("s", "Iven", "bard");
  assert.equal(s.totalSp, 0);
  assert.equal(story.trainingFor(s.id)?.characterId, "iven-cair");
  assert.equal(chapterLessons.bard.techniqueId, "bard-performance-1");
  assert(
    !story.transact(s.id, {
      id: "buy",
      kind: "skill",
      item: "bard-performance-1",
    }).ok,
  );
  assert.equal(story.trainingFor(s.id)?.proofs.length, 0);
  const restored = Game.restoreOffline(quick.offlineCheckpoint());
  assert.equal(restored.players.get("solo")?.classId, "bard");
  assert.deepEqual(restored.players.get("solo")?.skills, q.skills);
});

test("The issued chapter revision preserves original characters and proofs without admitting a forged old Bard", () => {
  const g = new Game({ mode: "story" });
  g.addPlayer("p", "Mara", "soldier");
  const saved = g.offlineCheckpoint()!;
  saved.contentRevision =
    "5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779";
  const restored = Game.restoreOffline(structuredClone(saved));
  assert.deepEqual(restored.chapter, g.chapter);
  assert.deepEqual(restored.trainingFor("solo"), g.trainingFor("p"));
  const bad = structuredClone(saved);
  bad.player.classId = "bard";
  assert.throws(() => Game.restoreOffline(bad));
  assert.notEqual(saved.contentRevision, CONTENT_REVISION);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      contentRevision: saved.contentRevision,
    }),
  );
});

test("Bard directional run candidates select their actual independent frames and preserve source hashes", () => {
  assert.equal(motion.entries.length, 4);
  for (const clip of motion.entries) {
    assert.equal(
      createHash("sha256").update(readFileSync(clip.atlas)).digest("hex"),
      clip.atlasSha256,
    );
    const aim = {
      east: 0,
      south: Math.PI / 2,
      west: Math.PI,
      north: -Math.PI / 2,
    }[clip.direction]!;
    for (let i = 0; i < clip.frames; i++) {
      const pose = survivorPose(
        "bard",
        aim,
        true,
        "active",
        (i * HZ) / clip.fps + 0.001,
      );
      assert.equal(pose.texture, clip.id);
      assert.equal(pose.frame, i);
    }
    assert.equal(
      survivorPose("bard", aim, false, "active", 0).texture,
      "bard-reference",
    );
    assert.equal(
      survivorPose("bard", aim, true, "active", 0, true).texture,
      "bard-reference",
    );
  }
});
