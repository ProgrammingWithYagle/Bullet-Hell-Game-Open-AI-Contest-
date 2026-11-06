import { expandSkills } from "./skill-expansion.mjs";
import r from "../../src/shared/ranger-rules.json" with { type: "json" };
export const rangerBranches = [
  [
    "Bowcraft",
    [
      "Set the Nock",
      "A Quiet String",
      "Straight Grain",
      "The Longer Draw",
      "Even Fletching",
      "One Clear Shot",
    ],
  ],
  [
    "Fieldcraft",
    [
      "Read the Ground",
      "Test the Peg",
      "A Spare Cord",
      "Two Ways Through",
      "Room for Another",
      "Leave a Way Back",
    ],
  ],
  [
    "Trailkeeping",
    [
      "Dry Footing",
      "Pack Light",
      "A Steady Breath",
      "Weathered Coat",
      "The Long Walk",
      "Bring Them Home",
    ],
  ],
];
const slug = (s) => s.toLowerCase().replaceAll(" ", "-");
export function applyRanger(c) {
  if (c.classes.some((cl) => cl.id === "ranger")) return;
  c.rules.ranger = structuredClone(r);
  const cl = {
    id: "ranger",
    name: "Ranger",
    survivor: "Nela Venn",
    health: 105,
    speed: 245,
    color: "#82998a",
    weapon: "ranger-0",
    role: "Aim-locked bow draws, prepared triplines and limited firing positions.",
    lore: "Nela copied water-survey routes before beginning Ranger training. She is learning that a path drawn on paper can still fail the person who has to use it.",
    branches: rangerBranches.map(([name]) => ({ id: slug(name), name })),
    abilities: [
      {
        id: "ranger-q",
        slot: "q",
        kind: "drawn-line",
        name: "Drawn Line",
        cooldown: r.lineCooldown,
        duration: r.lineDrawTicks / 30,
        radius: r.lineRange,
        damage: r.lineDamage,
        description:
          "Spend one ready arrow and hold the chosen aim for 0.4 seconds, moving at 55% speed. Release a real 95-damage arrow with 2 pierce and 980 range. Dodging cancels the release without refunding the arrow or cooldown. Cover stops the arrow.",
      },
      {
        id: "ranger-e",
        slot: "e",
        kind: "tripline",
        name: "Tripline",
        cooldown: r.trapCooldown,
        duration: r.trapLifetimeTicks / 30,
        radius: r.trapReach,
        damage: r.trapDamage,
        description:
          "Place a finite cable through legal ground. After 0.8 seconds it can catch an actual enemy crossing, deal 45 damage and slow ordinary enemies by 40% for 3 seconds. A cable lasts 20 active seconds; at most 2 are placed initially. Bosses take damage without a root or attack cancellation. Full or blocked placements spend no cooldown.",
      },
    ],
    ultimate: {
      id: "ranger-ultimate",
      slot: "ultimate",
      kind: "survey-circuit",
      name: "Surveyor's Circuit",
      cooldown: r.ultimateCooldown,
      duration: r.surveyTicks / 30,
      radius: r.surveyRadius,
      damage: 0,
      effects: {
        positions: 2,
        chargesPerPosition: r.surveyChargesPerPoint,
        weaponDamageBonus: r.surveyDamageBonus,
        pierce: r.surveyPierce,
      },
      description:
        "Prepare up to two legal fixed firing positions for 8 seconds. Within 34 units, each position empowers 3 committed primary arrows with 60% damage and 1 pierce. Spend the nearest position's charge when drawing, including cancelled shots. Moving away gives no boost; casting alone deals no damage or invulnerability.",
    },
  };
  const base = [];
  for (const [branchIndex, [branch, names]] of rangerBranches.entries())
    for (const [i, name] of names.entries()) {
      const depth = i + 1,
        branchId = slug(branch);
      const effects =
        branchIndex === 0
          ? {
              weaponDamage: [0.08, 0.1, 0.12, 0.15, 0.2, 0.35][i],
              fireRate: [0, 0.04, 0.06, 0.08, 0.12, 0.16][i],
            }
          : branchIndex === 1
            ? {
                abilityPotency: [0.05, 0.05, 0.08, 0.1, 0.12, 0.2][i],
                cooldownReduction: [0.025, 0.025, 0.04, 0.05, 0.06, 0.1][i],
              }
            : {
                maxHealth: [8, 10, 12, 16, 20, 25][i],
                armor: [0, 0.02, 0.03, 0.04, 0.05, 0.08][i],
                regeneration: [0, 0.1, 0.15, 0.2, 0.25, 0.5][i],
              };
      if (branchIndex === 1 && depth === 3)
        Object.assign(effects, {
          rangerTrapDuration: 3,
          rangerTrapCapacity: 1,
          ultimateCooldownReduction: 0.1,
        });
      if (branchIndex === 1 && depth === 5)
        Object.assign(effects, { ultimatePotency: 0.2 });
      if (depth === 6)
        Object.assign(
          effects,
          [{ pierce: 1 }, { ultimateCharges: 1 }, { selfRevives: 1 }][
            branchIndex
          ],
        );
      base.push({
        id: "ranger-" + branchId + "-" + depth,
        classId: "ranger",
        branchId,
        branchName: branch,
        name,
        depth,
        cost: depth,
        grade: c.grades[i * 3],
        prerequisite: i ? "ranger-" + branchId + "-" + i : null,
        capstone: depth === 6,
        effects,
        description:
          "Additive technique bonuses; shared modifier limits apply.",
      });
    }
  c.skills.push(...expandSkills(base, [cl], c.grades));
  c.classes.push(cl);
  for (const [
    tier,
    [
      name,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      pierce,
      price,
    ],
  ] of [
    ["Survey Bow", 24, 1.6, 10, 1.6, 760, 0, 0],
    ["Ashwood Bow", 38, 1.7, 10, 1.5, 820, 1, 240],
    ["Crossing Bow", 51, 1.85, 11, 1.45, 880, 1, 460],
    ["Watershed Bow", 68, 2, 12, 1.35, 940, 2, 720],
  ].entries())
    c.weapons.push({
      id: "ranger-" + tier,
      classId: "ranger",
      name,
      tier,
      damage,
      fireRate,
      magazine,
      reloadTime,
      projectileSpeed,
      pellets: 1,
      spreadDegrees: 0,
      pierce,
      price,
      reserveAmmo: "infinite",
      rangeSeconds: 1.25,
      delivery: "arrow",
      baselineSustainedDps: Number(
        ((damage * magazine) / (magazine / fireRate + reloadTime)).toFixed(2),
      ),
    });
}
