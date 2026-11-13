/** Defensive construction has its own geometry, commitments and acquired controls. */
export function applyEngineerBuilder(c) {
  const entries = [
    [
      "entry",
      "Field Screen",
      "D-",
      2,
      0,
      "engineer-constructs-1",
      "entry",
      "Q assembles a finite owned screen instead of a turret. It takes half a second to brace; friendly movement remains clear.",
    ],
    [
      "longspan",
      "Longspan Panels",
      "D",
      2,
      5,
      "engineer-builder-1",
      "control",
      "Build one broad screen with the same health spread over a longer frontage. Excludes Return Wings.",
    ],
    [
      "wings",
      "Return Wings",
      "D",
      2,
      5,
      "engineer-builder-1",
      "control",
      "Build two angled side screens instead of a flat front. They share the original health budget and leave the central approach exposed. Excludes Longspan Panels.",
    ],
    [
      "hinge",
      "Hinged Assembly",
      "D+",
      2,
      8,
      "engineer-builder-1",
      "active",
      "Add action1: fold and pivot a nearby owned screen group to a fixed aimed heading. Folded panels cannot block shots.",
    ],
    [
      "repair",
      "Field Maintenance",
      "B-",
      3,
      11,
      "engineer-builder-1",
      "active",
      "Add action2: stay still for a committed repair to one damaged owned wall. No player healing, shield or lifetime extension.",
    ],
    [
      "linked",
      "Linked Foundations",
      "B+",
      3,
      15,
      "engineer-builder-repair-1",
      "evolution",
      "Maintain two separate Q screen groups at once. Each keeps its own original lifetime and assembly window.",
    ],
    [
      "survey",
      "Survey Frame",
      "A-",
      3,
      17,
      "engineer-builder-hinge-1",
      "evolution",
      "Evolve the hinge action to fold and shift a screen group toward a fixed work point before rebracing. Existing health and expiry remain.",
    ],
    [
      "redoubt",
      "Keystone Redoubt",
      "SS+",
      6,
      27,
      "engineer-builder-linked-1",
      "capstone",
      "Impossible Machine also assembles three finite cover panels on clear ground around its original position. The machine keeps its issued behavior; losing it removes its fortification.",
    ],
  ];
  const idFor = (s) =>
    s === "entry" ? "engineer-builder-1" : "engineer-builder-" + s + "-1";
  const ids = new Set(entries.map(([s]) => idFor(s)));
  c.specializationSkills = c.specializationSkills.filter((s) => !ids.has(s.id));
  c.specializationSkills.push(
    ...entries.map(
      ([
        suffix,
        name,
        grade,
        cost,
        freePlaySpRequired,
        prerequisite,
        role,
        description,
      ]) => ({
        id: idFor(suffix),
        classId: "engineer",
        branchId: "engineer-pathways",
        branchName: "Specializations",
        subbranchId: "engineer-builder-1",
        subbranchName: "Builder",
        subbranchNameKey: "pathway.engineer-builder-1.name",
        name,
        nameKey: "skill." + idFor(suffix) + ".name",
        sourceSkillId: idFor(suffix),
        depth:
          suffix === "entry"
            ? 1
            : role === "capstone"
              ? 4
              : role === "evolution"
                ? 3
                : 2,
        cost,
        grade,
        prerequisite,
        capstone: role === "capstone",
        effects: {},
        description,
        freePlaySpRequired,
        role,
      }),
    ),
  );
  Object.assign(c.rules.engineerPathways, {
    builderReach: 120,
    builderHalfSpan: 110,
    builderLongSpan: 190,
    builderWingSpan: 75,
    builderWingSide: 85,
    builderWingBack: 70,
    builderWingAngle: Math.PI / 3,
    builderHealth: 100,
    builderSeconds: 30,
    builderAssemblySeconds: 0.5,
    builderPivotSeconds: 0.5,
    builderPivotCooldown: 6,
    builderWorkReach: 320,
    builderSurveySeconds: 0.8,
    builderSurveyCooldown: 8,
    builderSurveyDistance: 120,
    builderRepairReach: 180,
    builderRepairSeconds: 0.8,
    builderRepairCooldown: 16,
    builderRepairHealth: 45,
    builderRepairMovement: 8,
    builderFortHealth: 90,
    builderFortHalfSpan: 100,
    builderFortOffset: 110,
    builderFortSeconds: 12,
    builderFortAssemblySeconds: 0.8,
  });
}
