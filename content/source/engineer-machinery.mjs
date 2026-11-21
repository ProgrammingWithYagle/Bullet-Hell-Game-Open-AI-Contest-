/** Additive Machinery techniques. Existing purchases retain their identity. */
export function applyEngineerMachinery(c) {
  const entries = [
    ['anchor','Anchor Circuit','D',2,5,'engineer-machinery-1','control','Anchor every carriage, then recall it to follow. Commands share a short recovery and require fresh bracing.'],
    ['survey','Survey Drive','D',2,5,'engineer-machinery-1','control','Order carriages to a fixed, legal point ahead of your aim. They travel there and hold formation.'],
    ['coil','Coil Lance','B-',3,11,'engineer-machinery-1','active','Earn a fourth active action: a carriage commits its aim, charges, then fires a piercing beam.'],
    ['prism','Prism Coils','A-',3,17,'engineer-machinery-coil-1','evolution','Coil Lance becomes a three-lane sequence, sweeping a wider approach with separately timed rays.'],
    ['salvage','Salvage Pulse','S-',4,21,'engineer-machinery-coil-1','active','Earn a fifth active action: dismantle nearby carriages to recover part of Q deployment cooldown.'],
    ['convergence','Rail Convergence','SS+',6,27,'engineer-machinery-prism-1','capstone','All surviving carriages commit converging rails, followed by a warned collapse at their shared mark.'],
  ];
  c.specializationSkills = c.specializationSkills.filter(s=>!s.id.startsWith('engineer-machinery-')||s.id==='engineer-machinery-1');
  c.specializationSkills.push(...entries.map(([suffix,name,grade,cost,freePlaySpRequired,prerequisite,role,description])=>({
    id:'engineer-machinery-'+suffix+'-1',classId:'engineer',branchId:'engineer-pathways',branchName:'Specializations',
    subbranchId:'engineer-machinery-1',subbranchName:'Machinery',subbranchNameKey:'pathway.engineer-machinery-1.name',
    name,nameKey:'skill.engineer-machinery-'+suffix+'-1.name',sourceSkillId:'engineer-machinery-'+suffix+'-1',
    depth:role==='control'?2:role==='capstone'?4:role==='evolution'||suffix==='salvage'?3:2,
    cost,grade,prerequisite,capstone:role==='capstone',effects:{},description,freePlaySpRequired,role,
  })));
  Object.assign(c.rules.engineerPathways,{
    commandReach:220,commandSeconds:0.8,coilRange:480,coilChargeSeconds:0.75,coilCooldown:12,
    coilDamage:240,prismDamage:110,prismInterval:0.18,prismArc:0.24,beamRadius:12,beamSeconds:0.22,
    salvageReach:125,salvageCooldown:24,salvageRecovery:6,convergenceDamage:240,collapseDamage:150,
    collapseRadius:90,collapseSeconds:0.4,convergenceCooldown:16,
  });
}
