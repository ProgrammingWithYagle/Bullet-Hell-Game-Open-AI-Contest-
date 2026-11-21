export const tollkeeperReturnRules = {
  wheelRadius: 42,
  wheelSpeed: 260,
  lateSpeedFactor: 1.07,
  wheelDamage: 15,
  warningSeconds: 1.2,
  contactSeconds: 0.5,
  patrolDistance: 168,
  patrolSpeed: 78,
  patrolWarningSeconds: 0.7,
  normalLegs: 2,
  advancedLateLegs: 3,
  recoverySeconds: [0.8, 1.1],
  advancedRecoverySeconds: [1.1, 1.4],
  betweenRoutesSeconds: 1.5,
  spokesPerWing: [4, 6],
  spokeHalfGap: 0.4,
  spokeWingArc: 0.55,
  spokeSpeed: 190,
  spokeDamage: 7,
  spokeRadius: 5,
  bankReleaseCueSeconds: 0.2,
};
export function applyTollkeeperReturn(catalog) {
  const boss = catalog.bosses.find((b) => b.id === "tollkeeper");
  if (!boss) throw Error("Tollkeeper missing");
  boss.signature.behavior =
    "Exact Fare warns a complete one-reflection wheel route. Closing Booth shifts position, rolls to a bank, stops, then locks a fresh return toward a survivor. Advanced forms warn side sprays at banks and add a third late leg.";
  boss.signature.counterplay =
    "Leave the locked wheel line and cross behind the passing wheel. In Closing Booth read the new arrow after its bank stop; it cannot track you after warning. Advanced side sprays warn separately from the wheel lane. Punish the clear recovery.";
  boss.signature.parameters.bankedReturn = structuredClone(
    tollkeeperReturnRules,
  );
  for (const [form, phases] of [
    ["normal", boss.phases],
    ["brutal", boss.variants.brutal.phases],
    ["crazed", boss.variants.crazed.phases],
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.tollkeeper.phase." + i;
      p.relocatesBeforeWheel = i > 0;
      p.reaimsAtBank = i > 0;
      p.wheelLegs =
        i > 0 && form !== "normal"
          ? tollkeeperReturnRules.advancedLateLegs
          : tollkeeperReturnRules.normalLegs;
    }
}
