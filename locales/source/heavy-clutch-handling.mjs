import {
  applyHeavyClutchHandling,
  copy,
} from "../../content/source/heavy-clutch-handling.mjs";
export function heavyClutchHandlingMessages() {
  const c = { specializationSkills: [] };
  applyHeavyClutchHandling(c);
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
