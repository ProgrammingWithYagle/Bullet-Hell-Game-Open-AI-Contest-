import profiles from '../../src/shared/boss-threats.json' with {type:'json'};

export const encounterAssists = {
  baby: {phaseShieldBreak:true, revivedHealthFraction:1,shieldCircles:6,shieldChannelSeconds:2},
  easy: {phaseShieldBreak:true, revivedHealthFraction:0.5,shieldCircles:3,shieldChannelSeconds:3},
  normal: {phaseShieldBreak:false, revivedHealthFraction:0.25,shieldCircles:0,shieldChannelSeconds:0},
  hard: {phaseShieldBreak:false, revivedHealthFraction:0,shieldCircles:0,shieldChannelSeconds:0},
  insane: {phaseShieldBreak:false, revivedHealthFraction:0,shieldCircles:0,shieldChannelSeconds:0},
  hellish: {phaseShieldBreak:false, revivedHealthFraction:0,shieldCircles:0,shieldChannelSeconds:0},
};
export function applyEncounterPacing(catalog) {
  const levels = new Map(profiles.entries.map(p=>[p.bossId,p.level]));
  Object.assign(catalog.rules, {
    encounterAssists,revivedHealthFraction:0.25,
    phasePacing:{maximumEntryThreat:2, entryPhaseThresholds:[1,0.5]},
    arenaDifficulty:{babyAdditionalCover:2,hardCoverFraction:0.5,noCoverDifficulties:['insane','hellish'],lavaDifficulty:'hellish',lavaWarningSeconds:3,lavaDamagePerSecond:24,lavaHitIntervalSeconds:0.5,hellishAllBossesBrutal:true},
  });
  Object.assign(catalog.rules.brutal, {
    phaseShieldBreak:false, projectileWaves:2, highThreatProjectileWaves:3,
    tripleWaveMinimumThreat:5, echoDelaySeconds:1.05,
    maximumPendingEchoProjectiles:768, maximumPendingEchoOrigins:64,
  });
  delete catalog.rules.secret.minimumAccordBreaks;
  catalog.rules.secret.minimumClearedEncounters = 3;
  // Hellish already forces the 2x Brutal health multiplier. Its effective global health is 2.4x Normal.
  catalog.difficulties.find(d=>d.id==='hellish').health=1.2;
  const medic=catalog.classes.find(c=>c.id==='medic');
  medic.ultimate.effects.reviveFraction=0.25;
  medic.ultimate.description='After a one-second channel, revive nearby downed or eliminated allies according to the selected difficulty. Heal living allies for 40, cleanse effects and deal 35 damage nearby. Solo also gains 40 shield.';
  catalog.supplies.find(s=>s.id==='revive-kit').amount=0.25;
  for (const boss of catalog.bosses) {
    for (const form of ['normal','brutal']) {
      const phases = form==='normal' ? boss.phases : boss.variants.brutal.phases;
      const numbered = phases.map((p,i)=>({...p,patternPhase:p.patternPhase??i}));
      const selected = levels.get(boss.id)<=2 ? [numbered[0],numbered.at(-1)] : numbered;
      const paced = selected.map((p,i)=>({...p,
        healthThreshold:selected.length===2?[1,0.5][i]:p.healthThreshold,
        accordBreak:form==='normal' && i>0,
      }));
      if(form==='normal')boss.phases=paced;else boss.variants.brutal.phases=paced;
    }
  }
}
