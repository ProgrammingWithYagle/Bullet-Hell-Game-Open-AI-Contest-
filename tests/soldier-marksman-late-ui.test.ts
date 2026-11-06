import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import {
  marksmanId as id,
  marksmanIds as ids,
} from "../src/shared/soldier-marksman.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
} from "../src/client/ui/specialization-map.ts";
import {
  soldierBankSamples,
  isSoldierSound,
  playSoldierSound,
} from "../src/client/soldier-sound.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";

async function setup(
  t: any,
  skills: string[] = [],
  mode: "short" | "raid" | "endless" = "short",
) {
  const env = menuEnvironment(t),
    old = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() =>
    old
      ? Object.defineProperty(globalThis, "CSS", old)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const stubs = {
    "assets.ts":
      "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-1':'passing.png','soldier-marksman-1':'bank.png'}};",
    "i18n.ts":
      "const m=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
  };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/soldier-controls.ts", stubs);
  const g = new Game({ mode }),
    late = mode === "endless" ? (g.encounter = 9) : 0,
    p = g.addPlayer("solo", "Mara", "soldier"),
    controls = defaultControls();
  assert.equal(p.totalSp, mode === "endless" ? 27 : mode === "raid" ? 12 : 3);
  for (const item of skills)
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.gamepad.technique1 = 8;
  controls.bindings.technique2 = ["KeyN", "KeyY"];
  controls.gamepad.technique2 = 9;
  const requests: any[] = [],
    player = viewOf(g, p.id).players[0];
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(player, [], true, "normal", undefined, true, controls) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    player,
    (request: any) => requests.push(request),
    [],
    true,
    "normal",
    undefined,
    true,
    controls,
  );
  t.after(() => binding.dispose());
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  return { ...env, shop, guide, g, p, controls, player, requests };
}

test("late tree inspection uses the actual Reload/C context and never buys or equips a new action", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id, ids.pair], "endless");
  f.controls.bindings.reload = ["KeyH", "KeyJ"];
  f.controls.gamepad.reload = 10;
  // Rebind after custom controls so inspection reads the real mutable remapping.
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    for (const skill of [ids.reserve, ids.relay, ids.twin]) {
      f.host.querySelector('[data-inspect="' + skill + '"]')!.click();
      const panel = f.host.querySelector("#item-details")!;
      const action = skill === ids.reserve ? "reload" : "technique1";
      assert(panel.querySelector('[data-technique-control="' + action + '"]'));
      assert.equal(f.requests.length, 0);
      assert(!f.p.skills.includes(skill));
    }
  }
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 21);
  assert.equal(
    soldierActions(viewOf(f.g, f.p.id).players[0], 0).extras.length,
    2,
  );
});
test("the full late route costs20SP with one capstone and keeps five remapped actions plus real Reload guidance", async (t) => {
  const f = await setup(
    t,
    [
      "soldier-ballistics-1",
      id,
      ids.carom,
      ids.pair,
      ids.reserve,
      ids.relay,
      ids.twin,
    ],
    "endless",
  );
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 7);
  f.controls.bindings.reload = ["KeyH", "KeyJ"];
  f.controls.gamepad.reload = 10;
  f.host.innerHTML = f.guide.soldierKitMarkup(
    viewOf(f.g, f.p.id).players[0],
    f.controls,
    false,
  );
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
  const reload = f.host.querySelector("[data-reserve-control]")!;
  for (const word of ["H", "J", "10"])
    assert(reload.textContent.includes(word), word);
  for (const word of ["Held Measure", "Angle Relay", "Twin Lanes"])
    assert(f.host.textContent.includes(word), word);
  assert(!f.host.querySelector('[data-kit-action="reload"]'));
  assert.equal(f.requests.length, 0);
});
test("late HUD uses held proof, actual relay expiry and two-round authority without blocking a one-round B follow-up", async (t) => {
  const f = await setup(
      t,
      ["soldier-ballistics-1", id, ids.pair, ids.reserve, ids.relay, ids.twin],
      "endless",
    ),
    v = viewOf(f.g, f.p.id).players[0];
  // Snapshot contract: actual authority is independently exercised by physical late-operation tests.
  v.ammo = 1;
  v.kit = {
    ...v.kit,
    technique1At: 400,
    technique2At: 500,
    soldierRelayUntil: 130,
    soldierPairUntil: 150,
    soldierPairHeld: true,
    soldierBankAmmunition: 2,
    soldierBankBlocked: true,
    soldierPairBlocked: false,
  };
  const actions = soldierActions(v, 100).extras;
  assert.equal(actions[0].at, 0);
  assert(actions[0].blocked);
  assert(!actions[1].blocked);
  assert.equal(actions[1].at, 0);
  assert(f.guide.soldierHudLabel(v, "technique1", 100).includes("two rounds"));
  assert(
    f.guide
      .soldierHudLabel(v, "technique2", 100)
      .includes("reserved through Reload"),
  );
  v.ammo = 2;
  v.kit.soldierBankBlocked = false;
  assert(!soldierActions(v, 100).extras[0].blocked);
  assert(f.guide.soldierHudLabel(v, "technique1", 100).includes("Twin Lanes"));
  assert.equal(soldierActions(v, 130).extras[0].at, 400);
  assert(!f.guide.soldierHudLabel(v, "technique1", 130).includes("Twin Lanes"));
});
