/** Traps develop prepared ground. All issued purchases retain their identities. */
export function applyEngineerTraps(c) {
  const entries = [
    ['wire','Tripwire Couplers','D',2,5,'engineer-traps-1','control','Two ready plates share a visible clear tripwire. Crossing it commits both full fuses. Choose this or Safety Switch.'],
    ['switch','Safety Switch','D',2,5,'engineer-traps-1','control','Q during deployment cooldown or with both slots full holds or releases idle plates. A committed fuse cannot be interrupted. Choose this or Tripwire Couplers.'],
    ['key','Firing Key','B-',3,11,'engineer-traps-1','active','Add action 1: commit every ready owned plate to its full visible fuse, including held plates.'],
    ['casings','Breach Casings','A-',3,17,'engineer-traps-key-1','evolution','Committed explosions also release a warned shaped jet along each plate\'s placed direction. Cover can shorten the warned lane.'],
    ['haul','Haul Line','S-',4,21,'engineer-traps-key-1','active','Add action 2: winch a nearby idle plate to a legal aimed position, then fully rearm it. Its original lifetime remains.'],
    ['corridor','Demolition Corridor','SS+',6,27,'engineer-traps-casings-1','capstone','Remote-fire two clear linked plates, then release a warned demolition strip. Both plates must actually detonate; interrupted ground cancels the strip.'],
  ];
  const ids=new Set(entries.map(([suffix])=>'engineer-traps-'+suffix+'-1'));
  c.specializationSkills=c.specializationSkills.filter(s=>!ids.has(s.id));
  c.specializationSkills.push(...entries.map(([suffix,name,grade,cost,freePlaySpRequired,prerequisite,role,description])=>({
    id:'engineer-traps-'+suffix+'-1',classId:'engineer',branchId:'engineer-pathways',branchName:'Specializations',
    subbranchId:'engineer-traps-1',subbranchName:'Traps',subbranchNameKey:'pathway.engineer-traps-1.name',
    name,nameKey:'skill.engineer-traps-'+suffix+'-1.name',sourceSkillId:'engineer-traps-'+suffix+'-1',
    depth:role==='control'?2:role==='capstone'?4:role==='evolution'||suffix==='haul'?3:2,
    cost,grade,prerequisite,capstone:role==='capstone',effects:{},description,freePlaySpRequired,role,
  })));
  Object.assign(c.rules.engineerPathways,{
    wireReach:360,wireRadius:3,trapCommandSeconds:0.8,remoteCooldown:12,
    jetRange:320,jetRadius:14,jetDamage:120,jetSeconds:0.22,
    haulReach:320,haulSeconds:0.6,haulCooldown:18,
    corridorCooldown:16,corridorSeconds:0.4,corridorRadius:26,corridorDamage:300,corridorFlashSeconds:0.3,
  });
}
