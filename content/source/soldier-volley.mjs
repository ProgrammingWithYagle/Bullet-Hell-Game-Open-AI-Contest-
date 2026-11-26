export function applySoldierVolley(c){
 const ids=['soldier-skirmisher-ready-1','soldier-skirmisher-volley-1'];c.specializationSkills=c.specializationSkills.filter(s=>!ids.includes(s.id));
 for(const[id,name,grade,depth,cost,freePlaySpRequired,prerequisite,capstone,role,description]of[
  [ids[0],'Ready Round','S-',4,3,23,'soldier-skirmisher-roving-1',false,'evolution','The first actual Cartridge Drill insertion opens a short paid Passing Shot. Spend one magazine round for the existing step shot without a burst opening, while respecting its recovery. A normal ready burst follow-up stays free.'],
  [ids[1],'Running Volley','SS+',5,6,27,ids[0],true,'capstone','Spend a loaded step opening during Passing Shot recovery. Once per drill, completing the first paid step and actually inserting three rounds earns a brief second paid step. Each spends one round and keeps the owned movement/fire/guard variant.'],
 ])c.specializationSkills.push({id,classId:'soldier',branchId:'soldier-pathways',branchName:'Specializations',subbranchId:'soldier-skirmisher-1',subbranchName:'Skirmisher',subbranchNameKey:'pathway.soldier-skirmisher-1.name',name,nameKey:'skill.'+id+'.name',sourceSkillId:id,grade,depth,cost,freePlaySpRequired,prerequisite,capstone,role,effects:{},description});
 Object.assign(c.rules.soldierSkirmisher,{readyWindowSeconds:1.2,relayWindowSeconds:.8,relayRounds:3,loadedStepAmmo:1});
}
