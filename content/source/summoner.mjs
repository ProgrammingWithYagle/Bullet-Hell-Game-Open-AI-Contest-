import { expandSkills } from "./skill-expansion.mjs";
import r from "../../src/shared/summoner-rules.json" with { type: "json" };
export const summonerBranches = [
  [
    "Beaconwork",
    [
      "Steady Signal",
      "Marked Work",
      "Clear Approach",
      "Paired Rhythm",
      "Long Attention",
      "A Name to Follow",
    ],
  ],
  [
    "Bonds",
    [
      "Call and Answer",
      "Room for Another",
      "Shared Task",
      "A Little Patience",
      "Kept Company",
      "The Whole Retinue",
    ],
  ],
  [
    "Waykeeping",
    [
      "Dry Cord",
      "Light Pack",
      "A Place Beside",
      "Familiar Road",
      "Resting Knot",
      "The Way Home",
    ],
  ],
];
const slug = (s) => s.toLowerCase().replaceAll(" ", "-");
export function applySummoner(c) {
  if (c.classes.some((cl) => cl.id === "summoner")) return;
  c.rules.summoner = structuredClone(r);
  const cl = {
    id: "summoner",
    name: "Summoner",
    survivor: "Joss Merrow",
    health: 105,
    speed: 245,
    color: "#9fbf8e",
    weapon: "summoner-0",
    role: "Call a bounded retinue, mark its work and keep its members alive through orders and physical recall.",
    lore: "Joss organized market deliveries before entering Summoner training. He remembers promises more easily than he remembers to leave enough time to keep them.",
    branches: summonerBranches.map(([name]) => ({ id: slug(name), name })),
    abilities: [
      {
        id: "summoner-q",
        slot: "q",
        kind: "retinue-call",
        name: "Call Retinue",
        cooldown: r.musterCooldown,
        duration: 0,
        radius: 68,
        damage: 0,
        description:
          "Call one Tatterhound and one Lanternwing into clear nearby space, up to four permanent companions. Existing companions keep their health. A full or blocked call spends no cooldown. Companions have real health, movement and attacks; they disappear with their owner or encounter.",
      },
      {
        id: "summoner-e",
        slot: "e",
        kind: "retinue-gather",
        name: "Gather",
        cooldown: r.gatherCooldown,
        duration: r.gatherTicks / 30,
        radius: r.gatherArrivalRange,
        damage: 0,
        description:
          "For four seconds, send the living retinue physically back to you at 40% extra movement speed. Each companion present at the cast can recover 12 base health once after arriving. No teleport, resurrection, repeated-arrival healing or invulnerability.",
      },
    ],
    ultimate: {
      id: "summoner-ultimate",
      slot: "ultimate",
      kind: "open-muster",
      name: "Open Muster",
      cooldown: r.ultimateCooldown,
      duration: r.ultimateTicks / 30,
      radius: r.focusAggroRadius,
      damage: 0,
      effects: {
        companions: r.ultimateWarders,
        damageMultiplier: r.ultimateDamageMultiplier,
      },
      description:
        "Call up to two temporary Wickerwards for 16 seconds and strengthen retinue damage by 25% for that interval. Bodies obey the same health, cover, orders and eight-companion owner limit. Expiration removes temporary forms without an explosion or refund.",
    },
  };
  const base = [];
  for (const [branchIndex, [branch, names]] of summonerBranches.entries())
    for (const [i, name] of names.entries()) {
      const depth = i + 1,
        branchId = slug(branch),
        effects =
          branchIndex === 0
            ? {
                weaponDamage: [0.06, 0.08, 0.1, 0.12, 0.16, 0.25][i],
                summonDamage: [0.03, 0.04, 0.05, 0.06, 0.08, 0.12][i],
              }
            : branchIndex === 1
              ? {
                  abilityPotency: [0.05, 0.05, 0.08, 0.1, 0.12, 0.2][i],
                  cooldownReduction: [0.02, 0.025, 0.035, 0.045, 0.06, 0.08][i],
                }
              : {
                  maxHealth: [6, 8, 12, 15, 20, 25][i],
                  armor: [0, 0.025, 0.035, 0.045, 0.06, 0.08][i],
                  regeneration: [0, 0.05, 0.1, 0.15, 0.2, 0.35][i],
                };
      if (branchIndex === 1 && depth === 3)
        effects.ultimateCooldownReduction = 0.1;
      if (branchIndex === 1 && depth === 5)
        Object.assign(effects, {
          ultimateCooldownReduction: 0.1,
          ultimatePotency: 0.2,
        });
      if (depth === 6)
        Object.assign(
          effects,
          [
            { summonDamage: 1.5 },
            { retinueCapacity: 2, ultimateDuration: 4 },
            { selfRevives: 1 },
          ][branchIndex],
        );
      base.push({
        id: "summoner-" + branchId + "-" + depth,
        classId: "summoner",
        branchId,
        branchName: branch,
        name,
        depth,
        cost: depth,
        grade: c.grades[i * 3],
        prerequisite: i ? "summoner-" + branchId + "-" + i : null,
        capstone: depth === 6,
        effects,
        description:
          "Additive technique bonuses; shared modifier and retinue limits apply.",
      });
    }
  c.skills.push(...expandSkills(base, [cl], c.grades));
  c.classes.push(cl);
  for (const [tier, row] of [
    ["Caller’s Baton", 10, 2.5, 12, 1.5, 640, 0, 0],
    ["Braided Staff", 12, 2.6, 14, 1.45, 670, 0.12, 240],
    ["Surveyor’s Crook", 14, 2.7, 14, 1.4, 700, 0.25, 460],
    ["Company Standard", 22, 2.8, 16, 1.35, 730, 0.4, 720],
  ].entries()) {
    const [
      name,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      summonBond,
      price,
    ] = row;
    c.weapons.push({
      id: "summoner-" + tier,
      classId: "summoner",
      name,
      tier,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      pellets: 1,
      spreadDegrees: 1.5,
      pierce: 0,
      price,
      reserveAmmo: "infinite",
      rangeSeconds: 2,
      summonBond,
      baselineSustainedDps: Number(
        ((damage * magazine) / (magazine / fireRate + reloadTime)).toFixed(2),
      ),
    });
  }
}
