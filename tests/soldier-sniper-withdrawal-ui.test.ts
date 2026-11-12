import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { sniperIds as ids } from "../src/shared/soldier-sniper.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import {
  defaultControls,
  validControls,
} from "../src/client/input-bindings.ts";
import { specializationMapLayout } from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";

test("paired-position culmination has an actual prerequisite edge and keeps the exclusive handling choice", () => {
  const map = specializationMapLayout("soldier", ids.entry)!;
  assert.equal(map.nodes.length, 7);
  assert.equal(map.edges.length, 6);
  assert.equal(map.exclusions.length, 1);
  assert(map.edges.some((e) => e.from === ids.rest && e.to === ids.withdrawal));
  assert(
    map.nodes.find((n) => n.id === ids.withdrawal)!.y >
      map.nodes.find((n) => n.id === ids.rest)!.y,
  );
});

for (const clear of [false, true])
  test(
    "source-bound capstone inspection, purchase and owned guide preserve remapped C/B" +
      (clear ? "/R" : "") +
      " and contextual recovery",
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
        ui = await menuBundle(t, "src/client/ui/sniper-controls.ts", stubs),
        controls = defaultControls();
      controls.bindings.technique1 = ["KeyZ", "KeyG"];
      controls.gamepad.technique1 = 8;controls.gamepad.technique3=6;
      controls.bindings.technique2 = ["KeyN", "KeyY"];
      controls.gamepad.technique2 = 9;
      controls.bindings.reload = ["KeyT", "KeyK"];
      controls.gamepad.reload = 11;
      assert(validControls(controls));
      // Controlled earned-budget UI fixture. Real earned27SP and online purchases are separate tests.
      const g = new Game({ mode: "endless" });
      g.encounter = 7;
      const p = g.addPlayer("solo", "Mara", "soldier");
      for (const item of [
        "soldier-ballistics-1",
        ids.entry,
        ids.bore,
        ids.rest,
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
                id: "withdrawal-ui-" + requests.length,
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
      env.host
        .querySelector('[data-inspect="' + ids.withdrawal + '"]')!
        .click();
      assert(env.host.querySelector("#buy-selected")!.disabled);
      assert.equal(requests.length, 0);
      p.totalSp = 27;
      render();
      for (const mode of ["map", "list"]) {
        env.host
          .querySelector('[data-specialization-mode="' + mode + '"]')!
          .click();
        env.host
          .querySelector('[data-inspect="' + ids.withdrawal + '"]')!
          .click();
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
      assert(p.skills.includes(ids.withdrawal));
      render();
      const guide = env.host.querySelector("[data-soldier-kit]")!,
        b = guide.querySelector('[data-kit-action="technique2"]')!;
      assert.equal(
        guide.querySelectorAll("[data-kit-action]").length,
        clear ? 6 : 5,
      );
      for (const label of [
        "Field Rest",
        "Prepared Withdrawal",
        "Bore Through",
        "N",
        "Y",
        "9",
      ])
        assert(b.textContent.includes(label));
      for (const label of ["96", "9s", "round", "recovery"])
        assert(guide.textContent.includes(label));
      assert.equal(
        guide.querySelectorAll('[data-kit-action="reload"]').length,
        clear ? 1 : 0,
      );
      const original = pv(),
        now = 100,
        show = (extra: Partial<typeof original.kit>) => ({
          ...original,
          kit: { ...original.kit, ...extra },
        });
      assert.equal(soldierActions(original, now).extras[1].id, ids.withdrawal);
      assert(ui.sniperHudLabel(original, now, true).includes("set empty"));
      assert(
        ui
          .sniperHudLabel(
            show({ sniperRestCount: 1, sniperRestCanSecond: true }),
            now,
            true,
          )
          .includes("second"),
      );
      assert(
        ui
          .sniperHudLabel(show({ sniperRestCount: 2 }), now, true)
          .includes("pair"),
      );
      const returning = show({
        sniperWithdrawalUntil: 200,
        sniperWithdrawalReady: true,
        technique1At: 0,
        sniperRecoveryAt: 400,
        sniperBlocked: false,
      });
      assert(ui.sniperHudLabel(returning, now, true).includes("recall"));
      assert(ui.sniperHudLabel(returning, now).includes("return position"));
      assert.equal(soldierActions(returning, now).extras[0].at, 0);
      assert(!soldierActions(returning, now).extras[0].blocked);
      assert(
        soldierActions(
          { ...returning, kit: { ...returning.kit, sniperBlocked: true } },
          now,
        ).extras[0].blocked,
      );
      const paid = show({
        sniperPrepared: true,
        sniperReadyAt: now,
        sniperUntil: now + 90,
        sniperBlocked: false,
      });
      assert.equal(soldierActions(paid, now).extras[1].id, ids.bore);
      assert(ui.sniperHudLabel(paid, now, true).includes("fire"));
    },
  );
