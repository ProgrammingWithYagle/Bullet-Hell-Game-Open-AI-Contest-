export function applyMarksmanLate(c){
 const entry='soldier-marksman-1',pair='soldier-marksman-pair-1',relay='soldier-marksman-relay-1';
 const nodes=[
  ['soldier-marksman-reserve-1','Held Measure','A-',3,3,17,pair,false,'evolution','After Measured Pair earns its second shot, begin one real manual Reload to keep that opportunity through the reload and 0.6 seconds afterward, at most four seconds total. It cannot be reserved twice. Dodge, channel, overdrive, weapon or technique loss cancels the reserved opportunity. The normal reload still takes its full time; no extra rounds are created.'],
  [relay,'Angle Relay','S-',4,3,23,pair,false,'evolution','Only the second paid Measured Pair shot\'s first real cover bank earns 0.8 seconds for one paid Bank Shot during its recovery. Spend one real round and extend, rather than reset, the existing Bank Shot recovery. An ordinary ready shot consumes the same opportunity. No automatic shot or recursive proof.'],
  ['soldier-marksman-twin-1','Twin Lanes','SS+',5,6,27,relay,true,'capstone','When using an earned Angle Relay during Bank Shot recovery, spend two actual rounds to fire two physical bank shots ten degrees to either side of your manual aim. Both inherit your chosen bank variant and use real cover, bodies, travel and armor. Both projectile slots must fit or nothing is spent. One release consumes the relay and extends recovery; neither shot earns another opportunity. Ordinary ready Bank Shot remains one round.'],
 ];
 c.specializationSkills=c.specializationSkills.filter(s=>!nodes.some(([id])=>id===s.id));
 for(const[id,name,grade,depth,cost,freePlaySpRequired,prerequisite,capstone,role,description]of nodes)c.specializationSkills.push({id,classId:'soldier',branchId:'soldier-pathways',branchName:'Specializations',subbranchId:entry,subbranchName:'Marksman',subbranchNameKey:'pathway.'+entry+'.name',name,nameKey:'skill.'+id+'.name',sourceSkillId:id,grade,depth,cost,freePlaySpRequired,prerequisite,capstone,role,effects:{},description});
 Object.assign(c.rules.soldierMarksman,{reserveGrace:.6,reserveMaximum:4,relayWindow:.8,twinDegrees:10,twinAmmunition:2});
}
