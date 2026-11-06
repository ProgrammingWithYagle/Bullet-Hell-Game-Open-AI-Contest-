import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data } from "../src/shared/game.ts";
import { builderIds as ids } from "../src/shared/engineer-builder.ts";
import {
  idleInput,
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { BOSS_DEFEAT_TICKS } from "../src/shared/boss-defeat-flow.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { practiceRecords } from "../src/client/progress.ts";
import {
  specializationMapLayout,
  specializationMapMarkup,
  specializationRoutes,
  specializationFocus,
} from "../src/client/ui/specialization-map.ts";
import { mapZoomScroll } from "../src/client/ui/skill-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
const previous =
  "2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea";
const full = [
  ids.longspan,
  ids.hinge,
  ids.repair,
  ids.linked,
  ids.survey,
  ids.redoubt,
];
const wait = async (check: () => boolean, label: string) => {
  const until = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < until, label);
    await new Promise((r) => setTimeout(r, 12));
  }
};
const buy = (g: Game, id: string, item: string) =>
  assert(g.transact(id, { id: item, kind: "skill", item }).ok, item);

test("Normal Free Play rewards develop Builder through separate geometry, work and redoubt stages without giving away late actions", () => {
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("solo", "Tamsin", "engineer"),
    purchases: { id: string; earned: number }[] = [];
  const purchase = (id: string) => {
    buy(g, p.id, id);
    purchases.push({ id, earned: p.totalSp });
  };
  purchase("engineer-constructs-1");
  purchase(ids.entry);
  g.start();
  const plan = [
    [ids.longspan, 5],
    [ids.hinge, 8],
    [ids.repair, 11],
    [ids.linked, 15],
    [ids.survey, 17],
    [ids.redoubt, 27],
  ] as const;
  for (let stage = 0; stage < 9; stage++) {
    assert.equal(String(g.phase), "combat");
    p.invulnerableUntil = 1e9;
    g.boss.health = 0;
    g.step();
    let transitions = 0;
    while (String(g.phase) !== "shop") {
      assert(++transitions < BOSS_DEFEAT_TICKS + 10);
      g.phaseEnds = g.tick;
      g.step();
    }
    assert(!g.classCues().some((c) => c.kind === "wall" && c.builder));
    for (const [id, earned] of plan)
      if (p.totalSp >= earned && !p.skills.includes(id)) purchase(id);
    if (stage < 8)
      while (String(g.phase) !== "combat") {
        g.phaseEnds = g.tick;
        g.step();
      }
  }
  assert.deepEqual(
    purchases.slice(2).map((s) => s.id),
    plan.map(([id]) => id),
  );
  assert.deepEqual(
    purchases.slice(2).map((s) => s.earned),
    [5, 8, 11, 16, 19, 27],
  );
  assert.equal(p.totalSp, 27);
  assert.equal(viewOf(g, p.id).players[0].sp, 5);
  purchase("general-sprint");
  purchase("general-brake-step");
  assert.equal(viewOf(g, p.id).players[0].sp, 0);
});

test("Protocol-53 local boundaries preserve all twelve identities, all four General choices, equipment and exact owned spending; online ownership stays strict", () => {
  for (const classId of implementedClassIds) {
    const g = new Game({ mode: "endless", seed: 9 });
    g.encounter = 9;
    const p = g.addPlayer("p", classId, classId);
    p.coins = 12000;
    for (const id of [
      "general-sprint",
      "general-double-dash",
      "general-brake-step",
      "general-course-correction",
    ])
      buy(g, p.id, id);
    assert(
      g.transact(p.id, { id: "weapon", kind: "weapon", item: classId + "-3" })
        .ok,
    );
    assert(
      g.transact(p.id, { id: "upgrade", kind: "upgrade", item: "damage" }).ok,
    );
    const old = structuredClone(g.offlineCheckpoint()!);
    old.contentRevision = previous;
    old.protocolVersion = 53;
    const restored = Game.restoreOffline(old);
    assert.deepEqual(restored.offlineCheckpoint()!.player, {
      ...old.player,
      id: "solo",
    });
    assert.equal(restored.players.get("solo")!.classId, classId);
    assert.equal(restored.offlineCheckpoint()!.protocolVersion, PROTOCOL);
    const forged = structuredClone(old);
    forged.player.skills.push(ids.entry);
    assert.throws(() => Game.restoreOffline(forged));
    const online = g.authoritativeCheckpoint()!;
    online.contentRevision = previous;
    online.protocolVersion = 53;
    assert.throws(() => Game.restoreAuthoritative(online));
    const campaign = new Game({ mode: "story" }),
      lead = campaign.addPlayer("p", classId, classId),
      save = structuredClone(campaign.offlineCheckpoint()!);
    save.contentRevision = previous;
    save.protocolVersion = 53;
    const copy = Game.restoreOffline(save);
    assert.deepEqual(copy.trainingFor("solo"), campaign.trainingFor(lead.id));
    assert.equal(copy.players.get("solo")!.totalSp, 0);
    assert.deepEqual(copy.offlineCheckpoint()!.chapter, save.chapter);
    for (const item of Object.values(ids))
      assert.equal(
        campaign.transact(lead.id, { id: item, kind: "skill", item }).reason,
        "storyLearningRequired",
      );
  }
});

test("Issued fourteen-technique ownership migrates exactly, while protocol51/52/53 cannot invent Builder and current55 rejects conflicting paths", () => {
  const seen = new Set<string>();
  for (const route of [
    [
      "engineer-machinery-1",
      "engineer-machinery-anchor-1",
      "engineer-machinery-coil-1",
      "engineer-machinery-prism-1",
      "engineer-machinery-salvage-1",
      "engineer-machinery-convergence-1",
    ],
    ["engineer-machinery-1", "engineer-machinery-survey-1"],
    [
      "engineer-traps-1",
      "engineer-traps-wire-1",
      "engineer-traps-key-1",
      "engineer-traps-casings-1",
      "engineer-traps-haul-1",
      "engineer-traps-corridor-1",
    ],
    ["engineer-traps-1", "engineer-traps-switch-1"],
  ]) {
    const g = new Game();
    g.encounter = 9;
    const p = g.addPlayer("p", "Tamsin", "engineer");
    for (const item of ["engineer-constructs-1", ...route]) buy(g, p.id, item);
    route.forEach((id) => seen.add(id));
    const save = structuredClone(g.offlineCheckpoint()!);
    save.contentRevision = previous;
    save.protocolVersion = 53;
    assert.deepEqual(
      Game.restoreOffline(save).players.get("solo")!.skills,
      p.skills,
    );
    for (const [revision, protocol] of [
      [previous, 53],
      ["1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186", 52],
      ["9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f", 51],
    ] as const) {
      const bad = structuredClone(save);
      bad.contentRevision = revision;
      bad.protocolVersion = protocol;
      bad.player.skills.push(ids.entry);
      assert.throws(() => Game.restoreOffline(bad));
    }
  }
  assert.equal(seen.size, 14);
  const g = new Game();
  g.encounter = 9;
  const p = g.addPlayer("p", "Tamsin", "engineer");
  for (const item of ["engineer-constructs-1", ids.entry, ...full])
    buy(g, p.id, item);
  const save = g.offlineCheckpoint()!,
    copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.classCues().length, 0);
  for (const extra of ["engineer-traps-1", "engineer-machinery-1", ids.wings]) {
    const bad = structuredClone(save);
    bad.player.skills.push(extra);
    assert.throws(() => Game.restoreOffline(bad));
  }
  assert.equal(PROTOCOL,63);
  assert.equal(save.contentRevision, CONTENT_REVISION);
});

test("Protocol-53 profiles retain both HUD preferences and remapped technique controls, and historical clears remain practice-only", () => {
  for (const layout of ["grouped", "separate"] as const) {
    const p = freshProfile();
    p.contentRevision = previous;
    p.settings.combatLayout = layout;
    p.controls.bindings.technique1 = ["KeyZ"];
    p.controls.bindings.technique2 = ["KeyN"];
    const copy = parseProfile(JSON.stringify(p));
    assert.equal(copy.contentRevision, CONTENT_REVISION);
    assert.equal(copy.settings.combatLayout, layout);
    assert.deepEqual(copy.controls, p.controls);
  }
  const records = implementedClassIds.map((classId) => ({
    schemaVersion: 1,
    id: classId,
    practiceOnly: true,
    verified: false,
    contentRevision: previous,
    protocol: 53,
    mode: "story",
    difficulty: "normal",
    classId,
    completedEncounters: data.modes.find((m) => m.id === "story")!.encounters,
    accords: 0,
    combatTicks: 120,
    secret: "locked",
    memorial: false,
  }));
  const found = practiceRecords({
    getItem: () =>
      JSON.stringify([
        ...records,
        { ...records[0], id: "future-forgery", protocol: 54 },
      ]),
    setItem() {
      throw Error("Read only");
    },
  });
  assert.deepEqual(found, records);
});

test("Builder has a distinct authored route, correct exclusions and all three closer views preserve real prerequisite edges", () => {
  assert.equal(specializationRoutes("engineer").length, 3);
  const all = specializationMapLayout("engineer")!;
  assert.equal(all.nodes.length, 23);
  for (const route of specializationRoutes("engineer")) {
    const map = specializationMapLayout("engineer", route.id)!;
    assert.equal(map.width, 1000);
    assert.equal(map.nodes.filter((n) => n.reference).length, 1);
    assert.deepEqual(
      map.nodes.filter((n) => !n.reference).map((n) => n.id),
      data.specializationSkills
        .filter((s) => s.subbranchId === route.id)
        .map((s) => s.id),
    );
    assert(
      map.edges.every(
        (e) =>
          map.nodes.some((n) => n.id === e.from) &&
          map.nodes.some((n) => n.id === e.to),
      ),
    );
  }
  const map = specializationMapLayout("engineer", ids.entry)!;
  assert.equal(map.nodes.length, 9);
  assert.equal(specializationFocus(map, ids.longspan, "ArrowRight"), ids.wings);
  assert.equal(specializationFocus(map, ids.survey, "ArrowUp"), ids.hinge);
  assert.equal(specializationFocus(map, ids.redoubt, "ArrowUp"), ids.linked);
  assert.equal(
    mapZoomScroll(80, 400, 0.2, 0.4, 0.2),
    360,
    "Zoom retains the same world centre even below the General minimum",
  );
});

test("Authored prerequisite curves leave unrelated emblem and caption regions clear in the overview and every closer route", () => {
  for (const route of [
    "all",
    ...specializationRoutes("engineer").map((r) => r.id),
  ]) {
    const map = specializationMapLayout("engineer", route)!,
      html = specializationMapMarkup(
        map,
        [],
        (id) => "<button>" + id + "</button>",
      );
    for (const [, from, to, path] of html.matchAll(
      /<path class="[^"]+" data-from="([^"]+)" data-to="([^"]+)" d="([^"]+)"/g,
    )) {
      const tokens = path.match(/[MLC]|-?\d+(?:\.\d+)?/g)!;
      let at = 0,
        current = { x: 0, y: 0 };
      const points: { x: number; y: number }[] = [];
      while (at < tokens.length) {
        const command = tokens[at++];
        if (command === "M") {
          current = { x: Number(tokens[at++]), y: Number(tokens[at++]) };
          continue;
        }
        const count = command === "C" ? 6 : 2,
          values = tokens.slice(at, at + count).map(Number);
        at += count;
        const start = current;
        for (let i = 1; i <= 200; i++) {
          const t = i / 200,
            u = 1 - t;
          points.push(
            command === "C"
              ? {
                  x:
                    u ** 3 * start.x +
                    3 * u * u * t * values[0] +
                    3 * u * t * t * values[2] +
                    t ** 3 * values[4],
                  y:
                    u ** 3 * start.y +
                    3 * u * u * t * values[1] +
                    3 * u * t * t * values[3] +
                    t ** 3 * values[5],
                }
              : {
                  x: start.x + (values[0] - start.x) * t,
                  y: start.y + (values[1] - start.y) * t,
                },
          );
        }
        current = points.at(-1)!;
      }
      for (const node of map.nodes.filter((n) => n.id !== from && n.id !== to))
        assert(
          !points.some(
            (p) =>
              Math.abs(p.x - node.x) < (node.reference ? 105 : 94) &&
              p.y > node.y - (node.reference ? 38 : 66) &&
              p.y < node.y + (node.reference ? 38 : 92),
          ),
          route + ": " + from + " → " + to + " crosses " + node.id,
        );
    }
  }
});

test("Both loadout sizes inspect Builder, follow its General prerequisite, purchase the early identity once and retain all eight choices in reading view", async (t) => {
  const env = menuEnvironment(t),
    messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const original = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() =>
    original
      ? Object.defineProperty(globalThis, "CSS", original)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const shop = await menuBundle(t, "src/client/ui/shop.ts", {
    "assets.ts": "export const assets={upgrades:{},items:{},resourceIcons:{}};",
    "i18n.ts":
      "const messages=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),messages[key]??key);',
  });
  for (const expanded of [false, true]) {
    const g = new Game(),
      p = g.addPlayer("p", "Tamsin", "engineer"),
      v = viewOf(g, p.id).players[0],
      requests: any[] = [];
    env.host.innerHTML =
      '<div class="loadout-editor">' +
      shop.shopMarkup(v, [], expanded) +
      "</div>";
    const binding = shop.bindShop(
      env.host,
      v,
      (r: any) => {
        assert(g.transact(p.id, { id: "buy-" + requests.length, ...r }).ok);
        requests.push(r);
        Object.assign(v, viewOf(g, p.id).players[0]);
      },
      [],
      expanded,
    );
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    assert.equal(env.host.querySelectorAll("[data-inspect]").length, 22);
    env.host
      .querySelector('[data-specialization-route="' + ids.entry + '"]')!
      .click();
    assert.equal(env.host.querySelectorAll("[data-inspect]").length, 8);
    assert(!env.host.querySelector('[data-inspect="engineer-traps-1"]'));
    env.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
    assert(env.host.querySelector("#buy-selected")!.disabled);
    assert.equal(requests.length, 0);
    env.host.querySelector(".pathway-foundation")!.click();
    env.host.querySelector("#buy-selected")!.click();
    assert.deepEqual(requests, [
      { kind: "skill", item: "engineer-constructs-1" },
    ]);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
    env.host.querySelector("#buy-selected")!.click();
    assert.equal(requests.length, 2);
    assert.equal(v.sp, 0);
    env.host.querySelector('[data-specialization-mode="list"]')!.click();
    assert.equal(env.host.querySelectorAll("[data-inspect]").length, 8);
    assert(env.host.querySelector(".reading-view"));
    assert(env.host.querySelector(".pathway-slot")!.textContent.includes("Q"));
    env.host.querySelector('[data-inspect="' + ids.repair + '"]')!.click();
    assert(env.host.querySelector("#buy-selected")!.disabled);
    assert(
      env.host
        .querySelector("#item-details")!
        .textContent.includes("stationary") ||
        env.host.querySelector("#item-details")!.textContent.includes("Remain"),
    );
    env.host.querySelector('[data-specialization-route="all"]')!.click();
    assert.equal(env.host.querySelectorAll("[data-inspect]").length, 22);
    assert.equal(requests.length, 2);
    binding.dispose();
  }
});

test(
  "Real peers receive owned screen groups, committed repairs and delayed redoubts; late observers see the paused work without acquiring it",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const host = new Session("http://127.0.0.1:" + address.port),
      ally = new Session("http://127.0.0.1:" + address.port),
      late = new Session("http://127.0.0.1:" + address.port);
    try {
      const options = {
        name: "Tamsin",
        classId: "engineer" as const,
        mode: "endless" as const,
        difficulty: "normal",
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Other builder" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      // Isolated late-run fixture. Purchases, inputs and replication cross the real server.
      g.encounter = 9;
      for (const p of g.players.values()) p.totalSp = 27;
      for (const [peer, skills] of [
        [host, full],
        [ally, [ids.wings, ids.repair, ids.linked]],
      ] as const)
        for (const item of ["engineer-constructs-1", ids.entry, ...skills]) {
          peer.purchase({ kind: "skill", item });
          await wait(() => g.players.get(peer.id)!.skills.includes(item), item);
        }
      host.start();
      await wait(() => ally.view?.phase === "combat", "combat");
      g.obstacles.splice(0);
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.x = 1250;
      g.boss.y = 200;
      g.boss.health = g.boss.maxHealth = 1e6;
      const hp = g.players.get(host.id)!,
        ap = g.players.get(ally.id)!;
      hp.x = hp.oldX = 680;
      hp.y = hp.oldY = 600;
      ap.x = ap.oldX = 1000;
      ap.y = ap.oldY = 750;
      hp.invulnerableUntil = ap.invulnerableUntil = 1e9;
      host.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
      ally.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
      await wait(
        () =>
          g.classCues().filter((c) => c.kind === "wall" && c.builder).length ===
          3,
        "three owned panels",
      ).catch((error) =>
        assert.fail(
          JSON.stringify({
            error: String(error),
            arena: g.arena.id,
            phase: g.phase,
            players: [...g.players.values()].map((p) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              aim: p.aim,
              ack: p.ack,
              qAt: p.qAt,
              status: p.status,
              skills: p.skills,
            })),
            cues: g.classCues(),
          }),
        ),
      );
      await wait(
        () => g.classKits.constructs().filter((c) => c.builder).length === 3,
        "assembled cover",
      );
      host.input({
        ...idleInput(),
        sequence: 2,
        aim: Math.PI / 2,
        technique1: true,
      });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "engineer-builder-plan" && c.owner === host.id,
          ),
        "replicated folding",
      );
      await wait(
        () => !g.classCues().some((c) => c.kind === "engineer-builder-plan"),
        "rebraced work",
      );
      const wall = g.classKits
        .constructs()
        .find((c) => c.builder && c.owner === host.id)!;
      g.classKits.hitConstruct(wall.id, 70);
      const damaged = wall.health;
      host.input({ ...idleInput(), sequence: 3, aim: 0, technique2: true });
      await wait(
        () =>
          !!ally.view?.players.find((p) => p.id === host.id)?.kit
            .builderRepairUntil,
        "replicated repair",
      );
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "paused");
      const tick = g.combatTick,
        until = g.kitStatus(host.id).builderRepairUntil,
        allyAt = g.kitStatus(ally.id).technique2At;
      ally.input({ ...idleInput(), sequence: 2, technique2: true });
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(g.combatTick, tick);
      assert.equal(wall.health, damaged);
      await late.connect(
        { ...options, name: "Late observer", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(
        () =>
          !!late.view?.matchPaused &&
          !!late.view.players.find((p) => p.id === host.id)?.kit
            .builderRepairUntil,
        "late work view",
      );
      assert.equal(
        late.view!.players.find((p) => p.id === host.id)!.kit
          .builderRepairUntil,
        until,
      );
      assert(!late.view!.players.find((p) => p.id === late.id)!.skills.length);
      host.setMatchPaused(false);
      await wait(() => wall.health > damaged, "actual repair");
      assert.equal(
        g.kitStatus(ally.id).technique2At,
        allyAt,
        "Paused input is discarded",
      );
      host.input({ ...idleInput(), sequence: 4, aim: 0, ultimate: true });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) =>
              c.kind === "wall" &&
              c.owner === host.id &&
              c.linkedSiege !== undefined,
          ),
        "replicated redoubt",
      );
      assert.equal(
        ally.view!.players.find((p) => p.id === host.id)!.kit.builderGroups,
        1,
      );
      assert.equal(
        ally.view!.players.find((p) => p.id === ally.id)!.kit.builderGroups,
        1,
      );
      for (const cue of late.view!.classCues)
        for (const key of [
          "members",
          "repairs",
          "groups",
          "damage",
          "fireAt",
          "interval",
        ])
          assert(!Object.hasOwn(cue, key));
      hp.connected = false;
      await wait(
        () =>
          !g
            .classCues()
            .some((c) => c.kind === "wall" && c.builder && c.owner === host.id),
        "owner loss cleanup",
      );
      assert(
        g
          .classCues()
          .some((c) => c.kind === "wall" && c.builder && c.owner === ally.id),
      );
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
