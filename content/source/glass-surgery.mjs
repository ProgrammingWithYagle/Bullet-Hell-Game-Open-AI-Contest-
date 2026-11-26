export function applyGlassSurgery(c) {
  const b = c.bosses.find((b) => b.id === "glass-surgeon");
  b.lore =
    "Dr. Oren Pell ground lenses for the city infirmary. Ordered to certify patients by the color of their eyes, he shattered the council’s measuring glass instead. The arm he rebuilt from its fragments still searches for a diagnosis that cannot become a sentence.";
  b.signature.behavior =
    "Shootable mirror lenses lock branching refraction rays. Diagnostic, relay and forked optical casts change the route; advanced returns and a separately warned Crazed incision leave time between pulses.";
  b.signature.counterplay =
    "Read the complete dashed path. Move away before it becomes solid or shoot a lens to disable every segment linked to it. Rays pass through cover. Each pulse hits once; no mobility purchase is required.";
  b.signature.parameters = {
    lenses: 3,
    lensHealthHP: 25,
    beamWidthPx: 12,
    warningSeconds: 2,
    activeSeconds: 1.25,
    brutalReturnDelaySeconds: 3.3,
    crazedIncisionDelaySeconds: 5.7,
    cycleSeconds: 7.5,
  };
  b.mechanics = { ...b.signature.parameters };
  const phase = (n, advanced = false) => ({
    healthThreshold: advanced ? [1, 0.75, 0.5, 0.25][n] : [1, 0.75, 0.4][n],
    accordBreak: !advanced && n > 0,
    patternPhase: n,
    attacks: [
      {
        kind: "beam",
        count: 1,
        speed: 0,
        damage: 20,
        interval: advanced ? 8.5 : 7.5,
        telegraph: 2,
        duration: 1.25,
        width: 12,
      },
      {
        kind: "fan",
        count: 5 + n * 2,
        speed: 130 + n * 12,
        damage: 9,
        interval: 7 - n * 0.4,
        telegraph: 1.2,
        arc: 90 + n * 6,
      },
    ],
  });
  b.phases = Array.from({ length: 3 }, (_, n) => phase(n));
  for (const v of ["brutal", "crazed"])
    b.variants[v].phases = Array.from({ length: 4 }, (_, n) => ({
      ...phase(n, true),
      signatureRepeatOffsetSeconds: 0,
      attacks: phase(n, true).attacks.map((a) => ({
        ...a,
        comboOffsetSeconds: 0,
      })),
    }));
}
