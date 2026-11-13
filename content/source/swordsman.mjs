import { expandSkills } from "./skill-expansion.mjs";
import r from "../../src/shared/sword-rules.json" with { type: "json" };
export const swordsmanBranches = [
  [
    "Edgework",
    [
      "Sound Edge",
      "Plain Grip",
      "Even Stroke",
      "Turned Wrist",
      "The Long Draw",
      "One Clean Line",
    ],
  ],
  [
    "Measure",
    [
      "Set the Distance",
      "Room to Recover",
      "The Waiting Hand",
      "Held Ground",
      "Short Advance",
      "A Useful Silence",
    ],
  ],
  [
    "Footwork",
    [
      "Dry Soles",
      "Easy Shoulders",
      "Balanced Stance",
      "A Spare Breath",
      "Firm Ground",
      "The Way Back",
    ],
  ],
];
const slug = (s) => s.toLowerCase().replaceAll(" ", "-");
export function applySwordsman(c) {
  if (c.classes.some((cl) => cl.id === "swordsman")) return;
  c.rules.swordsman = structuredClone(r);
  const cl = {
    id: "swordsman",
    name: "Swordsman",
    survivor: "Dara Flint",
    health: 130,
    speed: 240,
    color: "#b77d62",
    weapon: "swordsman-0",
    role: "Committed sword cuts, measured advances and bounded frontal counters.",
    lore: "Dara worked at a grinding bench before beginning sword training. She can judge an edge more easily than she can admit she has misjudged a distance.",
    branches: swordsmanBranches.map(([name]) => ({ id: slug(name), name })),
    abilities: [
      {
        id: "swordsman-q",
        slot: "q",
        kind: "measured-cut",
        name: "Measured Cut",
        cooldown: r.measureCooldown,
        duration: r.measureWindupTicks / 30,
        radius: r.measureReach,
        damage: r.measureDamage,
        description:
          "Commit for 0.2 seconds on the chosen aim, then advance up to 90 units through clear ground and cut for 75 damage within 130 units. Cover blocks the movement and blade. Dodging cancels the committed cut; this grants no invulnerability.",
      },
      {
        id: "swordsman-e",
        slot: "e",
        kind: "frontal-guard",
        name: "Frontal Guard",
        cooldown: r.guardCooldown,
        duration: r.guardTicks / 30,
        radius: r.guardOffset,
        damage: 0,
        description:
          "Hold the chosen frontal guard for 11 ticks, stopping at most 3 incoming projectiles at the blade. A real parry opens a 3-second counter: the next committed primary cut deals 60% more damage. Beams, fields, melee damage and existing warnings remain dangerous. Dodging cancels the guard.",
      },
    ],
    ultimate: {
      id: "swordsman-ultimate",
      slot: "ultimate",
      kind: "long-measure",
      name: "Long Measure",
      cooldown: r.ultimateCooldown,
      duration: r.ultimateTicks / 30,
      radius: r.ultimateReach,
      damage: 0,
      effects: {
        cuts: r.ultimateCuts,
        weaponDamageMultiplier: r.ultimateMultiplier,
      },
      description:
        "For 7 seconds, the next 3 committed primary cuts gain 40 reach and 35% damage. Misses and cancelled cuts spend their charge. This is an attack stance, not automatic damage, projectile reflection or invulnerability.",
    },
  };
  const base = [];
  for (const [branchIndex, [branch, names]] of swordsmanBranches.entries())
    for (const [i, name] of names.entries()) {
      const depth = i + 1,
        branchId = slug(branch),
        effects =
          branchIndex === 0
            ? {
                weaponDamage: [0.08, 0.1, 0.12, 0.15, 0.2, 0.35][i],
                fireRate: [0, 0.04, 0.06, 0.08, 0.12, 0.16][i],
              }
            : branchIndex === 1
              ? {
                  cooldownReduction: [0.025, 0.025, 0.04, 0.05, 0.06, 0.1][i],
                  abilityPotency: [0.05, 0.05, 0.08, 0.1, 0.12, 0.2][i],
                }
              : {
                  maxHealth: [10, 12, 15, 20, 25, 30][i],
                  armor: [0, 0.03, 0.04, 0.05, 0.06, 0.1][i],
                  regeneration: [0, 0.1, 0.15, 0.2, 0.25, 0.5][i],
                };
      if (branchIndex === 1 && depth === 3)
        effects.ultimateCooldownReduction = 0.1;
      if (branchIndex === 1 && depth === 5)
        Object.assign(effects, {
          ultimateCooldownReduction: 0.1,
          ultimatePotency: 0.25,
        });
      if (depth === 6)
        Object.assign(
          effects,
          [
            { bladeReach: 0.2 },
            { bladeReach: 0.35, ultimateCharges: 1 },
            { selfRevives: 1 },
          ][branchIndex],
        );
      base.push({
        id: "swordsman-" + branchId + "-" + depth,
        classId: "swordsman",
        branchId,
        branchName: branch,
        name,
        depth,
        cost: depth,
        grade: c.grades[i * 3],
        prerequisite: i ? "swordsman-" + branchId + "-" + i : null,
        capstone: depth === 6,
        effects,
        description:
          "Additive technique bonuses; shared modifier limits apply.",
      });
    }
  c.skills.push(...expandSkills(base, [cl], c.grades));
  c.classes.push(cl);
  const rows = [
    ["Bench Sword", 48, 1.8, 7, 1.2, 108, 100, 0, 0],
    ["Watch Longsword", 58, 1.9, 8, 1.3, 118, 105, 1, 240],
    ["Counterweight Blade", 64, 2, 8, 1.35, 126, 110, 2, 460],
    ["Gate-Hand Sword", 82, 2.1, 9, 1.4, 138, 110, 2, 720],
  ];
  for (const [
    tier,
    [
      name,
      damage,
      fireRate,
      magazine,
      reloadTime,
      meleeReach,
      meleeArcDegrees,
      pierce,
      price,
    ],
  ] of rows.entries())
    c.weapons.push({
      id: "swordsman-" + tier,
      classId: "swordsman",
      name,
      tier,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed: 0,
      pellets: 1,
      spreadDegrees: 0,
      pierce,
      price,
      reserveAmmo: "infinite",
      rangeSeconds: 0,
      delivery: "melee",
      meleeReach,
      meleeArcDegrees,
      baselineSustainedDps: Number(
        ((damage * magazine) / (magazine / fireRate + reloadTime)).toFixed(2),
      ),
    });
}
