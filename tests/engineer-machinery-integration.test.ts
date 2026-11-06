import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { idleInput, HZ } from "../src/shared/protocol.ts";
import { machineryIds as ids } from "../src/shared/engineer-machinery.ts";
import { BOSS_DEFEAT_TICKS } from "../src/shared/boss-defeat-flow.ts";
import { Controls } from "../src/client/controls.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const wait = async (check: () => boolean, label = "network state") => {
  const deadline = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < deadline, "Timed out: " + label);
    await new Promise((r) => setTimeout(r, 15));
  }
};

test(
  "Real peers receive owned carriage orders and extra-action cooldowns; host pause freezes a committed rail and rejects queued use",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const host = new Session("http://127.0.0.1:" + address.port),
      ally = new Session("http://127.0.0.1:" + address.port),
      late = new Session("http://127.0.0.1:" + address.port);
    try {
      const options = {
        name: "Tamsin",
        classId: "engineer" as const,
        mode: "endless" as const,
        difficulty: "normal",
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Survey engineer" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      // Isolated late-run fixture; purchases and use still cross the real server boundary.
      g.encounter = 9;
      for (const p of g.players.values()) p.totalSp = 27;
      for (const [peer, skills] of [
        [host, [ids.anchor, ids.coil, ids.prism, ids.salvage, ids.convergence]],
        [ally, [ids.survey, ids.coil]],
      ] as const) {
        for (const item of [
          "engineer-constructs-1",
          "engineer-machinery-1",
          ...skills,
        ]) {
          peer.purchase({ kind: "skill", item });
          await wait(() => g.players.get(peer.id)!.skills.includes(item), item);
        }
      }
      host.start();
      await wait(() => ally.view?.phase === "combat");
      g.obstacles.splice(0);
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.x = 1250;
      g.boss.y = 200;
      g.boss.health = g.boss.maxHealth = 1e6;
      for (const [i, peer] of [host, ally].entries()) {
        const p = g.players.get(peer.id)!;
        p.x = p.oldX = 800;
        p.y = p.oldY = 700 + i * 150;
        p.invulnerableUntil = 1e9;
        peer.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
      }
      await wait(
        () => g.classKits.constructs().filter((t) => t.machinery).length === 2,
      );
      await wait(
        () =>
          g.combatTick >
          Math.max(...g.classKits.constructs().map((t) => t.commandAt ?? 0)),
      );
      host.input({ ...idleInput(), sequence: 2, aim: 0, q: true });
      ally.input({ ...idleInput(), sequence: 2, aim: 0, q: true });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) =>
              c.kind === "turret" &&
              c.owner === host.id &&
              c.order === "anchor",
          ) &&
          !!host.view?.classCues.some(
            (c) =>
              c.kind === "turret" &&
              c.owner === ally.id &&
              c.order === "waypoint",
          ),
      );
      host.input({ ...idleInput(), sequence: 3, aim: 0, technique1: true });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "engineer-coil" && c.owner === host.id,
          ),
      );
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused);
      const tick = g.combatTick,
        at = g.kitStatus(host.id).technique1At,
        allyAt = g.kitStatus(ally.id).technique1At;
      assert(at! > tick);
      ally.input({ ...idleInput(), sequence: 3, aim: 0, technique1: true });
      await new Promise((r) => setTimeout(r, 160));
      assert.equal(g.combatTick, tick);
      assert.equal(g.kitStatus(ally.id).technique1At, allyAt);
      await late.connect(
        { ...options, name: "Late observer", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(
        () =>
          !!late.view?.matchPaused &&
          !!late.view.classCues.some(
            (c) => c.kind === "engineer-coil" && c.owner === host.id,
          ),
      );
      assert.equal(
        late.view!.players.find((p) => p.id === host.id)!.kit.technique1At,
        at,
      );
      assert(
        !late
          .view!.players.find((p) => p.id === late.id)!
          .skills.includes(ids.coil),
      );
      host.setMatchPaused(false);
      await wait(() => !ally.view?.matchPaused);
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "engineer-beam" && c.owner === host.id,
          ),
      );
      assert.equal(
        g.kitStatus(ally.id).technique1At,
        allyAt,
        "Paused input was discarded",
      );
      await wait(
        () =>
          !g
            .classCues()
            .some((c) => c.kind === "engineer-coil" && c.owner === host.id),
      );
      const qAt = g.players.get(host.id)!.qAt;
      host.input({ ...idleInput(), sequence: 4, aim: 0, technique2: true });
      await wait(
        () =>
          !!ally.view?.players.find((p) => p.id === host.id)?.kit.technique2At,
      );
      assert.equal(g.players.get(host.id)!.qAt, qAt - 6 * HZ);
      assert(
        !g.classKits
          .constructs()
          .some((t) => t.machinery && t.owner === host.id),
      );
      assert(
        g.classKits
          .constructs()
          .some((t) => t.machinery && t.owner === ally.id),
      );
      assert(g.kitStatus(host.id).technique2At! > g.combatTick);
      assert.equal(g.kitStatus(ally.id).technique2At, 0);
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test("Normal Free Play encounter rewards admit Machinery in stages and preserve an affordable 27-SP paired late build", () => {
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("solo", "Tamsin", "engineer"),
    purchases: { id: string; earned: number }[] = [];
  const buy = (id: string) => {
    assert(g.transact(p.id, { id, kind: "skill", item: id }).ok, id);
    purchases.push({ id, earned: p.totalSp });
  };
  buy("engineer-constructs-1");
  buy("engineer-machinery-1");
  g.start();
  const plan = [
    [ids.anchor, 5],
    [ids.coil, 11],
    [ids.prism, 17],
    [ids.salvage, 21],
    [ids.convergence, 27],
  ] as const;
  for (let stage = 0; stage < 9; stage++) {
    assert.equal(String(g.phase), "combat");
    p.invulnerableUntil = 1e9;
    g.boss.health = 0;
    g.step();
    let transitions = 0;
    while (String(g.phase) !== "shop") {
      assert(++transitions < BOSS_DEFEAT_TICKS + 10);
      g.phaseEnds = g.tick;
      g.step();
    }
    for (const [id, threshold] of plan)
      if (p.totalSp >= threshold && !p.skills.includes(id)) buy(id);
    if (stage < 8)
      while (String(g.phase) !== "combat") {
        g.phaseEnds = g.tick;
        g.step();
      }
  }
  assert.deepEqual(
    purchases.slice(2).map((x) => x.earned),
    [5, 11, 19, 21, 27],
  );
  assert.equal(p.totalSp, 27);
  assert.equal(
    p.skills.reduce((n, id) => n + g.skillCost(id), 0),
    21,
  );
  assert.equal(g.phase, "shop");
  const pair = data.skills.find(
      (s) => "transform" in s && s.transform === "crossfire-pair",
    )!,
    chain: string[] = [];
  let node: typeof pair | undefined = pair;
  while (node) {
    chain.unshift(node.id);
    node = data.skills.find((s) => s.id === node!.prerequisite);
  }
  for (const id of chain) if (!p.skills.includes(id)) buy(id);
  assert.equal(
    p.skills.reduce((n, id) => n + g.skillCost(id), 0),
    27,
  );
  assert(p.skills.includes(pair.id));
  assert.equal(
    p.skills.filter(
      (id) =>
        data.skills.find((s) => s.id === id)?.capstone ||
        data.specializationSkills.find((s) => s.id === id)?.capstone,
    ).length,
    1,
  );
  const restored = Game.restoreOffline(g.offlineCheckpoint()!);
  assert.deepEqual(restored.players.get("solo")!.skills, p.skills);
});

test("The two earned actions support remapped keyboard, gamepad and touch pulses, with blur and blocked-input suppression", () => {
  class Element extends EventTarget {
    dataset: Record<string, string> = {};
    disabled = false;
    closest() {
      return null;
    }
    setPointerCapture() {}
    setAttribute() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 1000 };
    }
  }
  const stage = new Element(),
    first = new Element(),
    second = new Element(),
    win = new EventTarget();
  first.dataset.action = "technique1";
  second.dataset.action = "technique2";
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false })),
    originals = ["window", "document", "navigator", "HTMLElement"].map(
      (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)] as const,
    );
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: win },
    document: {
      configurable: true,
      value: { querySelectorAll: () => [first, second] },
    },
    navigator: {
      configurable: true,
      value: {
        getGamepads: () => [{ connected: true, axes: [0, 0, 0, 0], buttons }],
      },
    },
    HTMLElement: { configurable: true, value: Element },
  });
  const event = (
    target: EventTarget,
    type: string,
    fields: Record<string, unknown> = {},
  ) => {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, fields);
    target.dispatchEvent(e);
  };
  let controls: Controls | undefined;
  try {
    controls = new Controls(stage as unknown as HTMLElement);
    const options = defaultControls();
    options.bindings.technique1 = ["KeyZ"];
    options.bindings.technique2 = ["KeyG"];
    options.gamepad.technique1 = 16;
    options.gamepad.technique2 = 8;
    controls.configure(options);
    controls.blocked = false;
    controls.sample(0);
    event(win, "keydown", { code: "KeyZ" });
    event(win, "keyup", { code: "KeyZ" });
    assert(controls.sample(1).technique1);
    assert(!controls.sample(2).technique1);
    buttons[16].pressed = true;
    assert(controls.sample(3).technique1);
    assert(!controls.sample(4).technique1);
    buttons[16].pressed = false;
    controls.sample(5);
    event(second, "pointerdown", { pointerId: 1, pointerType: "touch" });
    assert(controls.sample(6).technique2);
    assert(!controls.sample(7).technique2);
    event(second, "pointerup");
    event(win, "keydown", { code: "KeyG" });
    event(win, "blur");
    assert(!controls.sample(8).technique2);
    controls.blocked = true;
    event(first, "pointerdown", { pointerId: 2 });
    buttons[8].pressed = true;
    assert(!controls.sample(9).technique2);
    controls.blocked = false;
    assert(!controls.sample(10).technique2);
    buttons[8].pressed = false;
    controls.sample(11);
    buttons[8].pressed = true;
    assert(controls.sample(12).technique2);
  } finally {
    controls?.destroy();
    for (const [key, descriptor] of originals)
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key);
  }
});
