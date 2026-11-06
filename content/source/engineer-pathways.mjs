export function applyEngineerPathways(c) {
  c.specializationSkills = [
    ['engineer-machinery-1', 'Carriage Sentry', 'Machinery', 'A mobile Q machine follows its owner, then braces for half a second before firing. Shorter range and lost moving fire trade sustained output for relocation.'],
    ['engineer-traps-1', 'Pressure Charges', 'Traps', 'Q places an armed proximity charge instead of a turret. Up to two charges; one second arming, half-second visible fuse, ordinary control and finite explosions.'],
  ].map(([id,name,path,description]) => ({
    id,classId:'engineer',branchId:'engineer-pathways',branchName:'Specializations',
    subbranchId:id,subbranchName:path,subbranchNameKey:'pathway.'+id+'.name',name,nameKey:'skill.'+id+'.name',
    sourceSkillId:id,depth:1,cost:2,grade:'D-',prerequisite:'engineer-constructs-1',capstone:false,effects:{},description,
  }));
  c.rules.engineerPathways = {
    machineSpeed:150,machineRange:420,machineDamageMultiplier:1.2,braceSeconds:0.5,
    chargeReach:120,chargeBodyRadius:12,chargeCapacity:2,chargeSeconds:36,armSeconds:1,fuseSeconds:0.5,
    triggerRadius:44,blastRadius:100,chargeDamage:150,ordinarySlow:0.5,slowSeconds:2,flashSeconds:0.35,
  };
}
