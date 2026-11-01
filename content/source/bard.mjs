import { expandSkills } from "./skill-expansion.mjs";

export const bardBranches = [
  [
    "Notecraft",
    [
      "Clean Reed",
      "Even Bellows",
      "Clear Interval",
      "Carried Note",
      "Open Register",
      "The Unbroken Line",
    ],
  ],
  [
    "Performance",
    [
      "Leave a Breath",
      "Hear the Answer",
      "Hold the Room",
      "Room for Another",
      "Unhurried Return",
      "A Song Continued",
    ],
  ],
  [
    "Company",
    [
      "Mended Strap",
      "Shared Bench",
      "Light Case",
      "A Spare Place",
      "Steady Company",
      "After the Applause",
    ],
  ],
];
const slug = (text) => text.toLowerCase().replaceAll(" ", "-");
export function applyBard(c) {
  if (c.classes.some((cl) => cl.id === "bard")) return;
  const cl = {
    id: "bard",
    name: "Bard",
    survivor: "Iven Cair",
    health: 100,
    speed: 225,
    color: "#cfad69",
    weapon: "bard-0",
    role: "Cadenced note fire, close support and selective projectile control.",
    lore: "Iven Cair spent years moving scenery for other people's performances. Newly admitted to the Bard discipline, he is learning to leave a pause long enough for someone else to answer.",
    branches: bardBranches.map(([name]) => ({ id: slug(name), name })),
    abilities: [
      {
        id: "bard-q",
        slot: "q",
        kind: "resolving-phrase",
        name: "Resolving Phrase",
        cooldown: 12,
        duration: 1.5,
        radius: 145,
        damage: 20,
        description:
          "Spend up to 3 cadence for three moving pulses, 0.75 seconds apart. Each deals 20 + 5 per cadence damage, slows ordinary enemies by 25%, and refreshes nearby allies' shield to 6 + 3 per cadence for 2 seconds. Shields use the strongest value and respect difficulty limits.",
      },
      {
        id: "bard-e",
        slot: "e",
        kind: "cut-in",
        name: "Cut In",
        cooldown: 15,
        duration: 0.25,
        radius: 210,
        damage: 65,
        description:
          "Strike along a narrow line toward the aim point, stopping at cover. Deal 65 damage and erase up to 8 hostile projectiles on that line. Warnings, beams, fields and already chosen attack positions are unchanged.",
      },
    ],
    ultimate: {
      id: "bard-ultimate",
      slot: "ultimate",
      name: "Encore",
      kind: "encore",
      cooldown: 90,
      duration: 6,
      radius: 205,
      damage: 36,
      effects: { pulses: 6, allyShield: 18, ordinaryEnemySlow: 0.75 },
      description:
        "Spend cadence to place a six-pulse performance at your feet. One pulse each second deals 36 + 4 per cadence damage and refreshes 18 + 2 per cadence shield for nearby allies. The stage stays in place. It does not heal, revive, erase hazards or stack identical shields.",
    },
  };
  const base = [];
  for (const [branchIndex, [name, names]] of bardBranches.entries())
    for (const [index, skillName] of names.entries()) {
      const depth = index + 1,
        branchId = slug(name),
        effects =
          branchIndex === 0
            ? {
                weaponDamage: [0.08, 0.1, 0.12, 0.15, 0.2, 0.35][index],
                fireRate: [0, 0.04, 0.06, 0.08, 0.12, 0.16][index],
              }
            : branchIndex === 1
              ? {
                  cooldownReduction: [0.025, 0.025, 0.04, 0.05, 0.06, 0.1][
                    index
                  ],
                  abilityPotency: [0.05, 0.05, 0.08, 0.1, 0.12, 0.2][index],
                }
              : {
                  maxHealth: [10, 12, 15, 20, 25, 30][index],
                  armor: [0, 0.03, 0.04, 0.05, 0.06, 0.1][index],
                  regeneration: [0, 0.1, 0.15, 0.2, 0.25, 0.5][index],
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
            { pierce: 2 },
            { phraseRadius: 0.5, ultimateDuration: 2 },
            { selfRevives: 1 },
          ][branchIndex],
        );
      base.push({
        id: "bard-" + branchId + "-" + depth,
        classId: "bard",
        branchId,
        branchName: name,
        name: skillName,
        depth,
        cost: depth,
        grade: c.grades[index * 3],
        prerequisite: index ? "bard-" + branchId + "-" + index : null,
        capstone: depth === 6,
        effects,
        description:
          "Additive technique bonuses; shared modifier limits apply.",
      });
    }
  c.skills.push(...expandSkills(base, [cl], c.grades));
  c.classes.push(cl);
  const rows = [
    ["Road Concertina", 18, 3, 12, 1.5, 700, 1, 2, 0, 0],
    ["Hall Concertina", 18, 4.5, 18, 1.6, 760, 1, 2, 1, 240],
    ["Three-Reed Box", 12, 4, 18, 1.8, 720, 3, 16, 0, 460],
    ["Long-Hall Concertina", 34, 4, 16, 1.7, 900, 1, 1, 2, 720],
  ];
  for (const [
    tier,
    [
      name,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      pellets,
      spreadDegrees,
      pierce,
      price,
    ],
  ] of rows.entries())
    c.weapons.push({
      id: "bard-" + tier,
      classId: "bard",
      name,
      tier,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      pellets,
      spreadDegrees,
      pierce,
      price,
      reserveAmmo: "infinite",
      rangeSeconds: 1.6,
      baselineSustainedDps: Number(
        (
          (damage * pellets * magazine) /
          (magazine / fireRate + reloadTime)
        ).toFixed(2),
      ),
    });
}
