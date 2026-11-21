import { applyHeavyClutch, copy } from "../../content/source/heavy-clutch.mjs";
export function heavyClutchMessages() {
  const c = { specializationSkills: [] };
  applyHeavyClutch(c);
  return {
    ...copy,
    ...Object.fromEntries(
      c.specializationSkills.flatMap((s) => [
        [s.nameKey, s.name],
        ["skill." + s.id + ".description", s.description],
      ]),
    ),
  };
}
