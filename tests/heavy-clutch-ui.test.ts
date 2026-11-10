import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clutchMenuFixture as setup } from "./helpers/heavy-clutch-menu-fixture.ts";
import { clutchId, traverseIds as ids } from "../src/shared/heavy-traverse.ts";
import { heavyActions } from "../src/client/heavy-actions.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { data } from "../src/shared/game.ts";
import { specializationMapLayout } from "../src/client/ui/specialization-map.ts";
test("controlled source MenuDOM rejects Clutch at3 and9earned, then makes one optional-fitting-free purchase at15 with five owned remapped rows", async (t) => {
  const f = await setup(t);
  f.foundation();
  f.buy(ids.entry);
  const before = f.requests.length;
  for (const earned of [3, 9]) {
    f.p.totalSp = earned;
    f.render();
    f.inspect(clutchId);
    assert(f.host.querySelector("#buy-selected")!.disabled);
    f.host.querySelector("#buy-selected")!.click();
    assert.equal(f.requests.length, before);
  }
  f.p.totalSp = 15;
  f.render();
  f.buy(clutchId);
  assert.equal(f.requests.length, before + 1);
  assert.equal(f.player().sp, 9);
  assert.deepEqual(f.p.skills, ["heavy-ordnance-1", ids.entry, clutchId]);
  f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
  const b = f.host.querySelector('[data-kit-action="technique2"]')!;
  for (const text of ["Feed Clutch / Re-engage", "N", "Y", "9"])
    assert(b.textContent.includes(text));
  assert.equal(f.controls.bindings.e[0], "KeyE");
  assert.equal(heavyActions(f.player(), 0).extras[1].id, clutchId);
});
test("controlled15SP source purchases retain either exclusive fitting, independent Clutch acquisition and the real6or8SP cost", async (t) => {
  for (const mode of ["loose", "spade", "floating"] as const) {
    const f = await setup(t);
    f.foundation();
    f.buy(ids.entry);
    f.p.totalSp = 15;
    f.render();
    f.buy(clutchId);
    if (mode !== "loose") f.buy(ids[mode]);
    assert.equal(f.player().sp, mode === "loose" ? 9 : 7);
    assert.equal(f.requests.length, mode === "loose" ? 3 : 4);
    if (mode !== "loose") {
      f.inspect(ids[mode === "spade" ? "floating" : "spade"]);
      assert(f.host.querySelector("#buy-selected")!.disabled);
    }
  }
});
test("actual owned actions distinguish lift, forfeited slots, re-engage, used pair and idle recovery without a fictitious carrier", async (t) => {
  const f = await setup(t);
  f.foundation();
  f.buy(ids.entry);
  f.p.totalSp = 15;
  f.render();
  f.buy(clutchId);
  assert(f.g.start());
  f.g.boss.staggerUntil = f.g.boss.deadline = 1e6;
  let sequence = 0;
  const step = (input: any = {}) => {
      assert(
        f.g.submitInput(f.p.id, {
          ...idleInput(),
          sequence: ++sequence,
          aim: 0,
          ...input,
        }),
      );
      f.g.step();
    },
    label = (slot: "technique1" | "technique2") =>
      f.guide.heavyHudLabel(f.player(), slot, f.g.combatTick),
    actions = () => heavyActions(f.player(), f.g.combatTick);
  assert.equal(label("technique2"), "Feed Clutch · no active stroke");
  assert(actions().extras[1].blocked);
  step({ technique1: true });
  assert(actions().extras[1].blocked);
  step();
  assert.equal(label("technique2"), "Lift feed");
  assert(!actions().extras[1].blocked);
  step({ technique2: true, moveY: 1 });
  assert(label("technique2").includes("Re-engage"));
  const shot = f.g.kitStatus(f.p.id).heavyTraverseShotAt;
  while (f.g.combatTick < 11) step({ moveY: 1 });
  assert.equal(label("technique1"), "Release feed · 1 fired · 1 missed");
  step({ technique2: true });
  assert.equal(f.g.kitStatus(f.p.id).heavyTraverseShotAt, shot);
  assert.equal(label("technique2"), "Clutch used for this stroke");
  assert(actions().extras[1].blocked);
  assert.equal(f.p.ammo, 44);
  step({ technique1: true });
  assert.equal(label("technique2"), "Feed Clutch · no active stroke");
  assert(actions().extras[1].blocked);
  assert.equal(f.p.ammo, 44);
});
test("the authored Siege map contains the acquired Clutch operation after entry without requiring either fitting or selling a numerical effect", () => {
  const node = data.specializationSkills.find((s) => s.id === clutchId)!;
  assert.equal(node.prerequisite, ids.entry);
  assert.equal(node.cost, 3);
  assert.equal(node.freePlaySpRequired, 11);
  assert.equal(node.grade, "B-");
  assert.equal(node.capstone, false);
  assert.deepEqual(node.effects, {});
  const map = specializationMapLayout("heavy", ids.entry)!;
  assert.equal(map.nodes.length, 7);
  assert(map.edges.some((e) => e.from === ids.entry && e.to === clutchId));
  assert(!map.exclusions.some((e) => e.a === clutchId || e.b === clutchId));
  assert.equal(
    new Set(map.nodes.map((n) => n.x + "," + n.y)).size,
    map.nodes.length,
  );
});
test("all fifteen catalogs bind the acquired operation and honest English pilot guide copy", () => {
  const node = data.specializationSkills.find((s) => s.id === clutchId)!;
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    assert.equal(m[node.nameKey], node.name);
    assert.equal(m["skill." + clutchId + ".description"], node.description);
    for (const key of [
      "ui.heavy.clutchAction",
      "ui.heavy.clutchLift",
      "ui.heavy.clutchEngage",
      "ui.heavy.clutchSpent",
      "ui.heavy.clutchIdle",
      "ui.heavy.clutchFeedRemaining",
      "ui.heavy.clutchHelp",
    ])
      assert(typeof m[key] === "string" && m[key].length > 0);
    assert(
      m["ui.heavy.clutchHelp"].includes("Slots passed while lifted are lost"),
    );
  }
});
