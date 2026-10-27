export const clerkAppealRules = {
  stampRadius: 82,
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
    "Reachable arena-relative stamp centers replace the fixed fallback grid. Intake reopens stamp I; the late Appeal Circuit patrols first and reopens stamp III after its strike. Advanced late phases add a fresh fully warned three-stamp appeal at distinct positions. Each reopening precedes a locked, fully warned volley from the other two seals; the green seal visibly absorbs shots at its rim.";
  b.signature.counterplay =
    "Read the ordered marks and the notched future-safe seal. Wait for its green interior before entering. Follow the new ground origin after a late patrol; advanced appeals warn a fresh set while the old safe seal expires. The shield outline and closing rim identify temporary shelter from the two red seals; use it to keep firing, or dodge the warned fan in open ground.";
  b.signature.parameters.appeal = structuredClone(clerkAppealRules);
  for (const phases of [
    b.phases,
    b.variants.brutal.phases,
    b.variants.crazed.phases,
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.quarantine-clerk.phase." + i;
      p.reopensStamp = i ? 3 : 1;
      p.relocatesBeforeStamps = i > 0;
    }
}
