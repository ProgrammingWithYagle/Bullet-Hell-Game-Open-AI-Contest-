export function applySoldierReload(c){
 const ids=['soldier-skirmisher-drill-1','soldier-skirmisher-roving-1'];c.specializationSkills=c.specializationSkills.filter(s=>!ids.includes(s.id));
 for(const[id,name,grade,depth,freePlaySpRequired,prerequisite,role,description]of[
  [ids[0],'Cartridge Drill','B-',2,11,'soldier-skirmisher-1','active','Earn action 2: load up to four missing rounds individually while walking. Primary fire waits; use action 2 again to stop with completed rounds retained. Fresh burst/step, dodge, ordinary reload or health damage interrupts.'],
  [ids[1],'Roving Chamber','A-',3,17,ids[0],'evolution','Keep the same finite Cartridge Drill running through fresh Precision Burst and Passing Shot, including either early fork. Coordinate three actions without gaining extra rounds, faster loading or immunity.'],
 ])c.specializationSkills.push({id,classId:'soldier',branchId:'soldier-pathways',branchName:'Specializations',subbranchId:'soldier-skirmisher-1',subbranchName:'Skirmisher',subbranchNameKey:'pathway.soldier-skirmisher-1.name',name,nameKey:'skill.'+id+'.name',sourceSkillId:id,depth,cost:3,grade,prerequisite,capstone:false,effects:{},description,freePlaySpRequired,role});
 Object.assign(c.rules.soldierSkirmisher,{drillRounds:4,drillFirstFraction:.35,drillRoundFraction:.2,drillCooldown:12});
}
