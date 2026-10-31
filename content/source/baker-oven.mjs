export function applyBakerOven(c) {
  const b = c.bosses.find((b) => b.id === "ash-baker");
  b.lore =
    "Edda Marr baked for the night shift before the council counted flour as furnace fuel. She fed the people outside the cordon from a second set of books, recording portions instead of debts. The order to keep the ovens hot outlived her. The oven in her chest still measures a batch by the number of names waiting for it.";
  b.signature.behavior =
    "Locked rolling batches land as shootable crusts. Freshly warned crumbs open forked or scored routes; the fourth advanced phase leaves an open center before its three-way split. Brutal and Crazed add independently warned later batches.";
  b.signature.counterplay =
    "Leave the rolling body path during its full warning. Shoot a landed crust before its timer ends to cancel its crumbs, or follow the newly warned gaps. One batch can hit each survivor once. Short harmless approaches happen only between complete batches.";
  b.signature.parameters = {
    rollingWarningSeconds: 1.8,
    rollingSeconds: 1.8,
    crumbWarningSeconds: 1.6,
    crumbTravelSeconds: 1.6,
    rollingReachPx: 300,
    crumbReachPx: 225,
    loafRadiusPx: 22,
    crumbRadiusPx: 6,
    crustHealthHP: 25,
    brutalBatchDelaySeconds: 4.3,
    crazedBatchDelaySeconds: 7.2,
    walkingSpeedPxPerSecond: 60,
  };
  b.mechanics = { ...b.signature.parameters };
  const phase = (n, advanced = false) => ({
    healthThreshold: (advanced ? [1, 0.75, 0.5, 0.25] : [1, 0.75, 0.4])[n],
    accordBreak: !advanced && n > 0,
    patternPhase: n,
    attacks: [
      {
        kind: "fan",
        count: [1, 3, 5, 4][n],
        speed: 0,
        damage: 18,
        interval: advanced ? 13 : 8,
        telegraph: 1.8,
        arc: [0, 75, 120, 120][n],
      },
    ],
  });
  b.phases = Array.from({ length: 3 }, (_, n) => phase(n));
  for (const variant of ["brutal", "crazed"])
    b.variants[variant].phases = Array.from({ length: 4 }, (_, n) => ({
      ...phase(n, true),
      signatureRepeatOffsetSeconds: 0,
      attacks: phase(n, true).attacks.map((a) => ({
        ...a,
        comboOffsetSeconds: 0,
      })),
    }));
}
