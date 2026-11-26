export const bellCounterpointRules = {
  gridSpacing: 32,
  clearance: 6,
  minimumWalk: 144,
  maximumWalk: 340,
  walkWarning: 0.65,
  walkSpeed: 175,
  lateWalkSpeed: 190,
  approachRange: 210,
  ringWarning: 1.1,
  returnWarning: 1.5,
  ringSpeeds: [210, 225, 240, 250],
  ringDamage: 14,
  ringWidth: 12,
  gapDegrees: 35,
  gapStepDegrees: 30,
  strikeGap: 0.6,
  restSeconds: 1.05,
  holdRadius: 300,
  quietSeconds: 0.8,
  resumeWarning: 1.2,
  resumeGapTurnDegrees: 60,
  beatSeconds: 0.8,
  brutalBeatSeconds: 0.6,
  echoBeatSeconds: 0.75,
  echoOffsetSeconds: 0.55,
  echoWarning: 1.6,
  echoDamage: 12,
  echoClearance: 30,
  echoMinimumDistance: 180,
  echoMaximumDistance: 430,
  clapperWarning: 1.2,
  clapperActiveSeconds: 0.3,
  clapperBeatSeconds: 1.7,
  clapperHalfAngle: 0.72,
  clapperReach: 340,
  echoClapperReach: 250,
  clapperDamage: 16,
};
export function applyBellCounterpoint(c) {
  const b = c.bosses.find((b) => b.id === "bellringer");
  if (!b) throw Error("Bellringer missing");
  b.signature.behavior =
    "Paired Knell combines two overlapping outward fronts and a warned aimed clapper. Approach closes toward a survivor before three peals and two clapper swings. Counterstroke interleaves inward and outward fronts. Brutal layers four to six peals and multiple clappers without the old exclusive silent hold. Crazed deploys a second bell that plays three or four reply fronts and its own clapper while the primary continues.";
  b.signature.counterplay =
    "The pale approach path is harmless and targets a survivor rather than wandering laterally. Every clapper sector locks with a complete warning; sidestep its marked arc or dash. Each front keeps its 35-degree opening and hits once. Primary and secondary openings share body-clear floor, but new aimed clappers require movement. All sources remain announced. Base grade3, combat, original theme, original eight action frames and eight drawn walking poses are retained. No generic bullet or laser layer is used.";
  b.signature.parameters.carillon = structuredClone(bellCounterpointRules);
  b.variants.crazed.additionalPatterns = [
    "overlapping-peals",
    "clapper-counterpoint",
    "concurrent-responding-bell",
  ];
  for (const [form, phases] of [
    ["normal", b.phases],
    ["brutal", b.variants.brutal.phases],
    ["crazed", b.variants.crazed.phases],
  ])
    for (const [i, p] of phases.entries()) {
      const normal = [
          ["out", "out"],
          ["out", "out", "out"],
          ["out", "in", "out", "out"],
        ],
        advanced = [
          ["out", "out", "in", "out"],
          ["out", "in", "out", "in"],
          ["out", "in", "out", "in", "out"],
          ["out", "in", "out", "in", "out", "in"],
        ];
      p.phaseNameKey = "boss.bellringer.phase." + i;
      p.tollOrder = structuredClone(
        (form === "normal" ? normal : advanced)[
          Math.min(form === "normal" ? 2 : 3, i)
        ],
      );
      p.connectedProcession = true;
      p.resonanceHold = false;
      p.sympatheticBell = form === "crazed";
      p.clapperSwings = form === "normal" ? (i ? 2 : 1) : i >= 3 ? 3 : 2;
    }
}
