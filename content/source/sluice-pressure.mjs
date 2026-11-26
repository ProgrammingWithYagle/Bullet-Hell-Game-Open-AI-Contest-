export function applySluicePressure(c) {
  const b = c.bosses.find((b) => b.id === "sluice-keeper");
  b.lore =
    "Ressa Noll kept the river gates before the council turned flood levels into a list of permitted streets. She opened a relief valve when the lower wards were ordered to wait. The order shut her pump house with her inside it. Her dead hands still test every wheel for the one that can let the city breathe.";
  b.signature.behavior =
    "Bounded currents carry freshly warned moving crests. Shootable valves drain only their own lane and cancel its crest. Paired channels, alternating weaves and a crossed final pressure change the route; advanced returns retain their issuing phase.";
  b.signature.counterplay =
    "The blue water pushes without dealing contact damage. Only the moving crest hurts, after its own full warning. Step onto a dry bank or shoot its valve. Crests wash through cover. Destroying one valve leaves other channels active; no General purchase is required.";
  b.signature.parameters = {
    flowWarningSeconds: 1.8,
    flowSeconds: 5,
    flowForcePxPerSecond: 70,
    maximumCombinedFlowPxPerSecond: 90,
    waveWarningSeconds: 1.8,
    waveDelaySeconds: 0.7,
    waveTravelSeconds: 2.4,
    waveFrontPx: 40,
    valveHealthHP: 30,
    brutalReturnDelaySeconds: 5.1,
    crazedReturnDelaySeconds: 10.2,
    walkingSpeedPxPerSecond: 50,
  };
  b.mechanics = { ...b.signature.parameters };
  const phase = (n, advanced = false) => ({
    healthThreshold: (advanced ? [1, 0.75, 0.5, 0.25] : [1, 0.75, 0.4])[n],
    accordBreak: !advanced && n > 0,
    patternPhase: n,
    attacks: [
      {
        kind: "zone",
        count: [1, 2, 3, 3][n],
        speed: 0,
        damage: 16,
        interval: advanced ? 15 : 10,
        telegraph: 1.8,
        duration: 5,
      },
    ],
  });
  b.phases = Array.from({ length: 3 }, (_, n) => phase(n));
  for (const form of ["brutal", "crazed"])
    b.variants[form].phases = Array.from({ length: 4 }, (_, n) => ({
      ...phase(n, true),
      signatureRepeatOffsetSeconds: 0,
      attacks: phase(n, true).attacks.map((a) => ({
        ...a,
        comboOffsetSeconds: 0,
      })),
    }));
}
