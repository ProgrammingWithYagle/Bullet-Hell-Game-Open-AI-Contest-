export function applyShieldSpecializations(c) {
  c.rules.personalShieldCapacity = {
    classBonusLimits: { heavy: 0.5, tank: 0.75 },
    effect: "shieldCapacity",
    calculation:
      "Floor maximum health times difficulty capacity fraction times one plus the bounded class bonus. Hellish always zero. Capacity purchases do not refill shields.",
  };
  for (const [id, branch, bonuses] of [
    ["heavy", "endurance", [0, 0, 0.15, 0, 0.15, 0.2]],
    ["tank", "bastion", [0, 0, 0.25, 0, 0.25, 0.25]],
  ]) {
    const cl = c.classes.find((cl) => cl.id === id),
      path = cl.branches
        .find((b) => b.id === branch)
        .subbranches.find((p) => p.id === branch + "-path-2");
    path.nameKey = "shieldPath." + id + ".name";
    path.name = id === "heavy" ? "Reserve Plating" : "Citadel Lining";
    for (const s of c.skills.filter(
      (s) => s.classId === id && s.subbranchId === path.id,
    )) {
      s.subbranchName = path.name;
      s.subbranchNameKey = path.nameKey;
      const source = c.skills.find((base) => base.id === s.sourceSkillId);
      s.name = source.name + " · " + path.name;
      if (bonuses[s.depth - 1]) s.effects.shieldCapacity = bonuses[s.depth - 1];
      s.description =
        Object.entries(s.effects)
          .filter(([, v]) => v)
          .map(([k, v]) => k + ": " + (v >= 0 ? "+" : "") + v)
          .join("; ") +
        ". Capacity is a bounded class-specific multiplier of the difficulty limit; it grants no refill and cannot override Hellish.";
    }
  }
}
