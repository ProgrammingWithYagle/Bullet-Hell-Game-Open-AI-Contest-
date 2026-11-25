export const authoredDate = '2026-11-24';
const entry='ranger-re-stake-1', pivot='ranger-pivot-stake-1', short='ranger-short-lash-1';
const techniques=[
  {id:entry,name:'Re-stake',description:'Reach one of your Tripline stakes and spend one arrow with Action 3 to lift the cable. Walk to a new position and press again to set it. The same cable retains its original charges and expiry.'},
  {id:pivot,name:'Pivot Stake',description:'Keep the first reached stake planted. Move far enough away and press Action 3 to place the other end at your feet. The whole cable must fit the terrain. Excludes Short Lash.'},
  {id:short,name:'Short Lash',description:'Use a shorter line when replanting a carried Tripline. It arms sooner and covers less ground. Excludes Pivot Stake.'},
];

export function applyRangerField(catalog) {
  for (const {id,name,description} of techniques) {
    const first=id===entry;
    catalog.specializationSkills.push({
      classId:'ranger',branchId:'ranger-pathways',branchName:'Specializations',subbranchId:entry,subbranchName:'Field Controller',
      subbranchNameKey:'pathway.'+entry+'.name',id,name,nameKey:'skill.'+id+'.name',sourceSkillId:id,description,
      capstone:false,effects:{},grade:first?'D-':'D',depth:first?1:2,cost:2,freePlaySpRequired:first?3:5,
      prerequisite:first?'ranger-fieldcraft-1':entry,role:first?'active':'fitting',
    });
  }
}

export const copy={
  ['pathway.'+entry+'.name']:'Field Controller',
  'ui.rangerField.overview':'Pick up one of your placed Triplines and move its remaining coverage.',
  'ui.rangerField.busy':'Re-stake unavailable',
  'ui.rangerField.recovering':'Re-stake recovering',
  'ui.rangerField.find':'Reach one of your Tripline stakes',
  'ui.rangerField.empty':'Replenish one arrow',
  'ui.rangerField.carrying':'Find a legal cable line',
  'ui.rangerField.place':'Press again to replant',
  'ui.rangerField.help':'Reach your own stake and press Action 3 to spend one arrow and lift the cable. Walk to a clear line and press again. The cable leaves active play while you carry it. A dodge or sprint drops it.',
  'ui.rangerField.pivotHelp':'The reached stake stays in the ground. Walk to the new far end and replant from your feet when the guide appears.',
  'ui.rangerField.shortHelp':'The new line is shorter. This lets the same cable arm sooner with reduced coverage.',
};
for (const {id,name,description} of techniques) {
  copy['skill.'+id+'.name']=name;
  copy['skill.'+id+'.description']=description;
  copy['pathway.'+id+'.summary']=description;
}
