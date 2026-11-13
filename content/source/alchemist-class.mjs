import { expandSkills } from './skill-expansion.mjs';
import r from '../../src/shared/alchemy-rules.json' with { type: 'json' };

export const alchemistBranches = [
  ['Reagents', ['A Measured Dose', 'Clean the Nozzle', 'Dry Containers', 'An Even Pressure', 'A Narrow Stream', 'Know What Remains']],
  ['Mixtures', ['Keep Two Apart', 'Label the Glass', 'Test a Small Batch', 'Count the Drops', 'Leave Room to Cool', 'A Repeatable Result']],
  ['Dyehouse', ['Roll the Sleeves', 'Mind the Steam', 'A Sound Apron', 'Air the Room', 'Keep a Spare Cloth', 'Close the Workshop']],
];
const slug = s => s.toLowerCase().replaceAll(' ', '-');

/** The survivor discipline is distinct from the existing Alchemist boss identity. */
export function applyAlchemist(c) {
  if (c.classes.some(cl => cl.id === 'alchemist')) return;
  c.rules.alchemy = structuredClone(r);
  const cl = {
    id: 'alchemist', name: 'Alchemist', survivor: 'Perrin Moss', health: 110, speed: 230,
    color: '#b69b72', weapon: 'alchemist-0',
    role: 'Prepare finite recipes, place delayed flasks and combine your own mixtures.',
    lore: 'Perrin worked in a dyehouse before entering Alchemist training. They trust a repeatable result more readily than a confident explanation, and still keep notes on the batches that went wrong.',
    branches: alchemistBranches.map(([name]) => ({id: slug(name), name})),
    abilities: [
      {id: 'alchemist-q', slot: 'q', kind: 'brew-mixture', name: 'Small Batch', cooldown: r.brewCooldown,
        duration: r.brewTicks / 30, radius: 0, damage: 0,
        description: 'Reserve the selected recipe ingredients and brew for 0.4 seconds at 80% movement. Keep up to two recipe-locked vials. Dodging cancels the brew without refund. Flare costs cinder and chalk; Binding costs chalk and sap; Mending costs cinder and sap. Each costs one of both ingredients.'},
      {id: 'alchemist-e', slot: 'e', kind: 'cast-flask', name: 'Cast Flask', cooldown: r.flaskCooldown,
        duration: r.flightTicks / 30, radius: r.flaskRange, damage: r.recipes.flare.damage,
        description: 'Throw the oldest prepared vial at a chosen point up to 300 units away, including close or self placement. It lands after 0.5 seconds. Flare deals 55 damage; its eight-second pool adds five 4-damage pulses, one every 1.5 seconds. Binding deals 25 and slows ordinary enemies by 40% for three seconds, with five brief slow refreshes in its eight-second pool. Mending restores 18 missing health. Cover blocks placement and splash. Your Flare can consume your Binding pool for 30 extra impact damage; Mending can consume your fire pool without extra healing, forfeiting its remaining pulses.'},
    ],
    ultimate: {id: 'alchemist-ultimate', slot: 'ultimate', kind: 'standard-batch', name: 'Standard Batch', cooldown: r.ultimateCooldown,
      duration: r.ultimateTicks / 30, radius: 0, damage: 0,
      description: 'Restore one of each combat ingredient, up to six each. For fourteen seconds your next three actual throws gain 50% potency and 25% radius. Begin with prepared vials and a ready throw to use the full batch at base cooldown. A miss spends its charge. Casting alone deals no damage and grants no invulnerability.'},
  };
  const base = [];
  for (const [branchIndex, [branch, names]] of alchemistBranches.entries()) {
    for (const [i, name] of names.entries()) {
      const depth = i + 1, branchId = slug(branch);
      const effects = branchIndex === 0
        ? {weaponDamage: [.08,.1,.12,.15,.2,.35][i], fireRate: [0,.04,.06,.08,.12,.16][i]}
        : branchIndex === 1
          ? {abilityPotency: [.05,.05,.08,.1,.12,.2][i], cooldownReduction: [.025,.025,.04,.05,.06,.1][i]}
          : {maxHealth: [8,10,12,16,20,25][i], armor: [0,.02,.03,.04,.05,.08][i], regeneration: [0,.1,.15,.2,.25,.5][i]};
      if (branchIndex === 1 && depth === 3) Object.assign(effects, {alchemyRadius: .05, ultimateCooldownReduction: .1});
      if (branchIndex === 1 && depth === 5) Object.assign(effects, {ultimatePotency: .2});
      if (depth === 6) Object.assign(effects, [{pierce: 1}, {ultimateCharges: 1}, {selfRevives: 1}][branchIndex]);
      base.push({id: 'alchemist-' + branchId + '-' + depth, classId: 'alchemist', branchId, branchName: branch, name, depth,
        cost: depth, grade: c.grades[i * 3], prerequisite: i ? 'alchemist-' + branchId + '-' + i : null,
        capstone: depth === 6, effects, description: 'Additive technique bonuses; shared modifier limits apply.'});
    }
  }
  c.skills.push(...expandSkills(base, [cl], c.grades));
  c.classes.push(cl);
  for (const [tier, [name, damage, fireRate, magazine, reloadTime, projectileSpeed, pierce, price]] of [
    ['Hand Bellows', 18, 2.4, 12, 1.5, 650, 0, 0],
    ['Brass Doser', 28, 2.5, 14, 1.45, 710, 1, 240],
    ['Workshop Bellows', 40, 2.6, 14, 1.4, 770, 1, 460],
    ['Glasshouse Doser', 54, 2.7, 16, 1.35, 830, 2, 720],
  ].entries()) {
    c.weapons.push({id: 'alchemist-' + tier, classId: 'alchemist', name, tier, damage, fireRate, magazine,
      reloadTime, projectileSpeed, pellets: 1, spreadDegrees: 0, pierce, price, reserveAmmo: 'infinite', rangeSeconds: 1.1,
      baselineSustainedDps: Number((damage * magazine / (magazine / fireRate + reloadTime)).toFixed(2))});
  }
}
