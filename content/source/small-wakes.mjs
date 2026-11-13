// Three original two-phase identities; SmallWakesDirector owns their actual attacks.
export const smallWakesIds = ["candle-snail", "cobble-crab", "mourning-kettle"];
const specs = [
  [
    "candle-snail",
    "Candle Snail",
    "A single light still travels the cemetery path.",
    0.78,
    50,
    "A slow collision-resolved glide lays locked warned wax rails. Twin Wick adds parallel rails with a quiet center and faster lateral movement.",
    "Leave the marked wake before it burns, cross after it cools, or use the quiet center between twin rails. Masonry stops the wake.",
    {
      warningSeconds: 1.3,
      waxWidth: 38,
      waxSeconds: 1.8,
      twinOffset: 105,
      glideSpeed: 20,
      finalGlideSpeed: 32,
      brutalCrossCutDelay: 2.2,
    },
    [5, 7],
    125,
  ],
  [
    "cobble-crab",
    "Cobble Crab",
    "The street gathers its loose stones at the sound of footsteps.",
    0.86,
    45,
    "Warned stone pincers physically close toward a locked strip while the crab scuttles sideways. Cross Streets alternates axes and adds a second closure.",
    "Leave the closing jaws or break their linked finite anchor stone. Pass through after a clamp; the outer lanes remain open.",
    {
      anchorHealth: 38,
      warningSeconds: 1.3,
      closingSeconds: 0.65,
      openHalfGap: 180,
      closedHalfGap: 34,
      scuttleSpeed: 30,
      finalScuttleSpeed: 42,
    },
    [5, 7],
    130,
  ],
  [
    "mourning-kettle",
    "Mourning Kettle",
    "It keeps the last tea warm for guests who never returned.",
    0.94,
    44,
    "A marked steam lane pours before crossing condensation beads. Last Service staggers two separated lanes while the kettle waddles between casts.",
    "Sidestep the warning, cross after steam ends or break a finite remote valve to cancel its linked pour and beads. Preserve a cold route.",
    {
      valveHealth: 42,
      warningSeconds: 1.3,
      pourSeconds: 1.65,
      beadDelaySeconds: 0.7,
      twinOffset: 100,
      waddleSpeed: 16,
      finalWaddleSpeed: 24,
    },
    [4, 5],
    118,
  ],
];
export function addSmallWakes(bosses, pools) {
  for (const [
    id,
    name,
    lore,
    healthFactor,
    radius,
    behavior,
    counterplay,
    mechanics,
    counts,
    speed,
  ] of specs) {
    if (bosses.some((b) => b.id === id))
      throw Error("Small Wakes identity already exists: " + id);
    const phases = [1, 0.5].map((healthThreshold, i) => ({
      healthThreshold,
      patternPhase: i,
      accordBreak: i > 0,
      attacks: [
        {
          kind: "fan",
          count: counts[i],
          speed,
          damage: 9 + i,
          interval: 8,
          telegraph: 1.3,
        },
      ],
    }));
    bosses.push({
      id,
      name,
      lore,
      minThreat: 1,
      timer: 120,
      healthFactor,
      radius,
      secret: false,
      route: "short",
      finale: false,
      preferredArena: "gatehouse",
      arenaIds: [
        "gatehouse",
        "triage-yard",
        "sunken-chapel",
        "bell-foundry",
        "crown-crypt",
      ],
      damageWindowFraction: 1,
      mechanics,
      signature: { id, behavior, counterplay, parameters: mechanics },
      artBrief:
        lore +
        " Preserve the selected original motion, permanent identity marks and complete defeat poses.",
      phases,
      variants: {
        normal: {
          healthMultiplier: 1,
          damageMultiplier: 1,
          deadlineMultiplier: 1,
          bountyMultiplier: 1,
        },
        brutal: {
          healthMultiplier: 2,
          damageMultiplier: 2,
          deadlineMultiplier: 1.5,
          bountyMultiplier: 1.75,
          identity: id + "-brutal",
          signature: id,
          phases: phases.map((p) => ({
            ...p,
            accordBreak: false,
            attacks: p.attacks.map((a) => ({ ...a })),
          })),
        },
      },
    });
    pools.short.regular.push(id);
    pools.endless.openingPool.push(id);
  }
}
