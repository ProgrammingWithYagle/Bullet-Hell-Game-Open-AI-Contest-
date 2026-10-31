export const ratcatcherMusterRules = {
  patrolDistance: 160,
  patrolSpeed: 80,
  patrolWarningSeconds: 0.65,
  packWarningSeconds: 1.2,
  packLanes: 3,
  ratsPerLane: 4,
  ratHealth: 12,
  maximumRats: 12,
  sackHealth: 65,
  sackRecoverySeconds: 3,
  sackOffset: { x: 42, y: -65 },
  sackRadius: 24,
  recoverySeconds: 0.75,
  advancedRecoverySeconds: 1.1,
  betweenMustersSeconds: 1.5,
  whistleWarningSeconds: 1.2,
  whistleCount: [8, 12],
  whistlePasses: [1, 2],
  whistleGapRadians: 1.4,
  whistleTurnRadians: Math.PI / 3,
  whistleDamage: 7,
  whistleSpeed: 165,
};
export function applyRatcatcherMuster(catalog) {
  const b = catalog.bosses.find((b) => b.id === "ratcatcher");
  if (!b) throw Error("Ratcatcher missing");
  b.signature.behavior =
    "Three locked scent lanes release twelve bounded rats. At half health the Ratcatcher relocates before each new warning. Advanced forms finish with one/two fully warned gapped whistle rings.";
  b.signature.counterplay =
    "Read the new ground origin after the patrol, cross between fixed scent lanes and shoot the sack to cancel a pack. Rats can navigate around cover. Follow the marked whistle gap in advanced forms; a broken sack does not silence the whistle.";
  b.signature.parameters.muster = structuredClone(ratcatcherMusterRules);
  for (const phases of [
    b.phases,
    b.variants.brutal.phases,
    b.variants.crazed.phases,
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.ratcatcher.phase." + i;
      p.relocatesBeforePack = i > 0;
    }
}
