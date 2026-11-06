import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
  specializationFocus,
} from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { soldierSamples } from "../src/client/soldier-sound.ts";

async function ui(t: any, skills: string[] = [], early = false) {
  const env = menuEnvironment(t),
    original = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (v: string) => v },
  });
  t.after(() =>
    original
      ? Object.defineProperty(globalThis, "CSS", original)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const shop = await menuBundle(t, "src/client/ui/shop.ts", {
    "assets.ts":
      "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-1':'passing.png','soldier-skirmisher-advance-1':'advance.png','soldier-skirmisher-rear-1':'rear.png'}};",
    "i18n.ts":
      "const m=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
  });
  const g = new Game({ mode: "endless" });
  if (!early) g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of skills)
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  const player = viewOf(g, p.id).players[0],
    controls = defaultControls(),
    requests: any[] = [];
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.gamepad.technique1 = 8;
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(player, [], true, "normal", undefined, true, controls) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    player,
    (r: any) => requests.push(r),
    [],
    true,
    "normal",
    undefined,
    true,
    controls,
  );
  t.after(() => binding.dispose());
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  return { ...env, shop, g, p, player, controls, requests };
}

test("Soldier retains its authored Skirmisher fork beside the real Marksman entry", () => {
  const routes = specializationRoutes("soldier");
  assert.deepEqual(
    routes.map((r) => r.id),
    [ids.entry,"soldier-marksman-1","soldier-grenadier-1","soldier-sniper-1"],
  );
  const map = specializationMapLayout("soldier",ids.entry)!;
  assert.equal(map.width, 1000);
  assert.equal(map.nodes.length, 8);
  assert.equal(map.edges.length, 7);
  assert.deepEqual(map.exclusions, [{ a: ids.advance, b: ids.rear }]);
  assert.equal(specializationFocus(map, ids.advance, "ArrowRight"), ids.rear);
  assert.equal(specializationFocus(map, ids.rear, "ArrowUp"), ids.entry);
  assert.equal(
    map.nodes.filter((n) => n.reference)[0].id,
    "soldier-ballistics-1",
  );
  const whole=specializationMapLayout('soldier')!;assert.equal(whole.width,4150);assert.equal(whole.nodes.length,24);assert.equal(whole.edges.length,23);
  assert(whole.exclusions.some(pair=>pair.a===ids.entry&&pair.b==='soldier-marksman-1'));
  assert.equal(specializationMapLayout("medic"), null);
});

test("native map and reading view inspect real controls without buying and hide unimplemented routes", async (t) => {
  const f = await ui(t);
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    f.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
    const details = f.host.querySelector("#item-details")!;
    assert(details.querySelector('[data-technique-control="e"]'));
    const action = details.querySelector(
      '[data-technique-control="technique1"]',
    )!;
    assert(action.textContent.includes("Z"));
    assert(action.textContent.includes("G"));
    assert.equal(
      action.querySelectorAll(".pathway-binding")[1].querySelector("kbd")!
        .textContent,
      "8",
    );
    assert(
      f.host
        .querySelectorAll("img")
        .some((img) => img.getAttribute("src") === "passing.png"),
    );
    assert(!f.host.textContent.includes("Field Logistics"));
    assert(!f.host.textContent.includes("Squad Command"));
    assert(!f.host.textContent.includes("Carriage Sentry"));
    assert.deepEqual(f.host.querySelectorAll('[data-specialization-route]').map(button=>button.getAttribute('data-specialization-route')),['all',ids.entry,'soldier-marksman-1','soldier-grenadier-1','soldier-sniper-1']);
  }
  assert.deepEqual(f.requests, []);
  assert.equal(f.p.skills.length, 0);
  assert.equal(f.player.sp, 27);
});

test("owned Soldier controls reveal only the earned action and preserve fold state through reading redraw", async (t) => {
  for (const fork of [undefined, ids.advance, ids.rear]) {
    const f = await ui(t, [
      "soldier-ballistics-1",
      ids.entry,
      ...(fork ? [fork] : []),
    ]);
    const guide = f.host.querySelector("[data-soldier-kit]")!;
    assert.equal(guide.getAttribute("open"), null);
    assert.equal(guide.querySelectorAll("[data-kit-action]").length, 4);
    const action = guide.querySelector('[data-kit-action="technique1"]')!;
    assert.equal(action.getAttribute("data-skill"), fork ?? ids.entry);
    assert(action.textContent.includes("Z"));
    assert(!guide.querySelector('[data-kit-action="technique2"]'));
    (guide as any).open = true;
    (guide as any).ontoggle?.();
    f.host.querySelector('[data-specialization-mode="list"]')!.click();
    assert.equal(
      (f.host.querySelector("[data-soldier-kit]") as any).open,
      true,
    );
    assert.deepEqual(f.requests, []);
  }
});

test("normal starting SP purchases through native General reference and guarded specialization confirmation", async (t) => {
  const f = await ui(t, [], true);
  f.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
  assert(
    f.host.querySelector("#buy-selected")!.getAttribute("disabled") !== null,
  );
  f.host.querySelector('[data-prerequisite="soldier-ballistics-1"]')!.click();
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].item, "soldier-ballistics-1");
  assert(f.g.transact(f.p.id, { id: "ui-foundation", ...f.requests[0] }).ok);
  f.player.skills.push("soldier-ballistics-1");
  f.player.sp = 2;
  f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  f.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].item, ids.entry);
  assert(f.g.transact(f.p.id, { id: "ui-entry", ...f.requests[1] }).ok);
  assert.equal(f.p.totalSp, 3);
  assert.deepEqual(f.p.skills, ["soldier-ballistics-1", ids.entry]);
});

test("HUD action is owned, has a finite earned window and never invents an action from inspection", () => {
  const g = new Game({ mode: "endless" }),
    p = g.addPlayer("solo", "Mara", "soldier");
  assert.equal(soldierActions(viewOf(g, p.id).players[0], 0).extras.length, 0);
  for (const item of ["soldier-ballistics-1", ids.entry])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.start());
  const view = () => viewOf(g, p.id).players[0];
  assert(soldierActions(view(), 0).extras[0].blocked);
  assert(g.submitInput(p.id, { ...idleInput(), sequence: 1, e: true }));
  g.step();
  assert(!soldierActions(view(), g.combatTick).extras[0].blocked);
  const until = g.kitStatus(p.id).soldierFollowupUntil!;
  while (g.combatTick <= until) g.step();
  assert(soldierActions(view(), g.combatTick).extras[0].blocked);
});

test("original footwork audio is finite and bounded at common native rates", () => {
  for (const rate of [22050, 44100, 48000]) {
    const samples = soldierSamples(rate);
    assert.equal(samples.length, Math.ceil(rate * 0.24));
    assert(samples.every(Number.isFinite));
    assert(Math.max(...samples.map(Math.abs)) < 0.65);
    assert.equal(Math.abs(samples[0]), 0);
    assert.equal(Math.abs(samples.at(-1)!), 0);
    assert(samples.some((n) => Math.abs(n) > 0.1));
  }
});

test(
  "real peers receive owner-only follow-through and paused host exit clears it for a late observer",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const addr = httpServer.address();
    assert(addr && typeof addr === "object");
    const endpoint = "http://127.0.0.1:" + addr.port,
      host = new Session(endpoint),
      ally = new Session(endpoint),
      late = new Session(endpoint),
      wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 6000;
        while (!check()) {
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 10));
        }
      };
    try {
      const options = {
        name: "Mara",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "normal",
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Peer" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      for (const item of ["soldier-ballistics-1", ids.entry]) {
        host.purchase({ kind: "skill", item });
        await wait(
          () => g.players.get(host.id)!.skills.includes(item),
          "normal legal purchase",
        );
      }
      host.start();
      await wait(() => ally.view?.phase === "combat", "combat");
      host.input({ ...idleInput(), sequence: 1, e: true });
      await wait(
        () =>
          !!ally.view?.players.find((p) => p.id === host.id)?.kit
            .soldierFollowupUntil,
        "public earned opening",
      );
      assert.equal(
        ally.view!.players.find((p) => p.id === ally.id)!.kit
          .soldierFollowupUntil,
        0,
      );
      host.input({
        ...idleInput(),
        sequence: 2,
        technique1: true,
        moveX: 1,
        aim: 0,
      });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-step" && c.owner === host.id,
          ),
        "owned public motion",
      );
      const publicCue = ally.view!.classCues.find(
        (c) => c.kind === "soldier-step" && c.owner === host.id,
      )!;
      assert(!("damage" in publicCue));
      assert(!("middleFired" in publicCue));
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "paused authority");
      const paused = g.combatTick;
      ally.room!.send("endMatch");
      await new Promise((r) => setTimeout(r, 75));
      assert.equal(g.phase, "combat");
      assert.equal(g.combatTick, paused);
      await late.connect(
        { ...options, name: "Observer", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(() => !!late.view?.matchPaused, "late paused view");
      assert.equal(
        late.view!.players.find((p) => p.id === late.id)!.skills.length,
        0,
      );
      assert(
        late.view!.players.find((p) => p.id === host.id)!.kit
          .soldierStepUntil! > late.view!.combatTick,
      );
      assert(
        late.view!.classCues.some(
          (c) => c.kind === "soldier-step" && c.owner === host.id,
        ),
      );
      host.endMatch();
      await wait(
        () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
        "paused host end",
      );
      for (const peer of [host, ally, late]) {
        assert(!peer.view!.classCues.some((c) => c.kind === "soldier-step"));
        assert.equal(
          peer.view!.players.find((p) => p.id === host.id)!.kit
            .soldierFollowupUntil,
          0,
        );
      }
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
