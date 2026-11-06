import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Stitchwork,
  sewingPatch,
  stitchSeamContact,
  stitchRules,
  type StitchSeam,
} from "../src/shared/stitchwork.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { encounterPhases } from "../src/shared/encounter-policy.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import {
  stitchHelp,
  stitchPhaseName,
  stitchPhaseHint,
} from "../src/client/stitch-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { freshProfile, parseProfile, summary } from "../src/client/profile.ts";
import { practiceRecords } from "../src/client/progress.ts";
import { encounterFrame } from "../src/client/encounter-presentation.ts";
const issued =
  "1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d";
function fixture(
  phase = 0,
  variant: "normal" | "brutal" | "crazed" = "normal",
) {
  let serial = 1;
  const hits: { id: string; amount: number }[] = [],
    sewing = new Stitchwork();
  const c: SignatureContext = {
    tick: 0,
    bossId: "stitchwright",
    boss: { x: 800, y: 240 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [
      { id: "a", x: 800, y: 680, oldX: 800, oldY: 680 },
      { id: "b", x: 1200, y: 680, oldX: 1200, oldY: 680 },
    ],
    phase,
    variant,
    brutal: variant !== "normal",
    damageScale: variant === "normal" ? 1 : 2,
    id: () => serial++,
    damage: (id, amount) => hits.push({ id, amount }),
    spawnRat: () => {},
  };
  const step = (now: number) => {
    c.tick = now;
    sewing.step(c);
  };
  return { c, sewing, hits, step };
}
const seams = (f: ReturnType<typeof fixture>) =>
  f.sewing.cues().filter((q): q is StitchSeam => q.kind === "stitch-seam");
const context = (g: Game): SignatureContext =>
  Reflect.get(g, "signatureContext").call(g);
function game(
  difficulty = "normal",
  variant: "normal" | "brutal" | "crazed" = "normal",
  arena = "gatehouse",
) {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "stitchwright",
      difficulty,
      openingArenaId: arena,
      arenaSelection: "fixed",
      seed: 77,
    },
    "Vey",
    "soldier",
    variant,
  );
  g.start();
  g.boss.deadline = 1e9;
  g.players.get("solo")!.invulnerableUntil = 1e9;
  return g;
}
function until(g: Game, check: () => boolean, max = 900) {
  for (let i = 0; i < max && !check(); i++) g.step();
  assert(check(), "Missing Stitchwright attack witness");
}

test("basting locks to its warning, is harmless before release, hits once and exposes both shootable needles", () => {
  const f = fixture();
  assert(f.sewing.cast(f.c, f.c.targets[0]));
  const q = seams(f)[0];
  assert(q);
  assert.equal(f.sewing.weakPoints().length, 2);
  const locked = [q.x1, q.y1, q.x2, q.y2];
  f.step(q.at - 1);
  assert.equal(f.hits.length, 0);
  f.step(q.at);
  assert.equal(f.hits.length, 1);
  assert.equal(f.hits[0].amount, stitchRules.threadDamage);
  f.step(q.at + 1);
  assert.equal(f.hits.length, 1);
  f.c.targets[0].x += 350;
  f.step(q.at + 2);
  const after = seams(f)[0];
  assert.deepEqual([after.x1, after.y1, after.x2, after.y2], locked);
});
test("cutting either needle cancels its live and pending return without replacing its health", () => {
  const f = fixture(1);
  f.sewing.cast(f.c, f.c.targets[0]);
  const p = f.sewing.weakPoints()[0],
    first = seams(f)[0];
  assert.equal(f.sewing.hit(p.id, 1, 0), 1);
  assert.equal(f.sewing.weakPoints()[0].health, p.maxHealth - 1);
  assert.equal(f.sewing.hit(p.id, 1e6, 0), p.maxHealth - 1);
  for (let tick = 1; tick < 220; tick++) f.step(tick);
  assert.equal(f.hits.length, 0);
  assert(!f.sewing.weakPoints().some((q) => q.id === p.id));
  assert(first.at >= 42);
});
test("backstitch gets a new complete visible warning and its own one-hit contact budget", () => {
  const f = fixture(1);
  f.sewing.cast(f.c, f.c.targets[0]);
  const first = seams(f)[0];
  f.step(first.at);
  assert.equal(f.hits.length, 1);
  f.step(first.until + 12);
  const second = seams(f).find((q) => q.style === "backstitch");
  assert(second);
  assert.equal(second.at - second.beganAt, 42);
  assert(second.beganAt >= first.until + 12);
  f.step(second.at - 1);
  assert.equal(f.hits.length, 1);
  f.step(second.at);
  assert.equal(f.hits.length, 2);
});
test("closing hem contracts real geometry and keeps its marked route safe for the whole movement", () => {
  const f = fixture(2);
  f.sewing.cast(f.c, f.c.targets[0]);
  const gate = f.sewing.cues().find((q) => q.kind === "stitch-gate");
  assert(gate && gate.kind === "stitch-gate");
  const initial = seams(f);
  assert.equal(initial.length, 3);
  assert(gate.width >= 120);
  for (let t = initial[0].at; t < initial[0].until; t++) {
    f.step(t);
    for (const q of seams(f))
      assert(
        !stitchSeamContact(gate, { x: gate.endX, y: gate.endY }, q),
        JSON.stringify({ t, q, gate }),
      );
  }
  assert.equal(f.hits.length, 0);
});
test("moving thread collision catches endpoint caps, swept dodges and a moving seam crossing a still player", () => {
  const f = fixture();
  f.sewing.cast(f.c, f.c.targets[0]);
  const q = {
    ...seams(f)[0],
    x1: 100,
    y1: 500,
    x2: 100,
    y2: 700,
    oldX1: 0,
    oldY1: 500,
    oldX2: 0,
    oldY2: 700,
  };
  assert(stitchSeamContact({ x: 50, y: 600 }, { x: 50, y: 600 }, q));
  assert(!stitchSeamContact({ x: 50, y: 800 }, { x: 50, y: 800 }, q));
  assert(
    stitchSeamContact(
      { x: -500, y: 600 },
      { x: 700, y: 600 },
      { ...q, oldX1: 100, oldX2: 100 },
    ),
  );
  assert(
    stitchSeamContact(
      { x: 100, y: 486 },
      { x: 100, y: 486 },
      { ...q, oldX1: 100, oldX2: 100 },
    ),
  );
});
test("Last Alteration warns a second hem after the first ends and turns its opening", () => {
  const f = fixture(3, "brutal");
  f.sewing.cast(f.c, f.c.targets[0]);
  const first = f.sewing.cues().find((q) => q.kind === "stitch-gate");
  assert(first && first.kind === "stitch-gate");
  f.step(first.until + 15);
  const second = f.sewing.cues().find((q) => q.kind === "stitch-gate");
  assert(second && second.kind === "stitch-gate");
  assert(second.beganAt >= first.until + 15);
  assert.equal(second.at - second.beganAt, 54);
  assert.notEqual(
    Math.sign(first.endX - first.x) + 10 * Math.sign(first.endY - first.y),
    Math.sign(second.endX - second.x) + 10 * Math.sign(second.endY - second.y),
  );
});
test("Brutal returns from phase one; Crazed adds an independently warned crossing with bounded pins", () => {
  const normal = fixture(),
    brutal = fixture(0, "brutal"),
    crazed = fixture(0, "crazed");
  for (const f of [normal, brutal, crazed]) f.sewing.cast(f.c, f.c.targets[0]);
  normal.step(100);
  brutal.step(100);
  crazed.step(100);
  assert.equal(seams(normal).length, 0);
  assert(seams(brutal).some((q) => q.style === "backstitch"));
  assert(crazed.sewing.weakPoints().length > brutal.sewing.weakPoints().length);
  for (const phase of [2, 3]) {
    const f = fixture(phase, "crazed");
    f.sewing.cast(f.c, f.c.targets[0]);
    let maximum = 0;
    for (let t = 0; t < 500; t++) {
      f.step(t);
      maximum = Math.max(maximum, f.sewing.weakPoints().length);
      const live = seams(f).filter((q) => t >= q.at && !q.disabled);
      if (live.some((q) => q.style === "hem"))
        assert(live.every((q) => q.style === "hem"));
    }
    assert(maximum <= 12);
  }
});
test("sewing patches and approach movement respect all six maps, all six difficulties and all three forms", () => {
  let cases = 0;
  for (const a of data.arenas)
    for (const d of data.difficulties)
      for (const form of ["normal", "brutal", "crazed"] as const) {
        const g = game(d.id, form, a.id),
          c = context(g),
          p = g.players.get("solo")!,
          patch = sewingPatch(c, p, cases);
        assert(patch, "No hem patch on " + a.id + "/" + d.id + "/" + form);
        for (const q of patch.corners) {
          assert(
            !g.obstacles.some(
              (o) => segmentRect(q, q, o, stitchRules.pinRadius) !== null,
            ),
          );
          assert(
            !g.arena.lavaPits.some(
              (p) => distance(q, p) <= p.radius + stitchRules.pinRadius,
            ),
          );
        }
        until(g, () => g.bossCues().some((q) => q.kind === "stitch-seam"));
        assert.equal(g.warnings.length, 0);
        assert.equal(g.variantPressure.cues().length, 0);
        assert.equal(
          [...g.shots.values()].filter((q) => q.owner === "hostile").length,
          0,
        );
        for (let i = 0; i < 80; i++) {
          g.step();
          assert(
            !g.obstacles.some(
              (o) => segmentRect(g.boss, g.boss, o, 57) !== null,
            ),
          );
        }
        cases++;
      }
  assert.equal(cases, 108);
});
test("all authored phase thresholds expose the right technique and retain committed seams across transitions", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = game("normal", form);
    until(g, () => g.bossCues().some((q) => q.kind === "stitch-seam"));
    const old = g.bossCues().find((q) => q.kind === "stitch-seam")!;
    const phases = encounterPhases("stitchwright", form);
    g.boss.health = g.boss.maxHealth * (phases[1].healthThreshold - 0.001);
    g.step();
    assert(g.bossCues().some((q) => q.id === old.id));
    for (let phase = 1; phase < phases.length; phase++) {
      if (phase > 1) {
        g.boss.health =
          g.boss.maxHealth * (phases[phase].healthThreshold - 0.001);
        g.step();
      }
      until(
        g,
        () =>
          g
            .bossCues()
            .some(
              (q) =>
                q.kind === "stitch-seam" &&
                q.id !== old.id &&
                (phase < 2 ? q.style === "backstitch" : q.style === "hem"),
            ),
        1600,
      );
    }
    const rendered = encounterFrame(g.boss, g.combatTick, g.bossCues());
    assert(rendered >= 0 && rendered <= 7);
    assert.equal(encounterFrame(g.boss, g.combatTick, g.bossCues(), true), 0);
    g.boss.health = 0;
    g.step();
    assert(
      !g
        .bossCues()
        .some(
          (q) => q.kind.startsWith("stitch-") || q.kind === "service-tether",
        ),
    );
  }
});
test("pause cannot start fresh sewing; reset removes needles, future warnings and contact history", () => {
  const f = fixture();
  f.c.paused = true;
  f.step(100);
  assert.equal(f.sewing.cues().length, 0);
  f.c.paused = false;
  f.sewing.cast(f.c, f.c.targets[0]);
  assert(f.sewing.cues().length > 0);
  f.sewing.reset(100, true);
  assert.equal(f.sewing.cues().length, 0);
  assert.equal(f.sewing.weakPoints().length, 0);
  assert.equal(f.sewing.busy, false);
});
test("all fifteen catalogs expose distinct phase names, correct manual guidance and authored recovered lore", () => {
  const g = game();
  const view = viewOf(g, "solo");
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      new Set([0, 1, 2, 3].map((p) => stitchPhaseName(p, l.id))).size,
      4,
    );
    assert.equal(signatureHelp(view, l.id), stitchHelp("normal", l.id));
    assert(
      stitchPhaseHint(2, "crazed", l.id).includes(
        m["boss.stitchwright.crazedHelp"],
      ),
    );
    assert.equal(
      stitchHelp("normal", l.id),
      m["boss.stitchwright.description"],
    );
    if (l.id !== "en")
      assert.notEqual(stitchHelp("normal", l.id), stitchHelp("normal", "en"));
  }
  assert(
    data.bosses
      .find((b) => b.id === "stitchwright")!
      .lore.includes("No account required."),
  );
});
test("known public-v4 local saves and profiles preserve economy, names, bindings and records; foreign/online state is rejected", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "stitchwright",
      openingArenaId: "crown-crypt",
      seed: 77,
    },
    "Original Name",
    "heavy",
    "brutal",
  );
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 43;
  old.contentRevision = issued;
  old.player.coins = 731;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL,65);
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player, old.player);
  assert.deepEqual(restored.settings, old.settings);
  assert.deepEqual(restored.selectedContract, old.selectedContract);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const p = freshProfile();
  p.contentRevision = issued;
  p.locale = "ar";
  p.settings.combatLayout = "separate";
  p.settings.showNames = false;
  const record = {
    schemaVersion: 1 as const,
    id: "historical",
    practiceOnly: true as const,
    verified: false as const,
    contentRevision: issued,
    protocol: 43,
    mode: "short" as const,
    difficulty: "normal",
    classId: "soldier" as const,
    completedEncounters: 5,
    accords: 1,
    combatTicks: 400,
    secret: "locked" as const,
    memorial: false,
  };
  p.legacyCampaigns = [record];
  const after = parseProfile(JSON.stringify(p));
  assert.deepEqual(after.settings, p.settings);
  assert.deepEqual(after.controls, p.controls);
  assert.equal(after.locale, "ar");
  assert.deepEqual(after.legacyCampaigns, p.legacyCampaigns);
  assert.equal(summary(after).totalClears, 0);
  assert.equal(
    practiceRecords({
      getItem: () => JSON.stringify([record]),
      setItem: () => {},
    }).length,
    1,
  );
});
