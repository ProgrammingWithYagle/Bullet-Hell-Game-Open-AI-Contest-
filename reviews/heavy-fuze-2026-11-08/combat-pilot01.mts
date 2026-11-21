import fs from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const root =
    "C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)",
  chat =
    "C:/Users/yigal/Documents/Codex/2026-11-05/continue-grave-accord-in-the-same",
  stage = chat + "/work/heavy-fuse-stage";
const { Game, data } = await import(
    pathToFileURL(root + "/src/shared/game.ts").href
  ),
  { HZ, PROTOCOL, CONTENT_REVISION, idleInput } = await import(
    pathToFileURL(root + "/src/shared/protocol.ts").href
  ),
  { moveBody, segmentRect } = await import(
    pathToFileURL(root + "/src/shared/geometry.ts").href
  ),
  { swordCircleContact } = await import(
    pathToFileURL(root + "/src/shared/sword-geometry.ts").href
  ),
  { flakIds: ids, heavyFlakRules: r } = await import(
    pathToFileURL(root + "/src/shared/heavy-flak.ts").href
  );
const walk = (d: string): string[] =>
    fs
      .readdirSync(root + "/" + d)
      .sort()
      .flatMap((n) => {
        const f = d + "/" + n;
        return fs.statSync(root + "/" + f).isDirectory() ? walk(f) : [f];
      }),
  hash = createHash("sha256");
for (const f of walk("src").sort())
  hash.update(f + "\0").update(fs.readFileSync(root + "/" + f));
const runtime = hash.digest("hex"),
  policyHash = createHash("sha256")
    .update(fs.readFileSync(new URL(import.meta.url)))
    .digest("hex"),
  restore = process.argv[2] === "restore",
  seed = Number(process.argv[3] ?? 2209),
  map = process.argv[4] ?? "gatehouse";
assert(
  [2209, 9027].includes(seed) && ["gatehouse", "triage-yard"].includes(map),
);
const stem = "Heavy-fuze-policy01-" + map + "-" + seed,
  file = chat + "/outputs/" + stem + (restore ? "-restored" : "") + ".json",
  fingerprint = stage + "/fuze-policy01-runtime-" + map + "-" + seed + ".json";
assert(!fs.existsSync(file));
if (restore)
  assert.deepEqual(JSON.parse(fs.readFileSync(fingerprint, "utf8")), {
    runtime,
    policyHash,
  });
else
  fs.writeFileSync(
    fingerprint,
    JSON.stringify({ runtime, policyHash }) + "\n",
    { flag: "wx" },
  );
const rows: any[] = [],
  limits = [
    "Actual native Game input, ordinary health/rewards/purchases and terminal outcomes. No resource/health/position injection, forced clear, deadline/timeout edit, invulnerability or score upload.",
    "One kit-aware policy uses conservative18px steering versus the actual9px body. Preferred ranges are420px for the base round,315px for Close Pattern and530px for Forward Baffle. It considers only current hostile shots within550px and at most40 small candidates for flak placement. Current-velocity forecasts are fallible policy guesses; only actual shared burst contact marks are counted as interceptions. No production targeting is introduced.",
    "Each of three geometries combines optional manual/running/hanging operation with each of three issued General transformations,27builds per map. Manual base6Flak+10General+8mobility+1Endurance+2Ordnance=27SP; manual fitting8+10+8+1=27. Base handling9+10+8=27; fitting+handling11+10+Sprint/Course6=27. Actual ownership gates and failed purchases remain. A hanging first command uses a three-tick current-velocity forecast as a fallible policy guess, then commands an actual stopped point when the one-tick guess is useful. Original captured bearing is used even when velocity is zero. Running can command only one early pulse. Each admitted id counts as one cast; same-id stop updates and arrests are measured separately. Different effects, ranges, opportunities and spending do not rank builds or establish human enjoyment/final balance. Losses, empty bursts and unused operations remain.",
    "Safe noncombat checkpoints preserve ownership rather than unfinished flight/burst/recovery or transient personal shield. Replay resumes input sequence from actual ack. Every combat/progression field, including shield at each actual combat exit, is compared exactly. Raw terminal shield is also compared and any difference is retained; a difference is accepted only when the final secretOffer restore explicitly demonstrates the issued unsaved shield reset to zero. Restore-specific observations/counts are reported separately. No claim of all measured fields matching is made when terminal shield differs. Runtime and policy hashes bind original execution provenance. A burst cleared by an encounter transition before a public cue is sampled is not retroactively assigned contact marks.",
  ];
function save() {
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        baselineMetadata: "4a71eb009966b536f4b3279e0d1e4252f1707118",
        runtimeSourceSha256: runtime,
        policySourceSha256: policyHash,
        policyVersion: "heavy-fuze-policy01",
        protocol: PROTOCOL,
        contentRevision: CONTENT_REVISION,
        seed,
        map,
        rows,
        limits,
      },
      null,
      2,
    ) + "\n",
  );
}
for (const fitting of ["base", "compact", "frontal"])
  for (const general of ["mantlet", "vents", "split"])
   for(const handling of ["manual","running","hanging"]){
    const route = fitting + "-" + handling + "-" + general,
      prefix =
        general === "mantlet"
          ? "heavy-suppression-"
          : general === "vents"
            ? "heavy-suppression-path-1-"
            : "heavy-suppression-path-2-",
      skills = [
        "heavy-ordnance-1",
        ids.entry,
        ...(fitting === "base"
          ? []
          : [fitting === "compact" ? ids.compact : ids.frontal]),
        ids.command,
        ...(handling==="manual"?[]:[ids[handling]]),
        ...Array.from({ length: 4 }, (_, i) => prefix + (i + 1)),
        "general-sprint",
        "general-course-correction",
        ...(handling==="manual"||fitting==="base"?["general-brake-step"]:[]),
        ...(handling==="manual"?["heavy-endurance-1","heavy-ordnance-2"]:[]),
      ];
    let g = new Game({
        mode: "short",
        difficulty: "normal",
        seed,
        maxPlayers: 1,
        arenaSelection: "fixed",
        openingArenaId: map,
      }),
      p = g.addPlayer("solo", "Native Heavy pilot", "heavy"),
      sequence = 0,
      serial = 0,
      lastPhase = "",
      lastEncounter = -1,
      decision = { x: 0, y: 0, danger: 0 },
      iteration = 0;
    const purchases: any[] = [],
      fights: any[] = [],
      casts: any[] = [],
      commands: any[] = [],
      arrests: any[] = [],
      stoppedUpdates: any[] = [],
      seenFlights=new Set<number>(),
      bursts: any[] = [],
      burstReports: any[] = [],
      combatExits: any[] = [],
      restoreShieldObservations: any[] = [],
      seenBursts = new Set<number>(),
      boundaries = new Set<string>();
    const buy = (kind: string, item: string) => {
        const result = g.transact(p.id, {
          id: "heavy-pilot-" + ++serial,
          kind,
          item,
        });
        if (result.ok)
          purchases.push({
            kind,
            item,
            encounter: g.encounter,
            earnedSP: p.totalSp,
          });
        return result.ok;
      },
      shop = () => {
        for (const item of skills)
          if (!p.skills.includes(item)) buy("skill", item);
        const current = data.weapons.find((w) => w.id === p.weapon)!;
        for (const w of data.weapons
          .filter((w) => w.classId === "heavy" && w.tier > current.tier)
          .toSorted((a, b) => b.tier - a.tier))
          if (buy("weapon", w.id)) break;
        for (const u of ["damage", "fire-rate", "health", "reload", "magazine"])
          buy("upgrade", u);
        if (!p.supplies.some((s) => s.id === "medkit" && s.count > 0))
          buy("supply", "medkit");
      };
    const pattern = () =>
        p.skills.includes(ids.compact)
          ? "compact"
          : p.skills.includes(ids.frontal)
            ? "frontal"
            : "base",
      shape = () =>
        pattern() === "frontal"
          ? { radius: r.frontalReach, arc: r.frontalArc }
          : {
              radius: pattern() === "compact" ? r.compactRadius : r.baseRadius,
              arc: Math.PI * 2,
            },
      seconds = () =>
        pattern() === "compact"
          ? r.compactFuseSeconds
          : pattern() === "frontal"
            ? r.frontalFuseSeconds
            : r.fuseSeconds,
      preferred = () =>
        pattern() === "compact" ? 315 : pattern() === "frontal" ? 530 : 420;
    const visible = () =>
        [...g.shots.values()].filter(
          (s) =>
            s.owner === "hostile" && Math.hypot(s.x - p.x, s.y - p.y) < 550,
        ),
      eligible = () =>
        visible()
          .filter(
            (s) =>
              s.radius > 0 &&
              s.radius <= r.maximumHostileRadius &&
              s.expires > g.combatTick,
          )
          .toSorted(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )
          .slice(0, 40);
    const score = (
      point: { x: number; y: number },
      aim: number,
      steps: number,
      hostile: any[],
    ) => {
      let count = 0;
      const geometry = shape();
      for (const s of hostile) {
        if (s.expires <= g.combatTick + steps) continue;
        const target = {
          x: s.x + (s.vx * steps) / HZ,
          y: s.y + (s.vy * steps) / HZ,
        };
        if (
          swordCircleContact(
            point,
            aim,
            geometry.radius,
            geometry.arc,
            target,
            s.radius,
            g.obstacles,
          )
        )
          count++;
      }
      return Math.min(r.projectileLimit, count);
    };
    const plan = () => {
      const hostile = eligible();
      if (!hostile.length) return undefined;
      const n = Math.ceil(seconds() * HZ),
        manual = p.skills.includes(ids.command),
        samples = manual
          ? [3, 7, 11, 15, 19, 23].filter((t) => t < n).concat(n + 1)
          : [n + 1],
        aims = new Set<number>();
      for (const s of hostile.slice(0, 8))
        for (const t of [
          0,
          manual ? Math.min(0.3, seconds() * 0.6) : seconds(),
        ])
          aims.add(Math.atan2(s.y + s.vy * t - p.y, s.x + s.vx * t - p.x));
      let best:
        { aim: number; score: number; plannedSteps: number } | undefined;
      for (const aim of aims) {
        const end = {
          x: p.x + (Math.cos(aim) * r.speed * n) / HZ,
          y: p.y + (Math.sin(aim) * r.speed * n) / HZ,
        };
        let wall = Infinity;
        for (const w of g.obstacles) {
          const hit = segmentRect(p, end, w, r.radius);
          if (hit) wall = Math.min(wall, hit.t);
        }
        for (const steps of samples) {
          const flightSteps = steps === n + 1 ? n : steps - 1,
            fraction = Math.min(flightSteps / n, wall),
            point = {
              x: p.x + (end.x - p.x) * fraction,
              y: p.y + (end.y - p.y) * fraction,
            },
            at =
              wall <= flightSteps / n
                ? Math.max(1, Math.ceil(wall * n))
                : steps,
            value = score(point, aim, at, hostile);
          if (
            value > 0 &&
            (!best ||
              value > best.score ||
              (value === best.score && at < best.plannedSteps))
          )
            best = { aim, score: value, plannedSteps: at };
        }
      }
      return best;
    };
    const steer = () => {
      const boss = g.boss,
        dx = boss.x - p.x,
        dy = boss.y - p.y,
        dist = Math.hypot(dx, dy) || 1,
        tangent = { x: -dy / dist, y: dx / dist },
        speed = g.movementSpeed(p),
        hostile = visible();
      return [
        { x: 0, y: 0 },
        ...Array.from({ length: 16 }, (_, i) => ({
          x: Math.cos((i * Math.PI) / 8),
          y: Math.sin((i * Math.PI) / 8),
        })),
      ]
        .map((move) => {
          const point = moveBody(
              p,
              { x: move.x * speed * 0.3, y: move.y * speed * 0.3 },
              18,
              g.obstacles,
            ),
            vx = (point.x - p.x) / 0.3,
            vy = (point.y - p.y) / 0.3;
          let danger = 0;
          for (const s of hostile) {
            const rx = s.x - p.x,
              ry = s.y - p.y,
              ux = s.vx - vx,
              uy = s.vy - vy,
              t = Math.max(
                0,
                Math.min(0.45, -(rx * ux + ry * uy) / (ux * ux + uy * uy || 1)),
              ),
              near = Math.hypot(rx + ux * t, ry + uy * t) - s.radius - 18;
            danger += near < 0 ? 600 : near < 65 ? 150 / (near + 4) : 0;
          }
          for (const w of g.warnings)
            if (
              w.kind === "zone" &&
              w.until - g.combatTick < HZ &&
              Math.hypot(point.x - w.x, point.y - w.y) < w.radius + 24
            )
              danger += 350;
          for (const l of g.arena.lavaPits)
            if (Math.hypot(point.x - l.x, point.y - l.y) < l.radius + 24)
              danger += 800;
          const range = Math.hypot(point.x - boss.x, point.y - boss.y),
            blocked = g.obstacles.some(
              (w) => segmentRect(point, boss, w, 3) !== null,
            ),
            moving = move.x !== 0 || move.y !== 0;
          return {
            x: move.x,
            y: move.y,
            danger,
            score:
              danger +
              Math.abs(range - preferred()) * 0.035 +
              (range < 95 ? 180 : 0) +
              (blocked ? 18 : 0) +
              (moving
                ? -0.7 * (move.x * tangent.x + move.y * tangent.y)
                : Math.abs(dist - preferred()) < 55
                  ? -1.5
                  : 1),
          };
        })
        .sort((a, b) => a.score - b.score)[0];
    };
    const limit = 30 * 60 * HZ;
    while (
      !["victory", "defeat"].includes(g.phase) &&
      g.combatTick < limit &&
      iteration++ < limit + 30000
    ) {
      if (lastPhase !== g.phase) {
        lastPhase = g.phase;
        console.log(
          JSON.stringify({
            route,
            map,
            seed,
            phase: g.phase,
            encounter: g.encounter,
            seconds: Math.round(g.combatTick / HZ),
          }),
        );
      }
      if (["lobby", "shop"].includes(g.phase)) shop();
      if (
        restore &&
        g.phase !== "combat" &&
        !boundaries.has(g.encounter + ":" + g.phase)
      ) {
        boundaries.add(g.encounter + ":" + g.phase);
        const save = g.offlineCheckpoint();
        assert(save);
        assert(!Object.hasOwn(save.player, "shield"), "Issued safe saves omit transient personal shield.");
        const beforeShield = p.shield;
        const copy = Game.restoreOffline(structuredClone(save));
        restoreShieldObservations.push({encounter:g.encounter, phase:g.phase, beforeShield, afterShield:copy.players.get("solo")!.shield});
        assert.equal(copy.players.get("solo")!.shield,0);
        assert.deepEqual(copy.offlineCheckpoint(), save);
        g = copy;
        p = g.players.get("solo")!;
        sequence = p.ack;
      }
      if (g.phase === "lobby") {
        assert(g.start());
        continue;
      }
      if (
        ["mutationVote", "contractVote"].includes(g.phase) &&
        !g.votes.has(p.id)
      )
        assert(g.vote(p.id, 0));
      if (g.phase === "secretOffer") {
        assert(g.vote(p.id, 0));
        continue;
      }
      const encounter = g.encounter;
      let planned: any;
      if (g.phase === "combat") {
        const now = g.combatTick,
          kit = g.kitStatus(p.id);
        if (lastEncounter !== g.encounter) {
          lastEncounter = g.encounter;
          fights.push({
            encounter: g.encounter,
            boss: g.boss.id,
            startedAt: now,
            earnedSP: p.totalSp,
            skills: [...p.skills],
            weapon: p.weapon,
            health: p.health,
            shield: p.shield,
          });
        }
        if (now % 3 === 0) decision = steer();
        let aim = Math.atan2(g.boss.y - p.y, g.boss.x - p.x),
          fire = true,
          q = p.qAt <= now,
          e = p.eAt <= now,
          ultimate = p.ultimateAt <= now,
          technique1 = false,
          technique2 = false,
          dodge = now % 15 === 0 && decision.danger > 180;
        const own = [...g.shots.values()].find(
          (s) => s.owner === p.id && s.visual === "flak",
        );
        if (
          own &&
          p.skills.includes(ids.command) &&
          !kit.heavyFlakCommandBlocked &&
          score(own,kit.heavyFlakShotAim??Math.atan2(own.vy, own.vx),handling==="hanging"&&!(kit.heavyFlakParkedAt??0)?3:1,eligible()) > 0
        ) {
          technique2 = true;
          ultimate = false;
        } else if (
          p.status === "active" &&
          p.skills.includes(ids.entry) &&
          !kit.heavyFlakBlocked &&
          (kit.technique1At ?? 0) <= now &&
          !dodge &&
          now % 3 === 0
        ) {
          planned = plan();
          if (planned) {
            aim = planned.aim;
            technique1 = true;
            fire = false;
            ultimate = false;
          }
        }
        const supply =
          p.health < p.maxHealth - 35
            ? p.supplies.findIndex((s) => s.id === "medkit" && s.count > 0)
            : -1;
        assert(
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: ++sequence,
            clientTick: now,
            moveX: decision.x,
            moveY: decision.y,
            aim,
            fire,
            q,
            e,
            ultimate,
            technique1,
            technique2,
            dodge,
            sprint: decision.danger > 200,
            supply,
            interact: p.status === "downed",
          }),
        );
      }
      const wasCombat = g.phase === "combat";
      g.step();
      if(wasCombat && g.phase !== "combat") combatExits.push({encounter, nextPhase:g.phase, combatTick:g.combatTick, health:p.health, shield:p.shield, damageTaken:p.damageTaken, damageDealt:p.damageDealt});
      const events = g.drainEvents();
      for (const event of events) {
        if(event.type==="shots")for(const shot of event.shots)if(shot.owner===p.id&&shot.visual==="flak"){
          if(seenFlights.has(shot.id)){assert(shot.vx===0&&shot.vy===0,"An existing flak id is a stopped update, not another cast.");stoppedUpdates.push({encounter,tick:g.combatTick,shot:{...shot},ammo:p.ammo,recovery:g.kitStatus(p.id).technique1At});}
          else{seenFlights.add(shot.id);casts.push({encounter,tick:g.combatTick,shot:{...shot},aim:p.aim,pattern:pattern(),ammo:p.ammo,recovery:g.kitStatus(p.id).technique1At,planned});}
        }
        if (event.type === "sound" && event.owner === p.id) {
          if(event.id==="heavy-flak-arrest")arrests.push({encounter,tick:g.combatTick,ammo:p.ammo,recovery:g.kitStatus(p.id).technique1At});
          if (event.id === "heavy-flak-command")
            commands.push({
              encounter,
              tick: g.combatTick,
              ammo: p.ammo,
              recovery: g.kitStatus(p.id).technique1At,
            });
          if (event.id === "heavy-flak-burst")
            burstReports.push({ encounter, tick: g.combatTick });
        }
      }
      for (const cue of g.classCues())
        if (
          cue.kind === "heavy-flak-burst" &&
          cue.owner === p.id &&
          !seenBursts.has(cue.id)
        ) {
          seenBursts.add(cue.id);
          bursts.push({ ...cue, encounter, observedTick: g.combatTick });
        }
    }
    assert(
      ["victory", "defeat"].includes(g.phase),
      "Policy bound reached without a terminal result; do not manufacture a clear.",
    );
    const row = {
      route,
      fitting,
      general,
      handling,
      phase: g.phase,
      completedEncounters: g.encounter,
      combatSeconds: g.combatTick / HZ,
      damageDealt: p.damageDealt,
      damageTaken: p.damageTaken,
      endingHealth: p.health,
      endingShield: p.shield,
      earnedSP: p.totalSp,
      spentSP: p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      skills: [...p.skills],
      purchases,
      fights,
      casts,
      commands,
      arrests,
      stoppedUpdates,
      bursts,
      burstReports,
      combatExits,
      restoreShieldObservations,
      actualInterceptions: bursts.reduce((n, b) => n + b.contacts.length, 0),
      emptyObservedBursts: bursts.filter((b) => b.contacts.length === 0).length,
      restoredBoundaryCount: boundaries.size,
    };
    assert(row.spentSP <= row.earnedSP && row.earnedSP <= 27);
    assert(
      p.skills.filter(
        (id) =>
          [...data.skills, ...data.specializationSkills].find(
            (s) => s.id === id,
          )?.capstone,
      ).length <= 1,
    );
    rows.push(row);
    save();
    console.log(
      JSON.stringify({
        route,
        result: row.phase,
        clears: row.completedEncounters,
        seconds: row.combatSeconds,
        casts: casts.length,
        manualCommands: commands.length,
        observedBursts: bursts.length,
        actualInterceptions: row.actualInterceptions,
        emptyBursts: row.emptyObservedBursts,
        earnedSP: row.earnedSP,
        spentSP: row.spentSP,
      }),
    );
  }
if (restore) {
  const natural = JSON.parse(
    fs.readFileSync(chat + "/outputs/" + stem + ".json", "utf8"),
  );
  assert.equal(natural.runtimeSourceSha256, runtime);
  assert.equal(natural.policySourceSha256, policyHash);
  const comparisons = rows.map((row) => {
    const first = natural.rows.find((r: any) => r.route === row.route);
    const mismatches=Object.keys(row).filter(k=>!['restoredBoundaryCount','restoreShieldObservations'].includes(k)&&JSON.stringify(row[k])!==JSON.stringify(first[k]));
    const lastRestore=row.restoreShieldObservations.at(-1);
    const shieldDiffers=mismatches.includes('endingShield');
    const expectedTerminalShieldNormalization=shieldDiffers && row.phase==='victory' && first.phase==='victory' && lastRestore?.phase==='secretOffer' && lastRestore.beforeShield===first.endingShield && lastRestore.afterShield===0 && row.endingShield===0 && row.combatExits.at(-1)?.shield===first.endingShield;
    const combatAndProgressionFieldsMatch=mismatches.every(k=>k==='endingShield');
    return {route:row.route,safeRestores:row.restoredBoundaryCount,allMeasuredFieldsMatch:!mismatches.length,combatAndProgressionFieldsMatch,mismatches,terminalShield:{natural:first.endingShield,restored:row.endingShield},expectedTerminalShieldNormalization,passed:combatAndProgressionFieldsMatch&&(!shieldDiffers||expectedTerminalShieldNormalization)};
  });
  const report={checkedAt:new Date().toISOString(),runtimeSourceSha256:runtime,policySourceSha256:policyHash,seed,map,passed:comparisons.every(c=>c.passed),allMeasuredFieldsMatch:comparisons.every(c=>c.allMeasuredFieldsMatch),combatAndProgressionFieldsMatch:comparisons.every(c=>c.combatAndProgressionFieldsMatch),comparisons,limits:['The earlier source67 policy01 terminal-shield failures remain with original provenance. This source68 policy retains all combat-exit and raw terminal shield measures, explicitly checks the issued Practice reset, and binds its changed optional-handling policy/spending to a new hash. It never claims an unchanged policy across content editions.']};
  fs.writeFileSync(chat+'/outputs/'+stem+'-comparison.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  assert(report.passed,JSON.stringify(comparisons));
  console.log(JSON.stringify(report));
}
