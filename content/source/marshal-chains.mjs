export const marshalRules = {
  anchorRadius: 27,
  anchorHealth: 90,
  advancedAnchorHealthMultiplier: 2,
  maximumReach: 610,
  chainWidth: 18,
  sweepDegrees: 80,
  warningSeconds: 1.4,
  activeSeconds: 2.5,
  contactDamage: 9,
  contactSeconds: 0.5,
  edgeSegments: 75,
  collisionSpacing: 6,
  maximumCollisionSteps: 256,
  anchorSeparation: 224,
  targetClearance: 72,
  bossClearance: 8,
  placementAttempts: 4,
  patrolDistance: 168,
  patrolSpeed: 78,
  patrolWarningSeconds: 0.7,
  lateArmSpacingSeconds: 0.55,
  returnPauseSeconds: 0.4,
  recoverySeconds: 0.8,
  advancedRecoverySeconds: 1.2,
  betweenSequencesSeconds: 1.5,
  retrySeconds: 1,
  brokenCueSeconds: 0.35,
  barbsPerWing: 4,
  barbHalfGap: 0.4,
  barbWingArc: 0.55,
  barbWarningSeconds: 1.2,
  barbSpeed: 190,
  barbDamage: 6,
  barbRadius: 5,
  barbCueSeconds: 0.2,
  crazedCrossingFromWave: 3,
  crazedCrossingTurn: 0.28,
};
export function applyMarshalChains(catalog) {
  const b = catalog.bosses.find((b) => b.id === "chain-marshal");
  if (!b) throw Error("Chain Marshal missing");
  b.signature.behavior =
    "Held Line plants two clear reachable anchors and warns opposite locked sweeps. At half health, Shifting Writ marks a lateral reposition before placing new anchors, staggers the arms and gives each surviving anchor a freshly aimed reverse sweep after a full new warning. Actual bounds and masonry clip the warned sweep envelope. Advanced anchors warn gapped barb volleys; Crazed later repeats add separately warned crossing angles.";
  b.signature.counterplay =
    "Find the numbered anchors before the sweep. Leave the painted sweep, cross behind the passing arm or shoot an anchor to cut only its chain, return and unreleased barb repeats. In-flight shots remain. New phase-two headings lock only when the return warning appears. Every arm gets a complete 1.4-second tell, including the return. Clear masonry blocks the physical chain. Barbs have their own warning and gap; the chain still crosses that gap. Punish the explicit recovery. Anchor health remains 90 Standard/180 advanced; base boss health, damage, timer and grade remain.";
  b.signature.parameters.shiftingWrit = structuredClone(marshalRules);
  for (const phases of [
    b.phases,
    b.variants.brutal.phases,
    b.variants.crazed.phases,
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.chain-marshal.phase." + i;
      p.relocatesBeforeChains = i > 0;
      p.chainLegs = i > 0 ? 2 : 1;
      p.reaimsReturn = i > 0;
      p.staggersArms = i > 0;
    }
}
