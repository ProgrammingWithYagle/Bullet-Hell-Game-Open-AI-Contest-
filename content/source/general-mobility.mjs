export function applyGeneralMobility(c) {
  c.generalSkills = [
    {
      id: "general-sprint",
      classId: "general",
      name: "Sprint",
      branchId: "general",
      subbranchId: "general-mobility",
      subbranchName: "General mobility",
      subbranchNameKey: "branch.general",
      nameKey: "skill.general-sprint.name",
      sourceSkillId: "general-sprint",
      depth: 1,
      cost: 3,
      grade: c.grades[0],
      prerequisite: null,
      capstone: false,
      effects: { sprintUnlock: 1 },
      description:
        "Spend 3 earned SP to sprint while moving with weapons lowered. Stamina is bounded; sprint grants no invulnerability and preserves terrain slows.",
    },
    {
      id: "general-double-dash",
      classId: "general",
      name: "Double Dash",
      branchId: "general",
      subbranchId: "general-mobility",
      subbranchName: "General mobility",
      subbranchNameKey: "branch.general",
      nameKey: "skill.general-double-dash.name",
      sourceSkillId: "general-double-dash",
      depth: 1,
      cost: 6,
      grade: c.grades[0],
      prerequisite: null,
      capstone: false,
      effects: { dodgeCharges: 1 },
      description:
        "Spend 6 earned SP for a second dodge charge. Charges recharge sequentially using the existing dodge cooldown. A new dodge waits for the current dash to finish.",
    },
  ];
  c.rules.generalMobility = {
    sprintMaximum: 100,
    sprintMultiplier: 1.35,
    sprintDrainPerSecond: 30,
    sprintRecoveryPerSecond: 25,
    sprintRecoveryDelay: 1,
    sprintRestart: 35,
  };
}
