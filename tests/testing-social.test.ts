import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Worker } from "node:worker_threads";
import { RoomChat, chatText } from "../src/shared/room-chat.ts";
import { publicRunSettings } from "../src/shared/public-run.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  applyTestingCommand,
  validTestingCommand,
} from "../src/client/testing-command.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { Client } from "@colyseus/sdk";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import {
  freshProfile,
  changeProfile,
  parseProfile,
  recordProfileView,
  loadProfile,
  PROFILE_KEY,
} from "../src/client/profile.ts";
import { viewOf } from "../src/shared/view.ts";
import { localRecords } from "../src/client/local-records.ts";
import { defaultPreferences } from "../src/client/preferences.ts";
const until = async (check: () => boolean) => {
  const end = Date.now() + 7000;
  while (!check()) {
    if (Date.now() > end)
      throw Error("Expected real-network state did not arrive");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("public new runs ignore chosen opening bosses and use a varied authored entry pool", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    const settings = publicRunSettings({
      seed,
      mode: "short",
      openingBossId: "uncounted",
    });
    assert(settings.openingBossId);
    assert.notEqual(settings.openingBossId, "uncounted");
    seen.add(settings.openingBossId);
  }
  assert(seen.size >= 8);
});
test("bounded Solo test values change actual available points and coins, reject malformed requests and disable checkpoint saving", () => {
  const g = createPracticeGame(
    { mode: "endless", seed: 17 },
    "Mara",
    "soldier",
  );
  for (const bad of [
    null,
    { coins: -1, sp: 3 },
    { coins: 1, sp: 1.5 },
    { coins: 1, sp: 1001 },
    { coins: 1, sp: 1, extra: true },
  ])
    assert(!validTestingCommand(bad));
  assert(applyTestingCommand(g, { coins: 1234, sp: 99 }));
  const view = viewOf(g, "solo");
  assert.equal(view.players[0].coins, 1234);
  assert.equal(view.players[0].sp, 99);
  assert.equal(view.run.testingModified, true);
  assert.equal(g.offlineCheckpoint(), null);
  g.phase = "defeat";
  assert(!applyTestingCommand(g, { coins: 1, sp: 1 }));
});
test("a run modified by testing tools is removed from local records rather than awarding profile progress", () => {
  const g = createPracticeGame(
    { mode: "endless", seed: 19 },
    "Mara",
    "soldier",
  );
  g.start();
  g.boss.health = 0;
  g.step();
  const map = new Map<string, string>(),
    store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
  recordProfileView(viewOf(g, "solo"), "solo", store);
  assert.equal(loadProfile(store).runs.length, 1);
  changeProfile(store, (profile) => {
    for (let i=0;i<4;i++) profile.runs.push({...profile.runs[0],runId:"other-run-"+i});
    profile.selectedCosmetic="bronze-bell";
  });
  g.testingModified = true;
  recordProfileView(viewOf(g, "solo"), "solo", store);
  assert.equal(loadProfile(store).runs.length, 4);
  assert.equal(loadProfile(store).selectedCosmetic,"field-mark");
  assert(map.has(PROFILE_KEY));
});
test("known issued profiles migrate name/chat defaults and preserve explicit off choices", () => {
  const p = freshProfile(),
    old = structuredClone(p) as any;
  old.contentRevision =
    "39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d";
  delete old.settings.showNames;
  delete old.settings.roomChat;
  const migrated = parseProfile(JSON.stringify(old));
  assert(migrated.settings.showNames && migrated.settings.roomChat);
  assert.equal(migrated.contentRevision, CONTENT_REVISION);
  p.settings.showNames = false;
  p.settings.roomChat = false;
  assert.deepEqual(parseProfile(JSON.stringify(p)).settings, p.settings);
  assert.equal(Object.keys(defaultPreferences()).length, 11);
});
test("room chat normalizes plain text, rejects markup/control payloads, enforces opt-in/rate limits and retains only fifty messages", () => {
  assert.equal(chatText("  Cafe\u0301  "), "Café");
  for (const bad of [
    "",
    "<script>x</script>",
    "a\u202eb",
    "x".repeat(161),
    {},
    "\u0000hello",
  ])
    assert.equal(chatText(bad), null);
  const chat = new RoomChat();
  assert.equal(chat.accept("a", "Mara", "hello", 1000), null);
  chat.subscribe("a", true);
  assert(chat.accept("a", "Mara", "hello", 1000));
  assert.equal(chat.accept("a", "Mara", "too soon", 2000), null);
  for (let i = 0; i < 70; i++)
    assert(chat.accept("a", "Mara", "message " + i, 3000 + i * 1500));
  assert.equal(chat.history().length, 50);
  assert(chat.historyAllowed("a", 200000));
  assert(!chat.historyAllowed("a", 200001));
  chat.remove("a");
  assert.equal(chat.accept("a", "Mara", "off", 300000), null);
});
test("local leaderboard records partition mode/difficulty and show actual clears without inventing verified scores", () => {
  const base = {
    runId: "r1",
    playerId: "solo",
    mode: "short" as const,
    difficulty: "normal",
    classId: "soldier" as const,
    clears: 2,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 2,
    bossIds: ["constable" as const],
    teamClears: 2,
    combatTicks: 300,
    fullCampaign: false,
    memorial: false,
  };
  const rows = localRecords(
    [
      base,
      { ...base, runId: "r2", clears: 3 },
      { ...base, runId: "other", difficulty: "hard" },
    ],
    "short",
    "normal",
  );
  assert.deepEqual(
    rows.map((r) => r.runId),
    ["r2", "r1"],
  );
  assert(rows.every((r) => !("score" in r) && !("verified" in r)));
});
function receive(w: Worker, check: (m: any) => boolean) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(
      () => done(Error("Worker evidence timed out")),
      7000,
    );
    const message = (m: any) => {
      if (check(m)) done(undefined, m);
    };
    function done(error?: Error, m?: any) {
      clearTimeout(timer);
      w.off("message", message);
      error ? reject(error) : resolve(m);
    }
    w.on("message", message);
  });
}
test(
  "the compiled public Solo worker removes testing commands and overrides chosen boss/form while testing worker changes real state",
  { timeout: 25000 },
  async () => {
    for (const testing of [false, true]) {
      const result = await build({
        entryPoints: ["src/client/offline.worker.ts"],
        bundle: true,
        platform: "node",
        format: "esm",
        minify: true,
        write: false,
        define: { __GA_TESTING_BUILD__: String(testing) },
        logLevel: "silent",
      });
      if (!testing)
        assert(!result.outputFiles[0].text.includes("testingCommand"));
      const code =
        "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
        result.outputFiles[0].text +
        ";parentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
      const w = new Worker(
        new URL(
          "data:text/javascript;base64," + Buffer.from(code).toString("base64"),
        ),
        { execArgv: [] },
      );
      try {
        await receive(w, (m) => m.type === "ready");
        const first = receive(w, (m) => m.type === "view");
        w.postMessage({
          type: "init",
          settings: {
            openingBossId: "gate-widow",
            seed: 491,
            mode: "endless",
            difficulty: "normal",
          },
          name: "Mara",
          classId: "soldier",
          practiceVariant: "crazed",
        });
        const before = (await first).view;
        if (testing) {
          const changed = receive(
            w,
            (m) => m.type === "view" && m.view.run.testingModified,
          );
          w.postMessage({
            type: "testingCommand",
            value: { coins: 5555, sp: 99 },
          });
          const v = (await changed).view;
          assert.equal(v.players[0].coins, 5555);
          assert.equal(v.players[0].sp, 99);
        } else {
          w.postMessage({
            type: "testingCommand",
            value: { coins: 5555, sp: 99 },
          });
          const read = receive(w, (m) => m.type === "view");
          w.postMessage({ type: "pause", value: true });
          const v = (await read).view;
          assert.equal(v.players[0].coins, before.players[0].coins);
          assert(!v.run.testingModified);
          const combat = receive(
            w,
            (m) => m.type === "view" && m.view.phase === "combat",
          );
          w.postMessage({ type: "start" });
          const start = (await combat).view;
          assert.notEqual(start.boss.id, "gate-widow");
          assert.equal(start.boss.variant, "normal");
        }
      } finally {
        await w.terminate();
      }
    }
  },
);
test(
  "real room peers receive bounded server-named chat, opt out, and cannot submit currency commands",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      a = new Session(endpoint),
      b = new Session(endpoint);
    a.setChatEnabled(true);
    b.setChatEnabled(true);
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "short" as const,
        difficulty: "normal",
      };
      await a.connect(options);
      await b.connect({ ...options, name: "Ally" }, { roomId: a.room!.roomId });
      await until(() => a.status === "ui.ready" && b.status === "ui.ready");
      assert(a.sendChat("Hold the open lane"));
      await until(
        () => b.chatMessages.length === 1 && a.chatMessages.length === 1,
      );
      assert.equal(b.chatMessages[0].name, "Host");
      assert.equal(b.chatMessages[0].senderId, a.id);
      assert(a.sendChat("rate limited"));
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(b.chatMessages.length, 1);
      b.setChatEnabled(false);
      await new Promise((r) => setTimeout(r, 1550));
      assert(a.sendChat("After the warning"));
      await until(() => a.chatMessages.length === 2);
      assert.equal(b.chatMessages.length, 0);
      const g = liveRooms.get(a.room!.roomId)!.game,
        before = g.players.get(a.id)!.coins;
      a.room!.send("testingCommand", { coins: 999999, sp: 999 });
      await new Promise((r) => setTimeout(r, 80));
      assert.equal(g.players.get(a.id)!.coins, before);
      assert(!g.testingModified);
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);
test(
  "public room construction rejects explicit boss injection and ordinary clients receive a random authored opening",
  { timeout: 15000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "public" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      s = new Session(endpoint);
    try {
      const client = new Client(endpoint);
      await assert.rejects(
        client.create("grave", {
          mode: "short",
          difficulty: "normal",
          visibility: "public",
          openingBossId: "uncounted",
          protocolVersion: PROTOCOL,
          contentRevision: CONTENT_REVISION,
          createKey: crypto.randomUUID(),
          name: "Attempt",
          classId: "soldier",
        }),
      );
      await s.connect({
        name: "Mara",
        classId: "soldier",
        mode: "short",
        difficulty: "normal",
        openingBossId: "uncounted",
      });
      await until(() => s.status === "ui.ready");
      const g = liveRooms.get(s.room!.roomId)!.game;
      assert.notEqual(g.settings.openingBossId, "uncounted");
      assert(!g.testingModified);
    } finally {
      await s.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test("Session immediately removes a newly modified run even when phase and progress stay identical", () => {
  const g=createPracticeGame({mode:"endless",seed:919},"Mara","soldier");
  g.start();g.boss.health=0;g.step();
  const map=new Map<string,string>(),store={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};
  const prior=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:store});
  try {
    const session=new Session(),receive=(session as unknown as {receive(view:ReturnType<typeof viewOf>):void}).receive.bind(session);
    receive(viewOf(g,"solo"));assert.equal(loadProfile(store).runs.length,1);
    g.testingModified=true;
    receive(viewOf(g,"solo"));assert.equal(loadProfile(store).runs.length,0);
    assert.notEqual(session.status,"ui.errorSave");
  } finally {
    if(prior)Object.defineProperty(globalThis,"localStorage",prior);
    else Reflect.deleteProperty(globalThis,"localStorage");
  }
});
