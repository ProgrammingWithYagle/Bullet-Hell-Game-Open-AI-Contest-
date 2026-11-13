import fs from "node:fs";
import assert from "node:assert/strict";
import { menuEnvironment, menuBundle } from "./menu-fixture.ts";
import { defaultControls } from "../../src/client/input-bindings.ts";
import { data } from "../../src/shared/game.ts";
const root = process.cwd();
export async function menuAcquirer(host: any) {
  const cleanup: (() => unknown)[] = [],
    t = { after: (fn: () => unknown) => cleanup.push(fn) },
    env = menuEnvironment(t as any),
    old = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  const controls = defaultControls(),
    observations: any[] = [];
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.gamepad.technique1 = 8;controls.gamepad.technique3=6;
  controls.bindings.technique2 = ["KeyN", "KeyY"];
  controls.gamepad.technique2 = 9;
  let binding: any;
  const messages = JSON.parse(
      fs.readFileSync(root + "/locales/en.json", "utf8"),
    ).messages,
    stubs = {
      "assets.ts":
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:" +
        JSON.stringify(
          Object.fromEntries(
            data.specializationSkills
              .filter((s: any) => s.classId === "heavy")
              .map((s: any) => [s.id, s.id + ".png"]),
          ),
        ) +
        "};",
      "i18n.ts":
        "const m=" +
        JSON.stringify(messages) +
        ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
    },
    shop = await menuBundle(t as any, root + "/src/client/ui/shop.ts", stubs),
    guide = await menuBundle(
      t as any,
      root + "/src/client/ui/heavy-controls.ts",
      stubs,
    );
  return {
    observations,
    acquire: async (
      item: string,
      canBuy: boolean,
      purchase: () => Promise<void>,
      commit = canBuy,
    ) => {
      const p = () => host.view.players.find((p: any) => p.id === host.id),
        all = [
          ...data.skills,
          ...data.generalSkills,
          ...data.specializationSkills,
        ],
        earned =
          p().sp +
          p().skills.reduce(
            (n: number, id: string) =>
              n + all.find((s: any) => s.id === id)!.cost,
            0,
          ),
        node = all.find((s: any) => s.id === item)!;
      assert([3, 9, 12, 15, 20, 21].includes(earned));
      binding?.dispose();
      let requests = 0,
        pending: Promise<void> | undefined;
      env.host.innerHTML =
        '<div class="loadout-editor">' +
        shop.shopMarkup(p(), [], true, "baby", undefined, true, controls) +
        "</div>";
      binding = shop.bindShop(
        env.host,
        p(),
        (r: any) => {
          assert.equal(r.kind, "skill");
          assert.equal(r.item, item);
          requests++;
          pending = purchase();
        },
        [],
        true,
        "baby",
        undefined,
        true,
        controls,
      );
      env.host.querySelector('[data-shop-tab="specializations"]')!.click();
      env.host.querySelector('[data-inspect="heavy-traverse-1"]')!.click();
      if (item === "heavy-ordnance-1")
        env.host
          .querySelector('[data-prerequisite="heavy-ordnance-1"]')!
          .click();
      else env.host.querySelector('[data-inspect="' + item + '"]')!.click();
      const before = p().sp,
        skills = [...p().skills],
        button = env.host.querySelector("#buy-selected")!;
      assert.equal(button.disabled, !canBuy);
      assert.equal(requests, 0);
      assert.deepEqual(p().skills, skills);
      if (commit) {
        assert(canBuy);
        button.click();
        assert.equal(requests, 1);
        assert(pending);
        await pending;
        assert(p().skills.includes(item));
        assert.equal(p().sp, before - node.cost);
      } else {
        if (!canBuy) button.click();
        assert.equal(requests, 0);
        assert.equal(p().sp, before);
        assert.deepEqual(p().skills, skills);
      }
      binding.dispose();
      binding = undefined;
      env.host.innerHTML = guide.heavyKitMarkup(p(), controls, true);
      const owned = p().skills.includes("heavy-traverse-1");
      assert.equal(
        env.host.querySelectorAll("[data-kit-action]").length,
        p().skills.includes("heavy-traverse-clutch-1") ? 5 : owned ? 4 : 3,
      );
      if (owned) {
        const c = env.host.querySelector('[data-kit-action="technique1"]')!;
        for (const text of ["Traverse Stroke / Release Feed", "Z", "G", "8"])
          assert(c.textContent.includes(text));
        if (p().skills.includes("heavy-traverse-clutch-1")) {
          const b = env.host.querySelector('[data-kit-action="technique2"]')!;
          for (const text of [
            p().skills.includes("heavy-traverse-lanyard-1")
              ? "Tethered Traverse"
              : p().skills.includes("heavy-traverse-keyed-1")
              ? "Keyed Clutch"
              : p().skills.includes("heavy-traverse-open-1")
                ? "Open Feed"
                : "Feed Clutch / Re-engage",
            "N",
            "Y",
            "9",
          ])
            assert(b.textContent.includes(text));
        } else
          assert(!env.host.querySelector('[data-kit-action="technique2"]'));
      }
      observations.push({
        item,
        actualEarnedSP: earned,
        actualAvailableBefore: before,
        canBuy,
        commit,
        inspectionRequests: 0,
        purchaseRequests: requests,
        skillsBefore: skills,
        skillsAfter: [...p().skills],
        sourceMenuDOM: true,
        renderedLayout: false,
      });
    },
    close: async () => {
      binding?.dispose();
      old
        ? Object.defineProperty(globalThis, "CSS", old)
        : Reflect.deleteProperty(globalThis, "CSS");
      for (const fn of cleanup.reverse()) await fn();
    },
  };
}
