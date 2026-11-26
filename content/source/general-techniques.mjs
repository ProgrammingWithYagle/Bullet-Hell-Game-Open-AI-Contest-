/** Add shared control techniques without changing issued mobility purchases. */
export function applyGeneralTechniques(c) {
  const entries = [
    [
      "general-brake-step",
      "Brake Step",
      "D",
      2,
      null,
      1,
      "Press Dodge again during a dodge to stop its movement. The original protection deadline and charge recovery stay unchanged.",
    ],
    [
      "general-course-correction",
      "Course Correction",
      "D+",
      3,
      "general-sprint",
      2,
      "During a dodge, hold Sprint and change movement direction to spend stamina on one turn of up to 90 degrees.",
    ],
  ];
  const ids = new Set(entries.map(([id]) => id));
  c.generalSkills = c.generalSkills.filter((s) => !ids.has(s.id));
  c.generalSkills.push(
    ...entries.map(
      ([id, name, grade, cost, prerequisite, depth, description]) => ({
        id,
        classId: "general",
        name,
        branchId: "general",
        subbranchId: "general-footwork",
        subbranchName: "Shared footwork",
        subbranchNameKey: "ui.generalFootwork",
        nameKey: "skill." + id + ".name",
        sourceSkillId: id,
        depth,
        cost,
        grade,
        prerequisite,
        capstone: false,
        effects: {},
        description,
      }),
    ),
  );
  Object.assign(c.rules.generalMobility, {
    courseStaminaCost: 20,
    courseMinimumTurn: Math.PI / 6,
    courseMaximumTurn: Math.PI / 2,
  });
}
