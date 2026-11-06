import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { grenadierIds as ids } from "../src/shared/soldier-grenadier.ts";
const id = ids.entry;
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
      "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-1':'passing.png','soldier-marksman-1':'bank.png','soldier-grenadier-1':'grenade.png'}};",
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

test("fresh Short inspects both Grenadier views without buying, then makes the two real affordable purchases", async (t) => {
  const f = await setup(t, [], "short");
  assert.equal(f.player.sp, 3);
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    for (const item of Object.values(ids)) {
      f.host.querySelector('[data-inspect="' + item + '"]')!.click();
      assert(f.host.querySelector("#item-details [data-technique-control]"));
      assert.equal(f.requests.length, 0);
      assert(!f.p.skills.includes(item));
    }
  }
  f.host.querySelector('[data-inspect="' + id + '"]')!.click();
  f.host.querySelector('[data-prerequisite="soldier-ballistics-1"]')!.click();
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.length, 1);
  assert(f.g.transact(f.p.id, { id: "ui-general", ...f.requests[0] }).ok);
  f.binding.dispose();
  const actual = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML =
    '<div class="loadout-editor">' +
    f.shop.shopMarkup(actual, [], true, "normal", undefined, true, f.controls) +
    "</div>";
  const bound = f.shop.bindShop(
    f.host,
    actual,
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
  assert.equal(f.requests.length, 2);
  assert(f.g.transact(f.p.id, { id: "ui-canister", ...f.requests[1] }).ok);
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 0);
  assert(
    !f.g.transact(f.p.id, { id: "early", kind: "skill", item: ids.pitch }).ok,
  );
});
test("owned Grenadier guide keeps actual remapped actions, contextual Reload and a coherent selected emblem", async (t) => {
  const f = await setup(
    t,
    [
      "soldier-ballistics-1",
      id,
      ids.skim,
      ids.pitch,
      ids.pin,
      ids.kick,
      ids.return,
    ],
    "endless",
  );
  assert.equal(f.player.sp, 7);
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "grenade.png",
  );
  f.controls.bindings.reload = ["KeyH", "KeyJ"];
  f.controls.gamepad.reload = 10;
  const v = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML = f.guide.soldierKitMarkup(v, f.controls, false);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
  for (const [a, words] of [
    ["technique1", ["Cooked Canister", "Z", "G", "8"]],
    ["technique2", ["Underhand Cast", "N", "Y", "9"]],
  ] as const) {
    const row = f.host.querySelector('[data-kit-action="' + a + '"]')!;
    for (const word of words) assert(row.textContent.includes(word));
  }
  const reload = f.host.querySelector("[data-grenadier-pin-control]")!;
  for (const word of ["Re-pin Drill", "H", "J", "10"])
    assert(reload.textContent.includes(word));
  assert(!f.host.querySelector('[data-kit-action="reload"]'));
  assert.equal(f.requests.length, 0);
});
test("Grenadier authored graph preserves two exclusive choices, optional late branches and real high-grade costs", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id, ids.pitch], "raid");
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    for (const item of [ids.pin, ids.sling, ids.kick, ids.return]) {
      f.host.querySelector('[data-inspect="' + item + '"]')!.click();
      assert(f.host.querySelector("#buy-selected")!.disabled);
      assert.equal(f.requests.length, 0);
    }
  }
  const map = specializationMapLayout("soldier", id)!;
  assert.equal(map.nodes.length, 9);
  assert.equal(map.edges.length, 8);
  assert.deepEqual(map.exclusions, [
    { a: ids.skim, b: ids.contact },
    { a: ids.pin, b: ids.sling },
  ]);
  assert(map.edges.some((e) => e.from === ids.pitch && e.to === ids.kick));
  assert(!map.edges.some((e) => e.from === ids.pin && e.to === ids.kick));
  assert.equal(specializationRoutes("soldier").length, 4);
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 6);
});
test("HUD labels use real finite fuse, pinned and ground-handling authority without requiring magazine ammunition", async (t) => {
  const f = await setup(
    t,
    ["soldier-ballistics-1", id, ids.pitch, ids.pin, ids.kick, ids.return],
    "endless",
  );
  assert(f.g.start());
  let n = 0;
  const step = (input: object = {}) => {
    f.g.submitInput(f.p.id, {
      ...idleInput(),
      sequence: ++n,
      aim: 0,
      ...input,
    });
    f.g.step();
  };
  f.p.ammo = 0;
  let v = viewOf(f.g, f.p.id).players[0];
  assert(!soldierActions(v, 0).extras[0].blocked);
  step({ technique1: true });
  v = viewOf(f.g, f.p.id).players[0];
  assert(
    f.guide.soldierHudLabel(v, "technique1", f.g.combatTick).includes("fuse"),
  );
  assert.equal(soldierActions(v, f.g.combatTick).extras[0].at, 0);
  step({ reload: true });
  v = viewOf(f.g, f.p.id).players[0];
  assert(
    f.guide.soldierHudLabel(v, "technique1", f.g.combatTick).includes("pocket"),
  );
  assert(
    soldierActions(v, f.g.combatTick).extras[1].blocked,
    "a secured pocket is not a short cast",
  );
});
