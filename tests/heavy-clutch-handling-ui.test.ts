import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handlingMenuFixture as setup } from "./helpers/heavy-clutch-handling-menu-fixture.ts";
import { handlingGameFixture as fixture } from "./helpers/heavy-clutch-handling-game-fixture.ts";
import {
  keyedId,
  openId,
  clutchId,
  traverseIds as ids,
} from "../src/shared/heavy-traverse.ts";
import { data } from "../src/shared/game.ts";
import { heavyActions } from "../src/client/heavy-actions.ts";
import { specializationMapLayout } from "../src/client/ui/specialization-map.ts";

test("controlled15SP source MenuDOM buys one optional handling on each real carriage, preserves five remapped rows and disables the exclusive alternative", async (t) => {
  for (const handling of [keyedId, openId])
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = await setup(t);
      f.foundation();
      f.buy(ids.entry);
      f.p.totalSp = 9;
      f.render();
      if (mode !== "loose") f.buy(ids[mode]);
      f.inspect(handling);
      const before = f.requests.length;
      assert(f.host.querySelector("#buy-selected")!.disabled);
      f.host.querySelector("#buy-selected")!.click();
      assert.equal(f.requests.length, before);
      f.p.totalSp = 15;
      f.render();
      f.buy(clutchId);
      f.buy(handling);
      const expected = mode === "loose" ? 9 : 11;
      assert.equal(f.player().sp, 15 - expected);
      assert.equal(
        f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0),
        expected,
      );
      const other = handling === keyedId ? openId : keyedId;
      f.inspect(other);
      assert(f.host.querySelector("#buy-selected")!.disabled);
      assert.equal(
        f.g.transact(f.p.id, { id: "incompatible", kind: "skill", item: other })
          .reason,
        "incompatibleItem",
      );
      assert.equal(f.player().sp, 15 - expected);
      assert.equal(heavyActions(f.player(), 0).extras[1].id, handling);
      f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
      assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
      const row = f.host.querySelector('[data-kit-action="technique2"]')!;
      for (const text of [
        handling === keyedId ? "Keyed Clutch" : "Open Feed",
        "N",
        "Y",
        "9",
      ])
        assert(row.textContent.includes(text));
      assert.equal(f.controls.bindings.e[0], "KeyE");
      assert.equal(f.controls.gamepad.technique1, 8);
      assert(
        f.host.textContent.includes(
          handling === keyedId
            ? "primary still waits"
            : "each actual paid round trades",
        ),
      );
      if (handling === keyedId)
        assert(
          !f.host.textContent.includes("Floating keeps its first bearing"),
        );
    }
});
test("the authored later fork contains only real cards, six prerequisite edges and two independent exclusions", () => {
  const map = specializationMapLayout("heavy", ids.entry)!;
  assert.equal(map.nodes.length, 7);
  assert.equal(map.edges.length, 6);
  assert.equal(map.exclusions.length, 2);
  assert.equal(new Set(map.nodes.map((n) => n.x + "," + n.y)).size, 7);
  for (const id of [keyedId, openId]) {
    const node = data.specializationSkills.find((n) => n.id === id)!;
    assert.equal(node.prerequisite, clutchId);
    assert.equal(node.cost, 3);
    assert.equal(node.freePlaySpRequired, 13);
    assert.equal(node.grade, "B+");
    assert.equal(node.role, "evolution");
    assert.equal(node.capstone, false);
    assert.deepEqual(node.effects, {});
    assert(map.edges.some((e) => e.from === clutchId && e.to === id));
  }
  assert(
    map.exclusions.some(
      (e) => [e.a, e.b].includes(keyedId) && [e.a, e.b].includes(openId),
    ),
  );
});
test("the source HUD distinguishes actual traded opportunities from separately passed slots and keyed re-engagement", async (t) => {
  const ui = await setup(t),
    f = fixture("spade", openId);
  f.step({ technique1: true });
  f.step({ technique2: true, fire: true });
  const player = () => ({ ...ui.player(), ...f.p, kit: f.status() }) as any;
  assert.equal(
    ui.guide.heavyHudLabel(player(), "technique1", 2),
    "Release · 1 C fired · 1 traded · 0 passed",
  );
  assert.equal(
    ui.guide.heavyHudLabel(player(), "technique2", 2),
    "Re-engage · 2 C left",
  );
  while (f.g.combatTick < 21) f.step();
  assert.equal(f.status().heavyClutchForfeited, 2);
  assert.equal(f.status().heavyClutchConverted, 1);
  assert.equal(
    ui.guide.heavyHudLabel(player(), "technique1", 21),
    "Release · 1 C fired · 1 traded · 1 passed",
  );
  const keyed = fixture("spade", keyedId);
  keyed.step({ technique1: true });
  keyed.step({ technique2: true });
  const kp = () => ({ ...ui.player(), ...keyed.p, kit: keyed.status() }) as any;
  assert.equal(
    ui.guide.heavyHudLabel(kp(), "technique2", 2),
    "Key bearing · 3 left",
  );
  keyed.step({ technique2: true });
  assert.equal(
    ui.guide.heavyHudLabel(kp(), "technique2", 3),
    "Barrel keyed for this stroke",
  );
  assert(heavyActions(kp(), 3).extras[1].blocked);
});
test("all15catalogs contain the exact new descriptions and honest English pilot guide values", () => {
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    for (const id of [keyedId, openId]) {
      const node = data.specializationSkills.find((s) => s.id === id)!;
      assert.equal(m[node.nameKey], node.name);
      assert.equal(m["skill." + id + ".description"], node.description);
    }
    for (const key of [
      "ui.heavy.keyedHelp",
      "ui.heavy.openHelp",
      "ui.heavy.keyedEngage",
      "ui.heavy.keyedSpent",
      "ui.heavy.openEngage",
      "ui.heavy.handlingFeedRemaining",
    ])
      assert(typeof m[key] === "string" && m[key].length > 0);
  }
});
