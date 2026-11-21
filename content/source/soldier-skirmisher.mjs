/** First functional Soldier route: original Q/E/ultimate and General IDs remain. */
export function applySoldierSkirmisher(c) {
  c.specializationSkills = c.specializationSkills.filter(
    (s) => !s.id.startsWith("soldier-skirmisher-"),
  );
  for (const [id, name, grade, depth, prerequisite, role, description] of [
    [
      "soldier-skirmisher-1",
      "Passing Shot",
      "D-",
      1,
      "soldier-ballistics-1",
      "active",
      "After Precision Burst, use action 1 within 1.2 seconds while holding movement: commit a 90-pixel, 0.3-second step and fire a separate 15-base-damage piercing round on arrival. No dodge immunity; blocked ground rejects without spending the opening.",
    ],
    [
      "soldier-skirmisher-advance-1",
      "Crossing Advance",
      "D",
      2,
      "soldier-skirmisher-1",
      "control",
      "Action 1 commits forward along your aim. Split its original follow-up damage between a departure round and an arrival round; aim again for the arrival shot. You commit the route before moving.",
    ],
    [
      "soldier-skirmisher-rear-1",
      "Rear Guard",
      "D",
      2,
      "soldier-skirmisher-1",
      "control",
      "Action 1 commits backward from your aim. Fire its original follow-up round halfway through and intercept at most one visible hostile projectile in the short forward lane. Other shots and fixed hazards remain dangerous.",
    ],
  ])
    c.specializationSkills.push({
      id,
      classId: "soldier",
      branchId: "soldier-pathways",
      branchName: "Specializations",
      subbranchId: "soldier-skirmisher-1",
      subbranchName: "Skirmisher",
      subbranchNameKey: "pathway.soldier-skirmisher-1.name",
      name,
      nameKey: "skill." + id + ".name",
      sourceSkillId: id,
      depth,
      cost: 2,
      grade,
      prerequisite,
      capstone: false,
      effects: {},
      description,
      freePlaySpRequired: depth === 1 ? 3 : 5,
      role,
    });
  c.rules.soldierSkirmisher = {
    followupSeconds: 1.2,
    stepDistance: 90,
    stepSeconds: 0.3,
    followupCooldown: 6,
    shotDamage: 15,
    guardReach: 96,
    guardRadius: 12,
  };
}
