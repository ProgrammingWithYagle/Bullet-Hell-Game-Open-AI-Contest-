export function applyCrazedHorizon(catalog) {
  Object.assign(catalog.rules.brutal, {
    projectileMultiplier: 2.5,
    echoDelaySeconds: 1.05,
    echoWaveSpacingSeconds: 0.35,
    maximumPendingEchoProjectiles: 3072,
    maximumPendingEchoOrigins: 128,
    additionalPatterns: ["pursuit", "crosscut"],
    endlessTrigger:
      "A completed Standard identity returns Brutal; after a completed Brutal appearance it returns Crazed.",
  });
  for (const key of [
    "projectileWaves",
    "highThreatProjectileWaves",
    "tripleWaveMinimumThreat",
  ])
    delete catalog.rules.brutal[key];
  catalog.rules.crazed = {
    healthMultiplier: 2,
    damageMultiplier: 2,
    deadlineMultiplier: 1.5,
    bountyMultiplier: 1.75,
    projectileMultiplier: 7.5,
    relativeBrutalProjectileMultiplier: 3,
    phaseShieldBreak: false,
    additionalPatterns: ["pursuit", "crosscut", "weave"],
    instantKillAttacks: false,
  };
  Object.assign(catalog.rules.arenaDifficulty, {
    hellishAllBossesBrutal: false,
    insaneAllBossesBrutal: true,
    hellishAllBossesCrazed: true,
  });
  catalog.difficulties.find((d) => d.id === "insane").health = 1.25;
  for (const boss of catalog.bosses)
    boss.variants.crazed = {
      ...structuredClone(boss.variants.brutal),
      identity: boss.id + "-crazed",
      additionalPatterns: ["pursuit", "crosscut", "weave"],
    };
}
