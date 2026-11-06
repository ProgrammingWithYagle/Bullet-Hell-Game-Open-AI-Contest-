// Preserve issued fifteen-boss Story prototype behavior through the restore-only compatibility path.
import {
  practiceRecords,
  PRACTICE_RECORDS_KEY,
} from "../src/client/progress.ts";
import { readFileSync } from "node:fs";
import { menuBundle } from "./helpers/menu-fixture.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  BakerOven,
  bakerRules,
  bakerRayEnd,
  bakerContact,
  type BakerLoaf,
  type BakerCrumb,
} from "../src/shared/baker-oven.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput, CONTENT_REVISION } from "../src/shared/protocol.ts";
import {
  clamp,
  segmentRect,
  segmentCircle,
  distance,
  moveBody,
} from "../src/shared/geometry.ts";
import {
  recordProfileView,
  loadProfile,
  parseProfile,
  exportProfile,
} from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
const ticks = (s: number) => Math.ceil(s * 30);
function fixture(form = "normal", phase = 0) {
  const d = new BakerOven();
  let serial = 1;
  const hurt: { id: string; amount: number }[] = [],
    warnings: number[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "ash-baker",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [
      { id: "a", x: 800, y: 550, oldX: 800, oldY: 550 },
      { id: "b", x: 1250, y: 550, oldX: 1250, oldY: 550 },
    ],
    damageScale: form === "normal" ? 1 : 2,
    brutal: form !== "normal",
    variant: form as "normal",
    phase,
    id: () => serial++,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat() {},
    warn: () => warnings.push(c.tick),
  };
  const step = (until: number) => {
    for (let n = c.tick + 1; n <= until; n++) {
      c.tick = n;
      d.step(c);
    }
  };
  return {
    d,
    c,
    hurt,
    warnings,
    step,
    loaves: () =>
      d.cues().filter((q): q is BakerLoaf => q.kind === "service-baker-loaf"),
    crumbs: () =>
      d.cues().filter((q): q is BakerCrumb => q.kind === "service-baker-crumb"),
  };
}
test("Ash Baker has distinct single, three-way, scored five-loaf and open-center fourth-phase batches", () => {
  for (const [phase, count] of [1, 3, 5, 4].entries()) {
    const f = fixture("normal", phase);
    f.d.cast(f.c, f.c.targets[0]);
    assert.equal(f.loaves().length, count);
    assert(
      f
        .loaves()
        .every((q) => q.at === 54 && q.landAt === 108 && q.splitAt === 156),
    );
    const locked = f.loaves().map((q) => [q.endX, q.endY]);
    f.c.targets[0].x += 350;
    f.step(30);
    assert.deepEqual(
      f.loaves().map((q) => [q.endX, q.endY]),
      locked,
    );
  }
});
test("Only rolling bodies damage, all children share one hit per batch, and both warning windows are harmless", () => {
  const f = fixture("normal", 2);
  f.c.targets[0] = { id: "a", x: 800, y: 250, oldX: 800, oldY: 250 };
  f.d.cast(f.c, { x: 800, y: 550 });
  f.step(53);
  assert.equal(f.hurt.length, 0);
  f.step(54);
  assert.equal(f.hurt.length, 1);
  f.step(107);
  assert.equal(f.hurt.length, 1);
  f.step(108);
  const crumbs = f.crumbs();
  assert.equal(crumbs.length, 20);
  assert(crumbs.every((q) => q.beganAt === 108 && q.at === 156));
  f.c.targets[0].x = crumbs[0].originX;
  f.c.targets[0].oldX = crumbs[0].originX;
  f.c.targets[0].y = crumbs[0].originY;
  f.c.targets[0].oldY = crumbs[0].originY;
  f.step(155);
  assert.equal(f.hurt.length, 1);
  f.step(160);
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, 18);
  assert(
    bakerContact(
      { x: -50, y: 0 },
      { x: 50, y: 0 },
      { x: 0, y: 0, oldX: 0, oldY: 0, radius: 6 },
    ),
  );
});
test("The landed-crust window accepts real damage, cancels its crumbs permanently and closes exactly at activation", () => {
  const f = fixture();
  f.d.cast(f.c, f.c.targets[0]);
  const loaf = f.loaves()[0];
  assert.equal(f.d.hit(loaf.id, 999, 1), 0);
  f.step(loaf.landAt);
  assert.equal(f.d.weakPoints().length, 1);
  assert.equal(f.crumbs().length, 2);
  assert.equal(f.d.hit(loaf.id, 999, loaf.landAt), 30);
  assert.equal(f.crumbs().length, 0);
  f.step(loaf.splitAt + 50);
  assert.equal(f.crumbs().length, 0);
  assert.equal(f.d.weakPoints().length, 0);
  const g = fixture();
  g.d.cast(g.c, g.c.targets[0]);
  const q = g.loaves()[0];
  g.step(q.splitAt);
  assert.equal(g.d.hit(q.id, 999, q.splitAt), 0);
  assert.equal(g.crumbs().length, 2);
});
test("Brutal and Crazed batches begin fresh warnings, lock a current visible survivor and survive phase changes", () => {
  for (const form of ["brutal", "crazed"]) {
    const f = fixture(form, 1);
    f.d.cast(f.c, f.c.targets[0]);
    const primary = f.loaves()[0];
    f.c.phase = 3;
    f.c.targets[1].x = 1300;
    f.step(ticks(bakerRules.brutalDelay));
    const second = f.loaves().filter((q) => q.batch === 1);
    assert.equal(second.length, 3);
    assert(
      second.every((q) => q.phase === 1 && q.beganAt === 129 && q.at === 183),
    );
    assert(primary.at < second[0].beganAt);
    assert(second.every((q) => q.angle < Math.PI / 2));
    f.step(ticks(bakerRules.crazedDelay));
    assert.equal(
      f.loaves().filter((q) => q.batch === 2).length,
      form === "crazed" ? 3 : 0,
    );
  }
});
test("All map, difficulty, form and phase paths stay inside the actual floor and stop before cover/lava", () => {
  let cases = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties)
      for (const form of ["normal", "brutal", "crazed"] as const)
        for (let phase = 0; phase < 4; phase++) {
          const g = createPracticeGame(
            {
              mode: "endless",
              openingBossId: "ash-baker",
              difficulty: difficulty.id,
              openingArenaId: map.id,
              arenaSelection: "fixed",
            },
            "Geometry",
            "tank",
            form,
          );
          g.start();
          const c = {
            ...(
              g as unknown as { signatureContext(): SignatureContext }
            ).signatureContext(),
            phase,
            variant: form,
            brutal: form !== "normal",
            damage() {},
          };
          const d = new BakerOven();
          d.cast(c, c.targets[0]);
          for (let tick = 1; tick <= 108; tick++) {
            c.tick = tick;
            d.step(c);
          }
          const b = c.bounds!;
          for (const q of d.cues()) {
            for (const p of [
              { x: q.originX, y: q.originY },
              { x: q.endX, y: q.endY },
            ])
              assert(
                p.x >= b.x + q.radius &&
                  p.x <= b.x + b.width - q.radius &&
                  p.y >= b.y + q.radius &&
                  p.y <= b.y + b.height - q.radius,
                map.id,
              );
            assert(
              c.obstacles.every(
                (o) =>
                  segmentRect(
                    { x: q.originX, y: q.originY },
                    { x: q.endX, y: q.endY },
                    o,
                    q.radius + 1,
                  ) === null,
              ),
              map.id,
            );
            assert(
              (c.hazardCircles ?? []).every(
                (p) =>
                  segmentCircle(
                    { x: q.originX, y: q.originY },
                    { x: q.endX, y: q.endY },
                    p,
                    p.radius + q.radius + 1,
                  ) === null,
              ),
              map.id,
            );
          }
          cases++;
        }
  assert.equal(cases, 432);
  const f = fixture();
  f.c.bounds = { x: 400, y: 300, width: 800, height: 600 };
  f.c.boss = { x: 800, y: 450 };
  const end = bakerRayEnd(f.c, f.c.boss, Math.PI, 1000, 22);
  assert(end.x >= 425);
  assert(Math.abs(end.y - 450) < 1e-9);
});
test("A base-speed Tank can leave each tested aimed landing before release without Sprint, dash, shields or a crust break", () => {
  for (const map of data.arenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "ash-baker",
          difficulty: difficulty.id,
          openingArenaId: map.id,
          arenaSelection: "fixed",
        },
        "Escape",
        "tank",
        "crazed",
      );
      g.start();
      const c = {
        ...(
          g as unknown as { signatureContext(): SignatureContext }
        ).signatureContext(),
        phase: 2,
        variant: "crazed" as const,
        brutal: true,
        damage() {},
      };
      const d = new BakerOven();
      d.cast(c, c.targets[0]);
      const loaves = d
        .cues()
        .filter((q): q is BakerLoaf => q.kind === "service-baker-loaf");
      const start = c.targets[0];
      let escaped = false;
      for (let direction = 0; direction < 32 && !escaped; direction++) {
        const angle = (direction * Math.PI) / 16;
        let p = { x: start.x, y: start.y };
        let safe = true;
        const bounds = c.bounds!;
        for (let tick = 0; tick < 54; tick++) {
          const next = moveBody(
            p,
            {
              x: (Math.cos(angle) * 180) / 30,
              y: (Math.sin(angle) * 180) / 30,
            },
            9,
            c.obstacles,
          );
          next.x = clamp(next.x, bounds.x + 10, bounds.x + bounds.width - 10);
          next.y = clamp(next.y, bounds.y + 10, bounds.y + bounds.height - 10);
          if (
            (c.hazardCircles ?? []).some(
              (pit) => segmentCircle(p, next, pit, pit.radius + 9) !== null,
            )
          ) {
            safe = false;
            break;
          }
          p = next;
        }
        escaped =
          safe &&
          loaves.every(
            (q) =>
              segmentCircle(
                { x: q.originX, y: q.originY },
                { x: q.endX, y: q.endY },
                p,
                q.radius + 11,
              ) === null,
          );
      }
      assert(escaped, map.id + "/" + difficulty.id);
    }
});
test("Stagger cancels visible and queued baking, movement is harmless, snapshots are independent and repeated cycles release hit ownership", () => {
  const f = fixture("crazed", 2);
  f.d.cast(f.c, f.c.targets[0]);
  const copy = f.d.cues();
  copy[0].x = -999;
  assert(f.d.cues()[0].x > 0);
  f.c.paused = true;
  f.step(1);
  assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
  f.c.paused = false;
  f.c.auxiliaryBusy = true;
  f.step(60);
  assert.equal(f.d.cues().length, 0);
  f.c.auxiliaryBusy = false;
  f.d.nextSignatureAt = 1e9;
  const before = { ...f.c.boss };
  f.step(90);
  assert(distance(before, f.c.boss) > 0);
  assert.equal(f.hurt.length, 0);
  for (let cycle = 0; cycle < 60; cycle++) {
    f.d.nextSignatureAt = f.c.tick;
    f.d.cast(f.c, f.c.targets[0]);
    f.c.auxiliaryBusy = true;
    f.step(f.c.tick + 450);
    assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
    f.c.auxiliaryBusy = false;
  }
});
test("Actual Soldier projectiles break a landed crust without transferring damage to the boss; stagger clears the whole batch", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "ash-baker",
      difficulty: "normal",
      openingArenaId: "gatehouse",
    },
    "Projectile",
    "soldier",
    "normal",
  );
  g.start();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  while (!g.director.services.baker.weakPoints().length) g.step();
  const crust = g.director.services.baker.weakPoints()[0],
    bossHealth = g.boss.health;
  p.x = crust.x;
  p.y = crust.y + 65;
  p.oldX = p.x;
  p.oldY = p.y;
  for (
    let i = 1;
    i <= 44 &&
    g.director.services.baker.weakPoints().some((q) => q.id === crust.id);
    i++
  ) {
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: i,
      aim: -Math.PI / 2,
      fire: true,
    });
    g.step();
  }
  assert(
    !g.director.services.baker
      .cues()
      .some((q) => q.kind === "service-baker-crumb" && q.parent === crust.id),
  );
  assert.equal(g.boss.health, bossHealth);
  g.boss.staggerUntil = g.combatTick + 90;
  g.step();
  assert.equal(g.director.services.baker.cues().length, 0);
});
test("Issued Story saves and ending receipts migrate exactly; old modes cannot forge pre-Story campaign records", () => {
  const issued =
      "22f660b0d378316283eb081b458adcc4cd827f7465d9089ed9146ab2ac242c9c",
    g = new Game({
      mode: "story",
      maxPlayers: 1,
      difficulty: "easy",
      runId: "baker-story-migration",
    }, true);
  g.addPlayer("solo", "Reader", "medic");
  const old = g.offlineCheckpoint()!;
  old.contentRevision = issued;
  old.protocolVersion=46;
  assert.deepEqual(Game.restoreOffline(old).storyChoices, []);
  assert.throws(
    () =>
      Game.restoreAuthoritative({
        ...g.authoritativeCheckpoint(),
        contentRevision: issued,
      }),
    /versionMismatch/,
  );
  const m = new Map<string, string>(),
    store = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => {
        m.set(k, v);
      },
    };
  g.start();
  for (let fight = 0; fight < 15; fight++) {
    if (fight) {
      let guard = 0;
      while (g.phase !== "combat") {
 if(g.phase==='storyScene')g.vote('solo',1);
        g.phaseEnds = g.tick;
        g.step();
        assert(++guard < 200);
      }
    }
    g.boss.health = 0;
    g.step();
    recordProfileView(viewOf(g, "solo"), "solo", store);
  }
  const profile = JSON.parse(exportProfile(store));
  profile.contentRevision = issued;
  const parsed = parseProfile(JSON.stringify(profile));
  assert.equal(parsed.contentRevision, CONTENT_REVISION);
  assert.equal(storyProgress(parsed).endings.size, 1);
  assert.equal(loadProfile(store).runs.length, 1);
  store.setItem(
    PRACTICE_RECORDS_KEY,
    JSON.stringify([
      {
        schemaVersion: 1,
        id: "forged-old-story",
        practiceOnly: true,
        verified: false,
        contentRevision:
          "fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b",
        protocol: 45,
        mode: "story",
        difficulty: "normal",
        classId: "soldier",
        completedEncounters: 15,
        accords: 0,
        combatTicks: 0,
        secret: "declined",
        memorial: false,
      },
    ]),
  );
  assert.equal(practiceRecords(store).length, 0);
});

test("Fifteen catalogs expose distinct baking phases, both advanced warnings and recovered Edda Marr lore", () => {
  for (const language of data.locales) {
    const catalog = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    const titles = Array.from(
      { length: 4 },
      (_, i) => catalog["boss.ash-baker.phase." + i],
    );
    assert.equal(new Set(titles).size, 4);
    for (let i = 0; i < 4; i++)
      assert(catalog["boss.ash-baker.phaseHint." + i].length > 20);
    assert(catalog["boss.ash-baker.brutalHelp"].includes("4.3"));
    assert(catalog["boss.ash-baker.crazedHelp"].includes("7.2"));
    assert(catalog["boss.ash-baker.lore"].length > 80);
  }
});
test("Native drawing controller consumes exact loaf/crumb endpoints, resting health and bounded disposable images", async (context) => {
  const { ServicePresentation } = await menuBundle(
    context,
    "src/client/service-presentation.ts",
    { phaser: "export default {};" },
  );
  const calls: { method: string; args: unknown[] }[] = [],
    images: unknown[] = [];
  const chain = () => {
    const value: object = new Proxy(
      {},
      {
        get:
          (_target, key) =>
          (...args: unknown[]) => {
            calls.push({ method: String(key), args });
            return value;
          },
      },
    );
    return value;
  };
  const scene = {
      textures: { exists: () => true },
      add: {
        image: (...args: unknown[]) => {
          images.push(args);
          return chain();
        },
      },
    },
    art = new ServicePresentation(scene),
    h = chain(),
    f = chain(),
    state = fixture();
  state.d.cast(state.c, state.c.targets[0]);
  state.step(108);
  const cues = state.d.cues();
  art.draw(h, f, cues, 108, state.c.bounds, true, true);
  for (const q of cues)
    assert(
      calls.some(
        (c) =>
          c.method === "lineBetween" &&
          JSON.stringify(c.args) === JSON.stringify([q.x, q.y, q.endX, q.endY]),
      ),
    );
  assert.equal(images.length, 3);
  assert(calls.some((c) => c.method === "fillRect"));
  art.draw(h, f, [], 109, state.c.bounds, true, true);
  assert.equal(calls.filter((c) => c.method === "destroy").length, 3);
});

test('First rolling activation never replays survivor motion from its harmless warning',()=>{
 const f=fixture();f.d.cast(f.c,f.c.targets[0]);f.step(53);const p=f.c.targets[0];p.oldX=829;p.x=835;p.oldY=p.y=250;
 f.c.tick=54;f.d.step(f.c);assert.equal(f.hurt.length,0);p.oldX=p.x;p.x=829;f.c.tick=55;f.d.step(f.c);assert.equal(f.hurt.length,1);
});
