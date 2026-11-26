import { seamId } from "../src/shared/heavy-seam.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { flakIds as ids } from "../src/shared/heavy-flak.ts";
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
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'heavy-flak-1':'flak.png','heavy-flak-compact-1':'compact.png','heavy-flak-frontal-1':'frontal.png','heavy-flak-command-1':'command.png','heavy-flak-running-1':'running.png','heavy-flak-hanging-1':'hanging.png','heavy-flak-seam-1':'seam.png'}};",
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
  controls.gamepad.technique1 = 8;controls.gamepad.technique3=6;
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
test("Seam’s actual menu gate and paid ownership preserve five remapped action rows", async (t) => {
  const f = await setup(t, "short");
  assert.equal(f.player().sp, 3);
  f.foundation();
  f.buy(ids.entry);
  assert.equal(f.player().sp, 0);
  f.inspect(seamId);
  assert(f.host.querySelector("#buy-selected")!.disabled);
  // Controlled threshold isolation; ordinary third-clear acquisition is a separate worker/peer gate.
  f.p.totalSp = 18;
  f.render();
  f.buy(ids.command);
  f.inspect(seamId);
  assert(f.host.querySelector("#buy-selected")!.disabled);
  const requests = f.requests.length;
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.length, requests);
  f.p.totalSp = 19;
  f.render();
  f.buy(seamId);
  assert.equal(f.player().sp, 9);
  assert.equal(f.requests.length, 4);
  f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
  const c = f.host.querySelector('[data-kit-action="technique1"]')!,
    b = f.host.querySelector('[data-kit-action="technique2"]')!;
  for (const text of ["Flak Round / Seam Cut", "Z", "G", "8"])
    assert(c.textContent.includes(text), text);
  for (const text of ["Manual Fuze", "N", "Y", "9"])
    assert(b.textContent.includes(text), text);
  assert(f.host.textContent.includes("separate Action 1"));
  assert(!f.host.querySelector('[data-kit-action="reload"]'));
  assert.equal(f.controls.bindings.e[0], "KeyE");
});
test("the actual paid flight changes C into a cut during recovery without changing B or the firing pose timestamp", async (t) => {
  const f = await setup(t, "raid");
  f.p.totalSp = 19;
  f.render();
  f.foundation();
  f.buy(ids.entry);
  f.buy(ids.command);
  f.buy(seamId);
  assert(f.g.start());
  f.g.boss.staggerUntil = 1e6;
  Object.defineProperty(f.g, "arena", { value: structuredClone(f.g.arena) });
  f.g.arena.obstacles.length = 0;
  f.p.x = f.p.oldX = 600;
  f.p.y = f.p.oldY = 600;
  const step = (sequence: number, input: any = {}) => {
    assert(
      f.g.submitInput(f.p.id, { ...idleInput(), sequence, aim: 0, ...input }),
    );
    f.g.step();
  };
  step(1, { technique1: true });
  let p = f.player(),
    a = heavyActions(p, f.g.combatTick);
  assert.equal(a.extras[0].id, seamId);
  assert.equal(a.extras[0].at, 0);
  assert(a.extras[0].blocked);
  assert((p.kit.technique1At ?? 0) > f.g.combatTick);
  const recovery = p.kit.technique1At;
  step(2);
  p = f.player();
  a = heavyActions(p, f.g.combatTick);
  assert(!a.extras[0].blocked);
  assert(!a.extras[1].blocked);
  assert(
    f.guide
      .heavyHudLabel(p, "technique1", f.g.combatTick)
      .includes("cut travelled seam"),
  );
  step(3, { technique1: true });
  p = f.player();
  a = heavyActions(p, f.g.combatTick);
  assert.equal(a.extras[0].id, ids.entry);
  assert.equal(a.extras[0].at, recovery);
  assert(a.extras[1].blocked);
  assert.equal(p.kit.heavyFlakShotAt, 1);
  assert.equal(p.kit.heavyFlakSeamAt, 3);
  assert.equal(p.ammo, f.g.stats(f.p).magazine - 1);
});
test("a severed actual trace disables only C’s cut and gives the player its remaining point operation", async (t) => {
  const f = await setup(t, "raid");
  f.p.totalSp = 19;
  f.render();
  f.foundation();
  f.buy(ids.entry);
  f.buy(ids.command);
  f.buy(seamId);
  assert(f.g.start());
  f.g.boss.staggerUntil = 1e6;
  Object.defineProperty(f.g, "arena", { value: structuredClone(f.g.arena) });
  f.g.arena.obstacles.length = 0;
  f.p.x = f.p.oldX = 600;
  f.p.y = f.p.oldY = 600;
  for (let n = 1; n <= 6; n++) {
    assert(
      f.g.submitInput(f.p.id, {
        ...idleInput(),
        sequence: n,
        aim: 0,
        technique1: n === 1,
      }),
    );
    f.g.step();
  }
  f.g.arena.obstacles.push({ x: 620, y: 550, width: 5, height: 100 });
  f.g.step();
  const p = f.player(),
    a = heavyActions(p, f.g.combatTick);
  assert(p.kit.heavyFlakSeamBroken);
  assert(a.extras[0].blocked);
  assert(!a.extras[1].blocked);
  assert.equal(
    f.guide.heavyHudLabel(p, "technique1", f.g.combatTick),
    "seam severed · point action remains",
  );
});
