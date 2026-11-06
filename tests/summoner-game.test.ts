import clerkRules from "../src/shared/clerk-appeal-rules.json";
import test from "node:test";
import assert from "node:assert/strict";
import { Game, type Player } from "../src/shared/game.ts";
import {
  idleInput,
  type InputFrame,
  type Shot,
  CONTENT_REVISION,
  PROTOCOL,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
function fixture(mode: "endless" | "story" = "endless") {
  const g = new Game({ mode, maxPlayers: 2, seed: 41 }),
    p = g.addPlayer("p", "Joss", "summoner");
  g.addPlayer("ally", "Mara", "soldier");
  g.start();
  Object.defineProperty(g, "obstacles", { value: [], configurable: true });
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1000;
  g.boss.y = 700;
  for (const player of g.players.values()) {
    player.x = player.oldX = 800;
    player.y = player.oldY = 700;
    player.invulnerableUntil = 1e9;
    player.shield = 0;
  }
  return { g, p };
}
function press(g: Game, p: Player, patch: Partial<InputFrame>) {
  g.submitInput(p.id, {
    ...idleInput(),
    sequence: p.ack + 1,
    aim: 0,
    ...patch,
  });
  g.step();
}
const step = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function hostile(g: Game, x: number, y: number, aim: number, speed = 2400) {
  return (Reflect.get(g, "emitShot") as Function).call(
    g,
    "hostile",
    x,
    y,
    aim,
    speed,
    10,
    3,
  ) as Shot;
}
test("Actual Game calls owned physical companions, spends cooldown only on a useful call and credits their real boss damage", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  assert.equal(g.retinue.owned(p.id).length, 2);
  assert(p.qAt > g.combatTick);
  const before = g.boss.health,
    credited = p.damageDealt;
  step(g, 120);
  assert(g.boss.health < before);
  assert.equal(p.damageDealt - credited, before - g.boss.health);
  assert.equal(
    viewOf(g, p.id).retinue!.filter((e) => e.owner === p.id && e.health > 0)
      .length,
    2,
  );
  assert.equal(viewOf(g, p.id).players[0].kit.retinueCount, 2);
  p.qAt = 0;
  press(g, p, { q: true });
  assert.equal(g.retinue.owned(p.id).length, 4);
  p.qAt = 0;
  press(g, p, { q: true });
  assert.equal(p.qAt, 0, "A full retinue must not spend a Q cooldown");
  assert(!g.orderRetinue("ally", "hold"));
  assert(g.orderRetinue(p.id, "hold"));
  assert(!g.orderRetinue(p.id, { order: "escort", owner: "ally" }));
});
test("Distinct hostile shots damage a companion, stop before the farther owner, and respect intervening masonry", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  const e = g.retinue.owned(p.id)[0];
  e.x = e.oldX = 860;
  e.y = e.oldY = 700;
  e.health = e.maxHealth = 100;
  const hp = p.health;
  // Isolate the swept projectile pass from unit AI movement.
  const shotA = hostile(g, 910, 700, Math.PI, 3000),
    shotB = hostile(g, 910, 700, Math.PI, 3000);
  (Reflect.get(g, "stepShots") as Function).call(g);
  assert.equal(e.health, 80);
  assert.equal(p.health, hp);
  assert(!g.shots.has(shotA.id) && !g.shots.has(shotB.id));
  Object.defineProperty(g, "obstacles", {
    value: [{ x: 880, y: 650, width: 12, height: 100 }],
  });
  const stopped = hostile(g, 910, 700, Math.PI, 3000);
  (Reflect.get(g, "stepShots") as Function).call(g);
  assert.equal(e.health, 80);
  assert(!g.shots.has(stopped.id));
});
test("Existing hostile zones and signature damage hurt companion health even when the owner is invulnerable; fractional damage uses the entity budget", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  const e = g.retinue.owned(p.id)[0];
  e.x = e.oldX = 900;
  e.y = e.oldY = 700;
  e.health = e.maxHealth = 100;
  g.fields.push({
    id: 999999,
    kind: "zone",
    owner: "hostile",
    x: e.x,
    y: e.y,
    radius: 40,
    potency: 10,
    until: 1e9,
  });
  g.combatTick = 30;
  (Reflect.get(g, "stepRetinueHazards") as Function).call(g);
  assert.equal(e.health, 90);
  assert.equal(p.health, p.maxHealth);
  const context = (Reflect.get(g, "signatureContext") as Function).call(g);
  context.damage("retinue:" + e.id, 10);
  assert.equal(e.health, 80);
  context.damageMaximumHealth("retinue:" + e.id, 0.25);
  assert.equal(e.health, 55);
  assert.equal(p.health, p.maxHealth);
  context.damageCurrentHealth("retinue:" + e.id, 0.5, 1);
  assert.equal(e.health, 27.5);
});
test("Only Wickerwards enter boss aiming; ordinary actors can fight the whole retinue without changing player scaling", () => {
  const { g, p } = fixture();
  press(g, p, { q: true, ultimate: true });
  assert.equal(g.retinue.owned(p.id).length, 4);
  const aim = (Reflect.get(g, "aimTargets") as Function).call(g),
    all = (Reflect.get(g, "aimTargets") as Function).call(g, false);
  assert.equal(
    aim.filter((x: { id: string }) => x.id.startsWith("retinue:")).length,
    2,
  );
  assert.equal(
    all.filter((x: { id: string }) => x.id.startsWith("retinue:")).length,
    4,
  );
  assert.equal(g.players.size, 2);
  assert.equal(
    g.authoritativeCheckpoint(),
    null,
    "Combat units must not create a fake safe boundary",
  );
  g.setConnected(p.id, false);
  assert.equal(g.retinue.snapshot().length, 0);
  assert.equal(viewOf(g, "ally").retinue!.length, 0);
});
test("The exact issued nine-class local save migrates to48 without minting Summoner progress, while foreign and authoritative imports stay strict", () => {
  const g = new Game({ mode: "story" });
  g.addPlayer("p", "Dara", "swordsman");
  const saved = g.offlineCheckpoint()!;
  saved.protocolVersion = 47;
  saved.contentRevision =
    "e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd";
  const restored = Game.restoreOffline(structuredClone(saved));
  assert.equal(restored.players.get("solo")?.classId, "swordsman");
  assert.deepEqual(restored.trainingFor("solo"), g.trainingFor("p"));
  assert.equal(restored.offlineCheckpoint()!.protocolVersion, PROTOCOL);
  const forged = structuredClone(saved);
  forged.player.classId = "summoner";
  assert.throws(() => Game.restoreOffline(forged));
  const foreign = structuredClone(saved);
  foreign.contentRevision = "f".repeat(64);
  assert.throws(() => Game.restoreOffline(foreign));
  assert.notEqual(CONTENT_REVISION, saved.contentRevision);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      protocolVersion: 47,
      contentRevision: saved.contentRevision,
    }),
  );
});

test("Companions keep their own poison and slow clocks, while warned health loss bypasses arrival armor", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  const e = g.retinue.owned(p.id)[0];
  e.health = e.maxHealth = 200;
  e.armorUntil = 10000;
  const c = (Reflect.get(g, "signatureContext") as Function).call(g);
  assert(c.damageMaximumHealth("retinue:" + e.id, 0.25));
  assert.equal(
    e.health,
    150,
    "Maximum-health seals do not become armor-mitigated hits",
  );
  assert(c.damageCurrentHealth("retinue:" + e.id, 0.5, 1));
  assert.equal(e.health, 75);
  const before = e.health;
  assert(c.purpleStamp("retinue:" + e.id, 10, true));
  assert.equal(
    e.health,
    before * (1 - clerkRules.purpleCurrentHealthFraction) - 5.5,
  );
  assert(e.poisonUntil > g.combatTick && e.poisonNextAt > g.combatTick);
  const afterImpact = e.health;
  e.target = "";
  e.attackAt = 100000;
  for (let i = 0; i < 30 * clerkRules.purplePoisonIntervalSeconds; i++)
    g.step();
  assert(
    e.health < afterImpact,
    "The accepted stamp keeps damaging the actual companion after impact",
  );
  assert.equal(
    p.health,
    p.maxHealth,
    "Entity poison is not copied onto its invulnerable owner",
  );
  const view = viewOf(g, p.id).retinue!.find((x) => x.id === e.id)!;
  assert(view.poisonUntil > g.combatTick);
  g.fields.push({
    id: 999999,
    kind: "zone",
    owner: "hostile",
    x: e.x,
    y: e.y,
    radius: 100,
    potency: 0,
    until: 1e9,
  });
  (Reflect.get(g, "stepRetinueHazards") as Function).call(g);
  assert(e.slowUntil > g.combatTick);
  assert.equal(
    viewOf(g, p.id).retinue!.find((x) => x.id === e.id)!.slowUntil,
    e.slowUntil,
  );
  g.setConnected(p.id, false);
  assert.equal(g.retinue.snapshot().length, 0);
});


test('Purchased beacon equipment and the later damage capstone strengthen real companions within the same finite stat limits',()=>{
  const g=new Game({mode:'endless'}),p=g.addPlayer('p','Joss','summoner');
  p.coins=p.incomeGranted=3000;p.totalSp=27;
  assert(g.transact(p.id,{id:'tip',kind:'upgrade',item:'damage'}).ok);
  assert(g.transact(p.id,{id:'loop',kind:'upgrade',item:'fire-rate'}).ok);
  g.start();g.boss.staggerUntil=g.boss.deadline=1e9;p.invulnerableUntil=1e9;
  press(g,p,{q:true});
  const h=g.retinue.owned(p.id).find(e=>e.kind==='hound')!,wing=g.retinue.owned(p.id).find(e=>e.kind==='wing')!;
  assert.equal(h.damage,12*1.08);assert.equal(h.attackInterval,Math.ceil(24/1.12));assert.equal(wing.attackInterval,Math.ceil(36/1.12));
  const developed=new Game({mode:'endless'}),v=developed.addPlayer('p','Joss','summoner');v.coins=v.incomeGranted=3000;v.totalSp=27;
  for(const branch of ['beaconwork','bonds'])for(let depth=1;depth<=(branch==='beaconwork'?6:3);depth++)assert(developed.transact(v.id,{id:branch+depth,kind:'skill',item:'summoner-'+branch+'-'+depth}).ok);
  assert(developed.transact(v.id,{id:'standard',kind:'weapon',item:'summoner-3'}).ok);
  developed.start();developed.boss.staggerUntil=developed.boss.deadline=1e9;v.invulnerableUntil=1e9;
  press(developed,v,{q:true});
  assert.equal(developed.retinue.owned(v.id).find(e=>e.kind==='hound')!.damage,48,'Purchased growth reaches the actual fourfold bound');
  assert.equal(developed.retinue.owned(v.id).length,2,'Damage growth does not silently add entities');
});
