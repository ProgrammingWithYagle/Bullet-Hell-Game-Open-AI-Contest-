export const clerkAppealRules = {
  stampRadius: 82,
  stampCounts: { normal: 3, brutal: 5, crazed: 10 },
  stampSeverities: {
    normal: ["red", "red", "red"],
    brutal: ["red", "purple", "red", "purple", "red"],
    crazed: [
      "red",
      "purple",
      "red",
      "black",
      "purple",
      "red",
      "black",
      "purple",
      "red",
      "red",
    ],
  },
  volleyOrigins: { normal: 2, brutal: 3, crazed: 4 },
  stampRadii: { normal: 82, brutal: 72, crazed: 58 },
  stampWarnings: { normal: 1.3, brutal: 1.5, crazed: 1.8 },
  stampSpacing: { normal: 0.65, brutal: 0.3, crazed: 0.18 },
  advancedSetGapSeconds: 0.35,
  advancedPreviousCenterGap: 64,
  purpleStampDamage: 10,
  blackCurrentHealthFraction: 0.75,
  blackMinimumHealth: 1,
  stampClearance: 10,
  stampSeparation: 20,
  gridSpacing: 32,
  warningSeconds: 1.3,
  spacingSeconds: 0.65,
  activeSeconds: 2.5,
  lateReopenDelaySeconds: 0.4,
  patrolDistance: 144,
  patrolSpeed: 72,
  patrolWarningSeconds: 0.65,
  recoverySeconds: 0.75,
  betweenSequencesSeconds: 1.5,
  stampDamage: 5,
  contactSeconds: 0.5,
  volleyCount: 7,
  volleyArc: 1.15,
  volleyWarningSeconds: 1.2,
  volleyAfterOpenSeconds: 0.5,
  volleyTravelSeconds: 1.05,
  volleyMinimumSpeed: 180,
  volleyMaximumSpeed: 500,
  volleyDamage: 8,
  volleyRadius: 5,
  volleyReleaseCueSeconds: 0.2,
  blockCueSeconds: 0.3,
  maximumBlockCues: 48,
};
export function applyClerkAppeal(catalog) {
  const b = catalog.bosses.find((b) => b.id === "quarantine-clerk");
  if (!b) throw Error("Clerk missing");
  b.signature.behavior =
    "Reachable arena-relative stamp centers replace the fixed fallback grid. Intake reopens stamp I; the late Appeal Circuit patrols first and reopens its final stamp after its strike (III/V/X by form). Standard uses three red/green stamps, Brutal five including doubled-damage purple stamps, and Crazed ten including black current-health curses. Advanced late appeals replace the expired set after a gap, keeping the live field capped at five/ten. Each reopening precedes a locked, fully warned volley from two/three/four marked origins by form; the green seal visibly absorbs shots at its rim.";
  b.signature.counterplay =
    "Read the ordered marks and the notched future-safe seal. Wait for its green interior before entering. Follow the new ground origin after a late patrol; advanced appeals warn a fresh set after the old field expires. Purple stamps hit twice as hard as red; black stamps remove 75% of current health once per seal activation, bypassing armor/shields but respecting invulnerability and green protection, leaving at least one health. Shape markings distinguish hazards. The shield outline and closing rim identify temporary shelter from marked volleys; use it to keep firing, or dodge the warned fan in open ground.";
  b.signature.parameters.appeal = structuredClone(clerkAppealRules);
  for (const [form, phases] of [
    ["normal", b.phases],
    ["brutal", b.variants.brutal.phases],
    ["crazed", b.variants.crazed.phases],
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.quarantine-clerk.phase." + i;
      p.reopensStamp = i ? clerkAppealRules.stampCounts[form] : 1;
      p.stampCount = clerkAppealRules.stampCounts[form];
      p.stampRadius = clerkAppealRules.stampRadii[form];
      p.relocatesBeforeStamps = i > 0;
    }
}
