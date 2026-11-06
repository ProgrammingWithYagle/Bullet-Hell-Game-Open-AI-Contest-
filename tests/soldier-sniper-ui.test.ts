import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { sniperId as id } from "../src/shared/soldier-sniper.ts";
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
      "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-1':'passing.png','soldier-marksman-1':'bank.png','soldier-grenadier-1':'grenade.png','soldier-sniper-1':'sniper.png'}};",
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
  return { ...env, shop, guide, g, p, controls, player, requests, binding };
}

test("ordinary Short inspects real Sniper controls in both views, then performs its two actual affordable purchases", async (t) => {
  const f = await setup(t, [], "short");
  assert.equal(f.player.sp, 3);
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    f.host.querySelector('[data-inspect="' + id + '"]')!.click();
    const controls = f.host.querySelector(
      '#item-details [data-technique-control="technique1"]',
    )!;
    for (const label of ["Z", "G", "8"])
      assert(controls.textContent.includes(label));
    assert.equal(f.requests.length, 0);
    assert(!f.p.skills.includes(id));
  }
  f.host.querySelector('[data-prerequisite="soldier-ballistics-1"]')!.click();
  f.host.querySelector("#buy-selected")!.click();
  assert(
    f.g.transact(f.p.id, { id: "sniper-ui-general", ...f.requests[0] }).ok,
  );
  f.binding.dispose();
  const current = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML =
    '<div class="loadout-editor">' +
    f.shop.shopMarkup(
      current,
      [],
      true,
      "normal",
      undefined,
      true,
      f.controls,
    ) +
    "</div>";
  const bound = f.shop.bindShop(
    f.host,
    current,
    (r: any) => f.requests.push(r),
    [],
    true,
    "normal",
    undefined,
    true,
    f.controls,
  );
  t.after(() => bound.dispose());
  f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  f.host.querySelector('[data-inspect="' + id + '"]')!.click();
  assert(!f.host.querySelector("#buy-selected")!.disabled);
  f.host.querySelector("#buy-selected")!.click();
  assert(
    f.g.transact(f.p.id, { id: "sniper-ui-settled", ...f.requests[1] }).ok,
  );
  assert.equal(f.requests.length, 2);
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 0);
});
test("owned Sniper guide shows only its actual remapped action alongside the issued kit and selected equipment", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id]);
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "sniper.png",
  );
  const p = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML = f.guide.soldierKitMarkup(p, f.controls, false);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 4);
  const action = f.host.querySelector('[data-kit-action="technique1"]')!;
  for (const text of ["Settled Shot", "Z", "G", "8"])
    assert(action.textContent.includes(text));
  assert(!f.host.querySelector('[data-kit-action="technique2"]'));
  assert(!f.host.querySelector('[data-kit-action="reload"]'));
  assert.equal(specializationRoutes("soldier").length, 4);
  const map = specializationMapLayout("soldier", id)!;
  assert.equal(map.nodes.length, 5);
  assert.equal(map.edges.length, 4);
  assert.equal(f.requests.length, 0);
});
test("Sniper HUD distinguishes settling and manual release and does not require a second round after reservation", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id]);
  assert(f.g.start());
  f.p.ammo = 1;
  let sequence = 0;
  const step = (input: object = {}) => {
    assert(
      f.g.submitInput(f.p.id, {
        ...idleInput(),
        sequence: ++sequence,
        ...input,
      }),
    );
    f.g.step();
  };
  step({ technique1: true });
  let p = viewOf(f.g, f.p.id).players[0];
  assert.equal(p.ammo, 0);
  assert(
    f.guide.soldierHudLabel(p, "technique1", f.g.combatTick).includes("settle"),
  );
  assert(soldierActions(p, f.g.combatTick).extras[0].blocked);
  while (f.g.combatTick < p.kit.sniperReadyAt!) {
    step();
  }
  p = viewOf(f.g, f.p.id).players[0];
  assert(
    f.guide.soldierHudLabel(p, "technique1", f.g.combatTick).includes("fire"),
  );
  assert(!soldierActions(p, f.g.combatTick).extras[0].blocked);
  step({ technique1: true });
  assert(!f.g.kitStatus(f.p.id).sniperPrepared);
  assert.equal(f.p.ammo, 0);
});
