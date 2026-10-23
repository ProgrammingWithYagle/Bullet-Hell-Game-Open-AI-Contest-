import catalog from '../../content/catalog.json' with { type: 'json' };
import { clamp } from './geometry.ts';
export type Build = {
  classId: string;
  weapon: string;
  skills: string[];
  upgrades: Record<string, number>;
};
export const gradeCapacity = (index: number) =>
  catalog.rules.buildRating.gradeGrowth ** clamp(index, 0, catalog.grades.length - 1);
export function gradeIndex(rating: number) {
  let index = 0;
  while (index + 1 < catalog.grades.length && rating + 1e-10 >= gradeCapacity(index + 1)) index++;
  return index;
}
export const buildGrade = (rating: number) => catalog.grades[gradeIndex(rating)];
// Published role-normalized rating. Temporary mutations, auras and player execution do not change it.
export function rateBuild(build: Build) {
  const cl = catalog.classes.find((c) => c.id === build.classId)!;
  const weapon = catalog.weapons.find((w) => w.id === build.weapon && w.classId === build.classId)!;
  const base = catalog.weapons.find((w) => w.id === cl.weapon)!;
  const effects: Record<string, number> = {};
  for (const id of build.skills) {
    const skill = catalog.skills.find((s) => s.id === id && s.classId === build.classId);
    if (skill)
      for (const [k, v] of Object.entries(skill.effects)) effects[k] = (effects[k] ?? 0) + v;
  }
  for (const upgrade of catalog.upgrades)
    effects[upgrade.effect] =
      (effects[upgrade.effect] ?? 0) +
      clamp(build.upgrades[upgrade.id] ?? 0, 0, upgrade.maximum) * upgrade.amount;
  const magazine = Math.max(1, weapon.magazine + (effects.magazine ?? 0));
  const damage = weapon.damage * clamp(1 + (effects.weaponDamage ?? 0), 0.35, 4);
  const projectiles = weapon.pellets + clamp(Math.floor(effects.extraShots ?? 0), 0, 3);
  const fireRate = weapon.fireRate * clamp(1 + (effects.fireRate ?? 0), 0.35, 2.5);
  const reload = weapon.reloadTime * clamp(1 - (effects.reloadReduction ?? 0), 0.4, 2);
  const offense =
    (damage * projectiles * magazine) / (magazine / fireRate + reload) / base.baselineSustainedDps;
  const survival =
    clamp(cl.health + (effects.maxHealth ?? 0), cl.health * 0.3, cl.health * 2.5) /
    cl.health /
    (1 - clamp(effects.armor ?? 0, 0, 0.65));
  const support =
    clamp(1 + (effects.abilityPotency ?? 0), 0.5, 2) /
    clamp(1 - (effects.cooldownReduction ?? 0), 0.4, 1.6);
  const weights = catalog.rules.buildRating.weights;
  return offense * weights.offense + survival * weights.survival + support * weights.support;
}
export function equivalentBuilds(required: number, partySize: number) {
  const index = gradeIndex(required / Math.max(1, partySize));
  const indices = [index, Math.min(catalog.grades.length - 1, index + 3)];
  return [...new Set(indices)].map((i) => ({
    grade: catalog.grades[i],
    count: Math.max(1, Math.ceil(required / gradeCapacity(i))),
  }));
}
