export const clerkAppealRules = {
  stampRadius: 82,
  shelterBossBonus: {normal:[.5,.35],brutal:[.4,.2],crazed:[.25,.05]},
  domainCount: 2,
  domainRadius: 32,
  domainWarningSeconds: 2,
  domainMaximumHealthFraction: .1,
  domainContactSeconds: 1,
  maximumDomains: 128,
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
  purpleCurrentHealthFraction: 0.15,
  purplePoisonSeconds: 3,
  purplePoisonIntervalSeconds: 0.5,
  purplePoisonDamage: 2,
  purpleSlowMultiplier: 0.65,
  shelterSeconds: { normal: 2.5, brutal: 3.5, crazed: 5 },
  shelterTailSeconds: 0.5,
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
    "Reachable arena-relative stamp centers replace the fixed fallback grid. Standard reopens I early and III late. Brutal chooses one random green number at the start of phase one, holds it throughout that phase and chooses a new random number for each phase-two batch; Crazed chooses a randomly numbered seal in every field. The choice locks and warns with the full field, before any strike. The late Appeal Circuit patrols before marking. Standard uses three red/green stamps, Brutal five including doubled-damage purple stamps, and Crazed ten including black current-health curses. Advanced late appeals replace the expired set after a gap, keeping the live field capped at five/ten. Each reopening precedes a locked, fully warned volley from two/three/four marked origins by form; the green seal visibly absorbs shots at its rim.";
  b.signature.counterplay =
    "Active green shelter also increases damage to the Clerk by 50%/35% in Standard, 40%/20% in Brutal and 25%/5% in Crazed (early/late). Crazed phase two leaves two amber infinity domains after each stamp batch. After a separate two-second warning, they remain for the rest of combat and remove 10% of maximum health per contact, bypassing armor and shield capacity, at most once per second across overlapping domains. Green shelter and invulnerability protect. Read the ordered marks and the notched future-safe seal. Wait for its green interior before entering. Follow the new ground origin after a late patrol; advanced appeals warn a fresh set after the old field expires. Purple stamps hit twice as hard as red. The first successful purple contact per player per seal also removes 15% of current health, bypassing armor/shield capacity, and applies three seconds of nonstacking poison (two base damage each half-second) and 35% walking slow; dash speed remains unchanged. Cleanse supplies and Medic cleansing abilities remove both. Green shelter and invulnerability prevent application and poison ticks. Brutal shelter lasts at least 3.5 seconds and Crazed at least five seconds, extending if needed until half a second after the final possible fan echo reaches the rim; black stamps remove 75% of current health once per seal activation, bypassing armor/shields but respecting invulnerability and green protection, leaving at least one health. Shape markings distinguish hazards. The shield outline and closing rim identify temporary shelter from marked volleys; use it to keep firing, or dodge the warned fan in open ground.";
  b.signature.parameters.appeal = structuredClone(clerkAppealRules);
  for (const [form, phases] of [
    ["normal", b.phases],
    ["brutal", b.variants.brutal.phases],
    ["crazed", b.variants.crazed.phases],
  ])
    for (const [i, p] of phases.entries()) {
      p.phaseNameKey = "boss.quarantine-clerk.phase." + i;
      p.reopensStamp =
        form === "crazed" || form === "brutal"
          ? "random"
          : i
            ? 3
            : 1;
      p.stampCount = clerkAppealRules.stampCounts[form];
      p.stampRadius = clerkAppealRules.stampRadii[form];
      p.relocatesBeforeStamps = i > 0;
    }
}
