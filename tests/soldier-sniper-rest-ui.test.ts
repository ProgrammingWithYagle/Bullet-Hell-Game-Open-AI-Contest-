import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { sniperIds as ids } from "../src/shared/soldier-sniper.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import {
  defaultControls,
  validControls,
} from "../src/client/input-bindings.ts";
import { specializationMapLayout } from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
test("Field Rest joins the real Bore node without an empty late promise or a new hotbar slot", () => {
  const map = specializationMapLayout("soldier", ids.entry)!;
  assert.equal(map.nodes.length,7);
  assert.equal(map.edges.length,6);
  assert.equal(map.exclusions.length, 1);
  assert(map.edges.some((e) => e.from === ids.bore && e.to === ids.rest));
  assert(
    map.nodes.find((n) => n.id === ids.rest)!.y >
      map.nodes.find((n) => n.id === ids.bore)!.y,
  );
});
for (const clear of [false, true])
  test(
    "Field Rest source-bound inspection and owned C/B" +
      (clear ? "/R" : "") +
      " guide keep valid remaps and actual contextual HUD state",
    async (t) => {
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
      const messages = JSON.parse(
          readFileSync("locales/en.json", "utf8"),
        ).messages,
        icons = Object.fromEntries(
          Object.values(ids).map((id) => [id, id + ".png"]),
        ),
        stubs = {
          "assets.ts":
            "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:" +
            JSON.stringify(icons) +
            "};",
          "i18n.ts":
            "const m=" +
            JSON.stringify(messages) +
            ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
        },
        shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
        controls = defaultControls();
      controls.bindings.technique1 = ["KeyZ", "KeyG"];
      controls.gamepad.technique1 = 8;controls.gamepad.technique3=6;
      controls.bindings.technique2 = ["KeyN", "KeyY"];
      controls.gamepad.technique2 = 9;
      controls.bindings.reload = ["KeyT", "KeyK"];
      controls.gamepad.reload = 11;
      assert(validControls(controls));
      // Controlled legal earned budget; ordinary server-earned progression is tested separately.
      const g = new Game({ mode: "endless" });
      g.encounter = 6;
      const p = g.addPlayer("solo", "Mara", "soldier");
      for (const item of [
        "soldier-ballistics-1",
        ids.entry,
        ids.bore,
        ...(clear ? [ids.clear] : []),
      ])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
      let binding: any;
      const requests: any[] = [],
        pv = () => viewOf(g, p.id).players[0],
        render = () => {
          binding?.dispose();
          env.host.innerHTML =
            '<div class="loadout-editor">' +
            shop.shopMarkup(
              pv(),
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
            pv(),
            (r: Omit<Parameters<Game["transact"]>[1], "id">) => {
              requests.push(r);
              const result = g.transact(p.id, {
                id: "rest-ui-" + requests.length,
                ...r,
              });
              assert(result.ok, result.reason);
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
      for (const mode of ["map", "list"]) {
        env.host
          .querySelector('[data-specialization-mode="' + mode + '"]')!
          .click();
        env.host.querySelector('[data-inspect="' + ids.rest + '"]')!.click();
        for (const [slot, labels] of [
          ["technique1", ["Z", "G", "8"]],
          ["technique2", ["N", "Y", "9"]],
        ] as const) {
          const row = env.host.querySelector(
            '#item-details [data-technique-control="' + slot + '"]',
          )!;
          assert(row);
          for (const label of labels) assert(row.textContent.includes(label));
        }
        assert(!env.host.querySelector("#buy-selected")!.disabled);
        assert.equal(requests.length, 0);
      }
      env.host.querySelector("#buy-selected")!.click();
      assert.equal(requests.length, 1);
      assert(p.skills.includes(ids.rest));
      render();
      const guide = env.host.querySelector("[data-soldier-kit]")!,
        b = guide.querySelector('[data-kit-action="technique2"]')!;
      assert.equal(
        guide.querySelectorAll("[data-kit-action]").length,
        clear ? 6 : 5,
      );
      for (const label of ["Field Rest", "Bore Through", "N", "Y", "9"])
        assert(b.textContent.includes(label));
      assert(guide.textContent.includes("empty"));
      assert(guide.textContent.includes("9s"));
      assert.equal(
        guide.querySelectorAll('[data-kit-action="reload"]').length,
        clear ? 1 : 0,
      );
      const ui = await menuBundle(t, "src/client/ui/sniper-controls.ts", stubs);
      assert.equal(soldierActions(pv(), 0).extras[1].id, ids.rest);
      assert(ui.sniperHudLabel(pv(), 0, true).includes("set empty"));
      assert(g.start());
      g.boss.staggerUntil = 1e9;
      let seq = 0;
      const step = (input: any = {}) => {
        assert(
          g.submitInput(p.id, { ...idleInput(), sequence: ++seq, ...input }),
        );
        g.step();
      };
      step({ technique2: true });
      assert(ui.sniperHudLabel(pv(), g.combatTick, true).includes("recall"));
      assert.equal(soldierActions(pv(), g.combatTick).extras[1].id, ids.rest);
      while (g.combatTick < g.kitStatus(p.id).sniperRestAt!) step();
      assert(ui.sniperHudLabel(pv(), g.combatTick).includes("use rest"));
      step({ technique1: true });
      assert.equal(soldierActions(pv(), g.combatTick).extras[1].id, ids.bore);
      assert(!soldierActions(pv(), g.combatTick).extras[1].blocked);
      assert(ui.sniperHudLabel(pv(), g.combatTick, true).includes("fire"));
    },
  );
