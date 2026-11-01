import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data, type Player } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { Prediction } from "../src/client/prediction.ts";
import {
  idleInput,
  validInput,
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
  type InputFrame,
} from "../src/shared/protocol.ts";
import {
  advanceMobility,
  takeDodge,
  resetMobility,
  type Mobility,
} from "../src/shared/mobility.ts";
import {
  defaultControls,
  validControls,
  migrateMobilityControls,
} from "../src/client/input-bindings.ts";
import { Controls } from "../src/client/controls.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const issued =
  "39fd34dfd7530860d0ecfad5d7e86361438fae9bd3ac93881ec4fe51a3974322";
const buy = (g: Game, p: Player, id: string) =>
  g.transact(p.id, { id: "buy-" + id, kind: "skill", item: id });
function action(g: Game, p: Player, over: Partial<InputFrame> = {}) {
  assert(
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: p.ack + 1,
      clientTick: g.combatTick,
      ...over,
    }),
  );
  g.step();
}
function state(): Mobility {
  const p = {
    dodgeAt: 0,
    dodgeMaximum: 1,
    dodgeCharges: 1,
    sprintStamina: 100,
    sprintRecoveryAt: 0,
    sprintExhausted: false,
    sprinting: false,
    dashUntil: 0,
  };
  return p;
}

test("General purchases use existing earned SP for all seven classes without adding class nodes or granting free build points", () => {
  assert.equal(data.skills.length, 378);
  assert.equal(data.generalSkills.length, 2);
  for (const classId of implementedClassIds) {
    const g = new Game(),
      p = g.addPlayer("solo", "Runner", classId);
    assert.equal(p.totalSp, 3);
    assert.equal(buy(g, p, "general-double-dash").reason, "insufficientPoints");
    assert(buy(g, p, "general-sprint").ok);
    assert.equal(viewOf(g, p.id).players[0].sp, 0);
    assert.equal(
      g.transact(p.id, {
        id: "owned-again",
        kind: "skill",
        item: "general-sprint",
      }).ok,
      false,
    );
    assert.equal(p.totalSp, 3);
    assert.equal(p.skills.length, 1);
    assert.equal(
      g.transact(p.id, {
        id: "invalid",
        kind: "skill",
        item: "general-unlimited-dash",
      }).ok,
      false,
    );
  }
});
test("Double Dash recharges serially, preserves the original cooldown, cannot overlap a dash or create extra invulnerability", () => {
  const g = new Game({ mode: "raid", openingBossId: "constable" }),
    p = g.addPlayer("solo", "Runner", "soldier");
  assert(buy(g, p, "general-double-dash").ok);
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  assert.equal(p.dodgeCharges, 2);
  action(g, p, { dodge: true, moveX: 1 });
  const recharge = p.dodgeAt,
    invulnerability = p.invulnerableUntil;
  assert.equal(p.dodgeCharges, 1);
  action(g, p, { dodge: true, moveX: 1 });
  assert.equal(p.dodgeCharges, 1);
  assert.equal(p.invulnerableUntil, invulnerability);
  while (g.combatTick < p.dashUntil) action(g, p);
  action(g, p, { dodge: true, moveX: 1 });
  assert.equal(p.dodgeCharges, 0);
  assert.equal(p.dodgeAt, recharge);
  const period = Math.ceil(
    data.rules.dodgeCooldown * g.stats(p).dodgeCooldown * 30,
  );
  while (g.combatTick < recharge - 1) action(g, p);
  assert.equal(p.dodgeCharges, 0);
  action(g, p);
  assert.equal(p.dodgeCharges, 1);
  assert.equal(p.dodgeAt, recharge + period);
  while (g.combatTick < recharge + period) action(g, p);
  assert.equal(p.dodgeCharges, 2);
  const plain = state();
  takeDodge(plain, 1, 105);
  advanceMobility(plain, idleInput(), 2, 105, false, false);
  assert.equal(plain.dodgeCharges, 0);
});
test("Sprint has bounded stamina, exhaustion hysteresis and delayed recovery; ordinary combat actions and locked purchases cannot sprint", () => {
  const p = state(),
    running = { ...idleInput(), moveX: 1, sprint: true };
  for (let now = 1; now <= 100; now++)
    advanceMobility(p, running, now, 105, true, false);
  assert.equal(p.sprintStamina, 0);
  assert(p.sprintExhausted);
  assert(!p.sprinting);
  const at = p.sprintRecoveryAt;
  advanceMobility(p, running, at - 1, 105, true, false);
  assert.equal(p.sprintStamina, 0);
  advanceMobility(p, running, at, 105, true, false);
  assert(p.sprintStamina > 0 && p.sprintStamina < 1);
  assert(!p.sprinting);
  let now = at;
  while (p.sprintStamina < 35)
    advanceMobility(p, running, ++now, 105, true, false);
  advanceMobility(p, running, ++now, 105, true, false);
  assert(p.sprinting);
  assert(p.sprintStamina < 36);
  for (const over of [
    { fire: true },
    { reload: true },
    { interact: true },
    { q: true },
    { e: true },
    { ultimate: true },
    { dodge: true },
    { moveX: 0 },
  ]) {
    resetMobility(p, ["general-sprint"]);
    advanceMobility(p, { ...running, ...over }, 1, 105, true, false);
    assert(!p.sprinting);
    assert.equal(p.sprintStamina, 100);
  }
  advanceMobility(p, running, 2, 105, false, false);
  assert(!p.sprinting);
  advanceMobility(p, running, 3, 105, true, true);
  assert(!p.sprinting);
  p.dashUntil = 10;
  advanceMobility(p, running, 4, 105, true, false);
  assert(!p.sprinting);
});
test("movement authority and prediction agree across all classes and maps, including Hellish, terrain slows, Sprint and two dash charges", () => {
  for (const classId of implementedClassIds)
    for (const arena of data.arenas)
      for (const difficulty of ["normal", "hellish"]) {
        const g = new Game({
            mode: "raid",
            difficulty,
            openingArenaId: arena.id,
            openingBossId: "constable",
          }),
          p = g.addPlayer("solo", "Runner", classId);
        assert(
          buy(g, p, "general-sprint").ok && buy(g, p, "general-double-dash").ok,
        );
        g.start();
        g.boss.staggerUntil = g.boss.deadline = 1e9;
        p.slowUntil = 65;
        const prediction = new Prediction();
        prediction.acknowledge(viewOf(g, p.id), p.id);
        for (let n = 1; n <= 155; n++) {
          p.invulnerableUntil = 1e9;
          const view = viewOf(g, p.id),
            input = {
              ...idleInput(),
              sequence: n,
              clientTick: g.combatTick,
              moveX: n < 80 ? 1 : -1,
              moveY: 0.22,
              sprint: true,
              dodge: [1, 11, 21, 120].includes(n),
            };
          prediction.submit(input, view);
          assert(g.submitInput(p.id, input));
          g.step();
          const predicted = prediction.player!;
          assert(
            Math.hypot(predicted.x - p.x, predicted.y - p.y) < 1e-6,
            classId + "/" + arena.id + "/" + difficulty + "/" + n,
          );
          assert.equal(predicted.dodgeCharges, p.dodgeCharges);
          assert.equal(predicted.sprinting, p.sprinting);
          assert(Math.abs(predicted.sprintStamina - p.sprintStamina) < 1e-6);
          if (difficulty === "hellish") assert.equal(g.maximumShield(p), 0);
        }
      }
});
test("current and known old local saves preserve builds/economy; old online revisions stay strict and new input requires Sprint boolean", () => {
  for (const classId of implementedClassIds) {
    const g = new Game({ mode: "raid", difficulty: "hard" }),
      p = g.addPlayer("solo", "Runner", classId);
    assert(
      buy(g, p, "general-sprint").ok && buy(g, p, "general-double-dash").ok,
    );
    const save = g.offlineCheckpoint()!,
      restored = Game.restoreOffline(save);
    assert.deepEqual(restored.offlineCheckpoint()!.player, save.player);
    assert.equal(restored.skillCost("general-double-dash"), 6);
  }
  const g = new Game({ mode: "raid" });
  g.addPlayer("solo", "Old runner", "heavy");
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 44;
  old.contentRevision = issued;
  const save = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.deepEqual(save.player, old.player);
  assert.equal(save.protocolVersion, PROTOCOL);
  assert.equal(save.contentRevision, CONTENT_REVISION);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      protocolVersion: 44,
      contentRevision: issued,
    }),
  );
  const missing = { ...idleInput() } as Partial<InputFrame>;
  delete missing.sprint;
  assert(!validInput(missing));
  assert(!validInput({ ...idleInput(), sprint: "true" }));
  assert(validInput({ ...idleInput(), sprint: true }));
});
test("old custom controls gain unused Sprint bindings while keeping every prior choice; malformed/current missing fields are not silently repaired", () => {
  const current = defaultControls(),
    old: any = structuredClone(current);
  delete old.bindings.sprint;
  delete old.gamepad.sprint;
  delete old.sprintMode;
  old.bindings.q = ["ShiftLeft"];
  old.gamepad.q = 10;
  old.fireMode = "toggle";
  const next = migrateMobilityControls(old) as ReturnType<
    typeof defaultControls
  >;
  assert(validControls(next));
  assert.notEqual(next.bindings.sprint[0], "ShiftLeft");
  assert.notEqual(next.gamepad.sprint, 10);
  for (const [key, value] of Object.entries(old.bindings))
    assert.deepEqual(next.bindings[key as keyof typeof next.bindings], value);
  for (const [key, value] of Object.entries(old.gamepad))
    assert.equal(next.gamepad[key as keyof typeof next.gamepad], value);
  assert.equal(next.fireMode, "toggle");
  assert.equal(next.sprintMode, "hold");
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.controls = old;
  profile.locale = "ar";
  const parsed = parseProfile(JSON.stringify(profile));
  assert.deepEqual(parsed.controls, next);
  assert.equal(parsed.locale, "ar");
  const bad = freshProfile();
  bad.controls = old;
  assert.throws(() => parseProfile(JSON.stringify(bad)));
  const malformed = { ...old, extra: true };
  assert.equal(migrateMobilityControls(malformed), malformed);
});
test("Sprint keyboard, gamepad and touch support hold/toggle, quick taps, cancel, blocked focus and blur without leaking input", () => {
  class Element extends EventTarget {
    dataset: Record<string, string> = {};
    disabled = false;
    attributes = new Map<string, string>();
    closest() {
      return null;
    }
    setPointerCapture(_n: number) {}
    setAttribute(k: string, v: string) {
      this.attributes.set(k, v);
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 1000 };
    }
  }
  const stage = new Element(),
    touch = new Element(),
    win = new EventTarget();
  touch.dataset.action = "sprint";
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const descriptors = ["window", "document", "navigator", "HTMLElement"].map(
    (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)] as const,
  );
  Object.defineProperties(globalThis, {
    window: { value: win, configurable: true },
    document: {
      value: { querySelectorAll: () => [touch] },
      configurable: true,
    },
    navigator: {
      value: {
        getGamepads: () => [{ connected: true, axes: [0, 0, 0, 0], buttons }],
      },
      configurable: true,
    },
    HTMLElement: { value: Element, configurable: true },
  });
  const event = (
    target: EventTarget,
    type: string,
    values: Record<string, unknown> = {},
  ) => {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, values);
    target.dispatchEvent(e);
  };
  let controls: Controls | undefined;
  try {
    controls = new Controls(stage as unknown as HTMLElement);
    controls.blocked = false;
    controls.sample(0);
    event(win, "keydown", { code: "ShiftLeft" });
    assert(controls.sample(1).sprint);
    assert(controls.sample(2).sprint);
    event(win, "keyup", { code: "ShiftLeft" });
    assert(!controls.sample(3).sprint);
    buttons[10].pressed = true;
    assert(controls.sample(4).sprint);
    assert(controls.sample(5).sprint);
    buttons[10].pressed = false;
    assert(!controls.sample(6).sprint);
    event(touch, "pointerdown", { pointerId: 3 });
    assert(controls.sample(7).sprint);
    assert(controls.sample(8).sprint);
    event(touch, "pointercancel");
    assert(!controls.sample(9).sprint);
    const options = defaultControls();
    options.sprintMode = "toggle";
    controls.configure(options);
    controls.sample(10);
    event(win, "keydown", { code: "ShiftLeft" });
    event(win, "keyup", { code: "ShiftLeft" });
    assert(controls.sample(11).sprint);
    assert(controls.sample(12).sprint);
    event(win, "blur");
    assert(!controls.sample(13).sprint);
    assert.equal(touch.attributes.get("aria-pressed"), "false");
    event(touch, "pointerdown", { pointerId: 4 });
    assert(controls.sample(14).sprint);
    event(touch, "pointerup");
    assert(controls.sample(15).sprint);
    controls.blocked = true;
    assert(!controls.sample(16).sprint);
    controls.blocked = false;
    assert(!controls.sample(17).sprint);
  } finally {
    controls?.destroy();
    for (const [key, descriptor] of descriptors)
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key);
  }
});
test("both skill views expose shared purchases with written costs and localized descriptions; inspecting does not spend", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/shop.ts", {
      "assets.ts":
        "export const assets={items:{},upgrades:{},resourceIcons:{}};",
    });
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("solo", "Runner", "medic"),
    v = viewOf(g, p.id).players[0];
  for (const expanded of [false, true]) {
    env.host.innerHTML =
      '<div class="loadout-editor">' +
      ui.shopMarkup(v, ["1", "2", "3"], expanded) +
      "</div>";
    let purchases = 0;
    const controller = ui.bindShop(
      env.host,
      v,
      () => purchases++,
      ["1", "2", "3"],
      expanded,
    );
    env.host.querySelector('[data-shop-tab="general"]')!.click();
    const sprint = env.host.querySelector('[data-inspect="general-sprint"]')!;
    assert(sprint);
    assert(env.host.querySelector('[data-inspect="general-double-dash"]'));
    sprint.click();
    assert(env.host.textContent.includes("skill.general-sprint.description"));
    assert.equal(purchases, 0);
    env.host.querySelector("#buy-selected")!.click();
    assert.equal(purchases, 1);
    controller.dispose();
  }
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    for (const key of [
      "branch.general",
      "skill.general-sprint.description",
      "skill.general-double-dash.description",
      "ui.sprint",
      "ui.generalMobilityHelp",
    ])
      assert(typeof m[key] === "string" && m[key].length > 0);
  }
});
const genericUnspent=(s:Session)=>s.view!.players.find(p=>p.id===s.id)!.sp;
const wait = async (check: () => boolean) => {
  const end = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < end, "Mobility did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test(
  "actual peers purchase General skills through the server, replicate stamina and dash charges, and host pause freezes resources",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "testing" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const a = new Session("http://127.0.0.1:" + address.port),
      b = new Session("http://127.0.0.1:" + address.port);
    try {
      const options = {
        name: "Runner",
        classId: "soldier" as const,
        mode: "raid" as const,
        difficulty: "hellish",
        openingBossId: "constable" as const,
      };
      await a.connect(options);
      await b.connect(
        { ...options, classId: "medic" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      const purchase = async (s: Session, item: string) => {
        let result: { ok: boolean } | undefined;
        s.onPurchase = (value) => {
          result = value;
        };
        s.purchase({ kind: "skill", item });
        await wait(() => Boolean(result));
        assert(result!.ok);
      };
      await purchase(a, "general-sprint");
      await purchase(a, "general-double-dash");
      await purchase(b, "general-sprint");
    await wait(()=>[a,b].every(s=>s.view?.players.find(p=>p.id===a.id)?.sp===3&&s.view?.players.find(p=>p.id===b.id)?.sp===9));
    assert.equal(genericUnspent(a),3);

      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      a.input({ ...idleInput(), sequence: 1, moveX: 1, sprint: true });
      await wait(
        () => b.view!.players.find((p) => p.id === a.id)!.sprintStamina < 100,
      );
      assert(b.view!.players.find((p) => p.id === a.id)!.sprinting);
      assert.equal(b.view!.players.find((p) => p.id === a.id)!.dodgeMaximum, 2);
      a.input({ ...idleInput(), sequence: 2, moveX: 1, dodge: true });
      await wait(
        () => b.view!.players.find((p) => p.id === a.id)!.dodgeCharges === 1,
      );
      assert(b.view!.players.every((p) => p.maxShield === 0));
      a.setMatchPaused(true);
      await wait(() => a.view?.matchPaused === true);
      const tick = g.combatTick,
        stamina = g.players.get(a.id)!.sprintStamina;
      await new Promise((r) => setTimeout(r, 150));
      assert.equal(g.combatTick, tick);
      assert.equal(g.players.get(a.id)!.sprintStamina, stamina);
      a.setMatchPaused(false);
      await wait(() => a.view?.matchPaused === false);
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test("authoritative multiplayer boundaries retain different General investments per participant and rebuild only legal movement resources", () => {
  const g = new Game({ mode: "raid" }),
    a = g.addPlayer("a", "Runner", "heavy"),
    b = g.addPlayer("b", "Medic", "medic");
  assert(
    buy(g, a, "general-sprint").ok &&
      buy(g, a, "general-double-dash").ok &&
      buy(g, b, "general-double-dash").ok,
  );
  const saved = g.authoritativeCheckpoint()!,
    copy = Game.restoreAuthoritative(saved);
  for (const original of [a, b]) {
    const restored = copy.players.get(original.id)!;
    assert.deepEqual(restored.skills, original.skills);
    assert.equal(restored.totalSp, original.totalSp);
    assert.equal(restored.coins, original.coins);
  }
  copy.start();
  for (const p of copy.players.values()) {
    assert.equal(p.dodgeMaximum, 2);
    assert.equal(p.dodgeCharges, 2);
    assert.equal(p.sprintStamina, 100);
    assert(!p.sprinting);
  }
  assert.throws(() =>
    Game.restoreAuthoritative({ ...saved, contentRevision: issued }),
  );
});
