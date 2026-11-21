export const courierRouteRules = {
  normalLegs: [1, 2],
  advancedExtraLeg: 1,
  turnPauseSeconds: 0.2,
  turnWarningSeconds: 1.1,
  recoverySeconds: [0.75, 1.1],
  advancedRecoverySeconds: [1.1, 1.4],
  betweenRoutesSeconds: 1.5,
  dispatchWarningSeconds: 1.2,
  dispatchCount: [8, 12],
  dispatchDamage: 7,
  dispatchHalfGapRadians: 0.32,
  dispatchWingArcRadians: 0.55,
  maximumTrails: 6,
};
export function applyCourierRoute(catalog) {
  const boss = catalog.bosses.find((b) => b.id === "courier");
  if (!boss) throw Error("Courier missing");
  boss.signature.behavior =
    "A single locked delivery becomes a two-leg return route at half health. Every new leg warns from the actual stop. Advanced forms add one leg and a delayed split dispatch fan.";
  boss.signature.counterplay =
    "Step sideways from each fixed charge lane, read the next arrow after the stop, and punish recovery. Wait for fading trails; the advanced dispatch fan leaves its marked central wedge clear.";
  boss.signature.parameters.deliveryRoute = structuredClone(courierRouteRules);
  for (const [form, phases] of [
    ["normal", boss.phases],
    ["brutal", boss.variants.brutal.phases],
    ["crazed", boss.variants.crazed.phases],
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.courier.phase." + i;
      p.deliveryLegs =
        courierRouteRules.normalLegs[Math.min(1, i)] +
        (form === "normal" ? 0 : courierRouteRules.advancedExtraLeg);
    }
}
