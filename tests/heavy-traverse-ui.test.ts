import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { traverseIds as ids } from "../src/shared/heavy-traverse.ts";
import { heavyActions } from "../src/client/heavy-actions.ts";
import {
  defaultControls,
  validControls,
} from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
} from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
async function setup(t: any, mode: "short" | "raid" = "short") {
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
  const messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages,
    stubs = {
      "assets.ts":
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'heavy-traverse-1':'flak.png','heavy-traverse-spade-1':'compact.png','heavy-traverse-floating-1':'frontal.png','heavy-flak-command-1':'command.png'}};",
      "i18n.ts":
        "const m=" +
        JSON.stringify(messages) +
        ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
    };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/heavy-controls.ts", stubs),
    g = new Game({ mode }),
    p = g.addPlayer("solo", "Hux", "heavy"),
    controls = defaultControls(),
    requests: any[] = [],
    results: any[] = [];
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.bindings.technique2 = ["KeyN", "KeyY"];
  controls.gamepad.technique1 = 8;
  controls.gamepad.technique2 = 9;
  assert(validControls(controls));
  let binding: any;
  const player = () => viewOf(g, p.id).players[0],
    render = () => {
      binding?.dispose();
      const current = player();
      env.host.innerHTML =
        '<div class="loadout-editor">' +
        shop.shopMarkup(
          current,
          [],
          true,
          "normal",
          undefined,
          true,
          controls,
        ) +
        "</div>";
      binding = shop.bindShop(
        env.host,
        current,
        (request: any) => {
          requests.push(request);
          results.push(
            g.transact(p.id, { ...request, id: "heavy-ui-" + requests.length }),
          );
        },
        [],
        true,
        "normal",
        undefined,
        true,
        controls,
      );
      env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    };
  t.after(() => binding?.dispose());
  render();
  const inspect = (id: string) =>
      env.host.querySelector('[data-inspect="' + id + '"]')!.click(),
    buy = (id: string) => {
      inspect(id);
      assert(!env.host.querySelector("#buy-selected")!.disabled, id);
      env.host.querySelector("#buy-selected")!.click();
      assert(results.at(-1).ok, id + ":" + results.at(-1).reason);
      render();
    },
    foundation = () => {
      inspect(ids.entry);
      env.host.querySelector('[data-prerequisite="heavy-ordnance-1"]')!.click();
      assert(!env.host.querySelector("#buy-selected")!.disabled);
      env.host.querySelector("#buy-selected")!.click();
      assert(results.at(-1).ok);
      render();
    };
  return {
    ...env,
    shop,
    guide,
    g,
    p,
    controls,
    requests,
    results,
    player,
    render,
    inspect,
    buy,
    foundation,
  };
}
test("Siege Gunner shows exactly its real entry/fork/acquired operation with one shared General reference in the three-route Heavy tree", () => {
  const map = specializationMapLayout("heavy", ids.entry)!;
  assert.equal(map.nodes.length, 8);
  assert.equal(map.edges.length, 7);
  assert.equal(map.exclusions.length, 2);
  assert.deepEqual(
    new Set(map.nodes.map((n) => n.id)),
    new Set(["heavy-ordnance-1", ids.entry, ids.spade, ids.floating,"heavy-traverse-clutch-1","heavy-traverse-keyed-1","heavy-traverse-open-1","heavy-traverse-lanyard-1"]),
  );
  const all = specializationMapLayout("heavy")!;
  assert.equal(all.nodes.length, 18);
  assert.equal(all.exclusions.length, 8);
  assert.deepEqual(specializationRoutes("heavy").map(route=>route.id), ["heavy-flak-1", ids.entry, "heavy-linework-1"]);
});
test("actual source MenuDOM makes exactly two affordable Short3 purchases and exposes four independently remapped owned rows", async (t) => {
  const f = await setup(t);
  assert.equal(f.player().sp, 3);
  f.inspect(ids.entry);
  assert.equal(f.requests.length, 0);
  f.foundation();
  f.buy(ids.entry);
  assert.equal(f.requests.length, 2);
  assert.equal(f.player().sp, 0);
  assert.deepEqual(f.p.skills, ["heavy-ordnance-1", ids.entry]);
  f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 4);
  const c = f.host.querySelector('[data-kit-action="technique1"]')!;
  for (const text of ["Traverse Stroke / Release Feed", "Z", "G", "8"])
    assert(c.textContent.includes(text));
  assert(!f.host.querySelector('[data-kit-action="technique2"]'));
  assert.equal(f.controls.bindings.e[0], "KeyE");
  assert(!f.host.textContent.includes("defensive flak shell"));
});
test("first-clear9 budget admits either real fitting while the opposite fitting and Flak entry reject without spending", async (t) => {
  for (const fitting of [ids.spade, ids.floating]) {
    const f = await setup(t);
    f.foundation();
    f.buy(ids.entry);
    f.inspect(fitting);
    assert(f.host.querySelector("#buy-selected")!.disabled);
    assert.equal(f.requests.length, 2);
    f.p.totalSp = 9;
    f.render();
    f.buy(fitting);
    assert.equal(f.player().sp, 4);
    const before = f.player().sp;
    const other = fitting === ids.spade ? ids.floating : ids.spade;
    for (const item of [other, "heavy-flak-1"]) {
      const result = f.g.transact(f.p.id, {
        id: "reject-" + item,
        kind: "skill",
        item,
      });
      assert(!result.ok && result.reason === "incompatibleItem");
      assert.equal(f.player().sp, before);
    }
    f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
    assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 4);
    assert(
      f.host.textContent.includes(
        fitting === ids.spade ? "stable ground" : "initial world bearing",
      ),
    );
  }
});
test("the same C becomes a feed release during actual recovery without inventing an empty B action", async (t) => {
  const f = await setup(t);
  f.foundation();
  f.buy(ids.entry);
  assert(f.g.start());
  f.g.boss.staggerUntil = f.g.boss.deadline = 1e6;
  assert(
    f.g.submitInput(f.p.id, { ...idleInput(), sequence: 1, technique1: true }),
  );
  f.g.step();
  let p = f.player(),
    a = heavyActions(p, f.g.combatTick);
  assert.equal(a.extras.length, 1);
  assert.equal(a.extras[0].at, 0);
  assert.equal(a.extras[0].blocked, false);
  assert(
    f.guide.heavyHudLabel(p, "technique1", f.g.combatTick).includes("1 of 4"),
  );
  const at = p.kit.technique1At;
  assert(
    f.g.submitInput(f.p.id, { ...idleInput(), sequence: 2, technique1: true }),
  );
  f.g.step();
  p = f.player();
  a = heavyActions(p, f.g.combatTick);
  assert.equal(a.extras[0].at, at);
  assert.equal(f.p.ammo, 44);
  assert.equal(
    f.guide.heavyHudLabel(p, "technique1", f.g.combatTick),
    "Traverse Stroke",
  );
});
test("all15catalogs contain the explicit English pilot copy and exact owned technique descriptions", () => {
  const names = [
    "en",
    "ar",
    "bn",
    "de",
    "es",
    "fr",
    "hi",
    "id",
    "ja",
    "ko",
    "pt-BR",
    "ru",
    "ur",
    "zh-Hans",
    "zh-Hant",
  ];
  for (const name of names) {
    const m = JSON.parse(
      readFileSync("locales/" + name + ".json", "utf8"),
    ).messages;
    for (const id of Object.values(ids)) {
      assert.equal(typeof m["skill." + id + ".name"], "string");
      assert.equal(typeof m["skill." + id + ".description"], "string");
    }
    assert.equal(
      m["ui.heavy.traverseAction"],
      "Traverse Stroke / Release Feed",
    );
  }
});
