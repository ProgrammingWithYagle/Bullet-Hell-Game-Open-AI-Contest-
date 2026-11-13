export function applyWardenPatrol(catalog) {
  const boss = catalog.bosses.find((b) => b.id === 'lantern-warden');
  boss.signature.behavior =
    'One locked-origin lantern sweep with a trailing safe wedge. At half health patrol between attacks; Brutal alternates direction and adds a fully warned sequential return sweep.';
  boss.signature.counterplay =
    'Read the sweep-direction arrow, move behind the cone, and follow the new ground origin after a patrol. The final Brutal return sweep has its own complete warning and never overlaps the first.';
  Object.assign(boss.signature.parameters, {
    patrolSpeed: 72,
    patrolDistance: 144,
    patrolTellSeconds: 0.6,
    returnPauseSeconds: 0.6,
  });
  for (const [form, phases] of [
    ['normal', boss.phases],
    ['brutal', boss.variants.brutal.phases],
  ])
    for (const [i, p] of phases.entries()) {
      delete p.signatureRepeatOffsetSeconds;
      p.phaseNameKey = 'boss.lantern-warden.phase.' + i;
      p.sequentialSweeps = form === 'brutal' && i > 0 ? 2 : 1;
      p.patrol = i > 0;
    }
}
