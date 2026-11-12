import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { RetinueControls } from "../src/client/retinue-controls.ts";
import {
  defaultControls,
  migrateMobilityControls,
  validControls,
} from "../src/client/input-bindings.ts";
import { menuEnvironment } from "./helpers/menu-fixture.ts";

test("Retinue controls expose actual owned health/order, skip unavailable Focus and stop issuing commands under pause or after disposal", (context) => {
  const env = menuEnvironment(context),
    root = env.host as unknown as HTMLElement,
    commands: string[] = [];
  const panel = new RetinueControls(
    root,
    (key, values) => key + JSON.stringify(values ?? {}),
    (order) => commands.push(order),
  );
  const g = new Game(),
    p = g.addPlayer("p", "Joss", "summoner");
  g.addPlayer("other", "Other caller", "summoner");
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.submitInput(p.id, { ...idleInput(), sequence: 1, q: true });
  g.step();
  let view = viewOf(g, p.id);
  panel.update(view, p.id, false, "V");
  const button = (order: string) =>
    root.querySelector<HTMLButtonElement>(
      '[data-retinue-order="' + order + '"]',
    )!;
  assert(!root.hidden);
  assert.equal(button("escort").getAttribute("aria-pressed"), "true");
  assert(button("focus").disabled);
  assert.equal(root.querySelectorAll("li").length, 2);
  panel.cycle();
  assert.deepEqual(commands, ["hold"]);
  assert(g.orderRetinue(p.id, "hold"));
  view = viewOf(g, p.id);
  panel.update(view, p.id, false, "V");
  panel.cycle();
  assert.deepEqual(
    commands,
    ["hold", "escort"],
    "Unavailable Focus is skipped without creating a target",
  );
  panel.update(view, p.id, true, "V");
  button("hold").click();
  panel.cycle();
  assert.equal(commands.length, 2);
  view.matchPaused = true;
  panel.update(view, p.id, false, "V");
  panel.cycle();
  assert.equal(commands.length, 2);
  view.matchPaused = false;
  panel.update(view, "other", false, "V");
  assert.equal(
    root.querySelectorAll("li").length,
    0,
    "Another owner cannot see a copied health roster",
  );
  panel.dispose();
  button("hold")?.click();
  panel.cycle();
  assert.equal(commands.length, 2);
});

test("Exact earlier control shapes retain chosen keys and pad buttons when the new command is added, including pre-Sprint saves", () => {
  const earlier = defaultControls() as any;
  delete earlier.bindings.retinue;
  delete earlier.gamepad.retinue;
  delete earlier.bindings.technique3;
  delete earlier.gamepad.technique3;
  earlier.bindings.q = ["KeyV"];
  earlier.gamepad.q = 15;
  const upgraded = migrateMobilityControls(earlier) as ReturnType<
    typeof defaultControls
  >;
  assert(validControls(upgraded));
  assert.deepEqual(upgraded.bindings.q, ["KeyV"]);
  assert.equal(upgraded.gamepad.q, 15);
  assert(!upgraded.bindings.retinue.includes("KeyV"));
  assert.notEqual(upgraded.gamepad.retinue, 15);
  assert.equal(
    earlier.bindings.retinue,
    undefined,
    "Migration does not mutate the saved object",
  );
  const ancient = structuredClone(earlier);
  delete ancient.bindings.sprint;
  delete ancient.gamepad.sprint;
  delete ancient.sprintMode;
  const both = migrateMobilityControls(ancient) as ReturnType<
    typeof defaultControls
  >;
  assert(validControls(both));
  assert.deepEqual(both.bindings.q, ["KeyV"]);
  assert.equal(both.gamepad.q, 15);
  const malformed = structuredClone(earlier);
  malformed.bindings.unrecognized = ["KeyZ"];
  assert.equal(migrateMobilityControls(malformed), malformed);
});
