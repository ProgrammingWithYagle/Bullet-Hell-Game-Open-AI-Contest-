export const widowRules={
 gateThickness:48,warningSeconds:1.5,closedSeconds:3.5,closingDamage:14,
 minimumPassageWidth:128,passageClearance:22,ejectionSampleSpacing:16,minimumPallTravel:120,
 pallThickness:24,pallSpeed:175,pallDelaySeconds:.6,pallDamage:14,exitSeconds:.3,
 patrolDistance:160,patrolSpeed:72,patrolWarningSeconds:.7,
 betweenGatesSeconds:.85,recoverySeconds:.9,betweenSequencesSeconds:1.5,retrySeconds:1,
 needlesPerWing:3,needleHalfGap:.4,needleWingArc:.6,needleDelaySeconds:.45,
 needleWarningSeconds:1.35,needleSpeed:205,needleDamage:5,needleRadius:5,needleCueSeconds:.2,
 postSpacing:32,crazedCrossingFromWave:3,crazedCrossingTurn:.3,
};
export function applyWidowGates(catalog){
 const boss=catalog.bosses.find(b=>b.id==='gate-widow');if(!boss)throw Error('Gate Widow missing');
 boss.signature.behavior='Three Latches warns two closed lanes and an open numbered crossing. A moving floor pall sweeps the two closed-lane tracks toward the locked target side. At half health, Crossed Threshold marks a real reposition, then warns a vertical gate and a separate horizontal return. Brutal adds gapped latch needles; Crazed retains them, adds crossing needle repeats and one additional separately warned gate.';
 boss.signature.counterplay='Follow the open numbered lane to cross the gate or avoid the moving floor pall; a timed dash can also cross the pall. The gap is not a bullet shield. Floor sweeps pass under masonry. Every gate gets a full 1.5-second tell, and the pall starts another 0.6 seconds later. Only one gate set can be solid at a time; the next orientation waits for the old set and an exit interval. Read each fresh locked warning and attack in recovery. Original boss health, damage, deadline, attack definitions, fixed grade, art and Third Latch score remain.';
 boss.signature.parameters.crossedThreshold=structuredClone(widowRules);
 for(const phases of [boss.phases,boss.variants.brutal.phases,boss.variants.crazed.phases])for(const [i,p]of phases.entries()){
  p.phaseNameKey='boss.gate-widow.phase.'+i;p.relocatesBeforeGates=i>0;p.gateAxes=i>0?['vertical','horizontal']:['horizontal'];p.serialGateSets=i>0?2:1;
 }
}
