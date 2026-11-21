export function applySoldierMarksman(c) {
 const id='soldier-marksman-1';
 c.specializationSkills=c.specializationSkills.filter(skill=>skill.id!==id);
 c.specializationSkills.push({id,classId:'soldier',branchId:'soldier-pathways',branchName:'Specializations',subbranchId:id,subbranchName:'Marksman',subbranchNameKey:'pathway.'+id+'.name',name:'Bank Shot',nameKey:'skill.'+id+'.name',sourceSkillId:id,depth:1,cost:2,grade:'D-',prerequisite:'soldier-ballistics-1',capstone:false,effects:{},description:'Spend one magazine round on a deliberate shot that reflects from one masonry face. Plan the angle through real cover; a second wall stops it. Uses action 1 instead of the Skirmisher discipline.',freePlaySpRequired:3,role:'active'});
 c.rules.soldierMarksman={ammunition:1,damage:30,speed:900,radius:4,lifeSeconds:1.6,cooldown:8,banks:1,separation:.001,contactSeconds:.3};
}
