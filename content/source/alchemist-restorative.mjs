export const authoredDate = '2026-11-24';
const entry = 'alchemist-set-dressing-1', shared = 'alchemist-shared-roll-1', quick = 'alchemist-quick-knot-1';
const cards = [
  { id:entry, name:'Set Dressing', description:'Aim at nearby clear ground and press Action 3 to spend your first prepared Mending and your ordinary throw opening. The flask leaves a seven-second dressing. One injured survivor can stay in the circle briefly to receive it.' },
  { id:shared, name:'Shared Roll', description:'Each physical dressing has two half-strength portions. Two different injured survivors can take one each. Excludes Quick Knot.' },
  { id:quick, name:'Quick Knot', description:'Set a smaller dressing the Alchemist can use more quickly. This dressing is reserved for its owner. Excludes Shared Roll.' },
];
export function applyAlchemistRestorative(catalog) {
  for (const {id,name,description} of cards) {
    const first = id === entry;
    catalog.specializationSkills.push({id,name,description,classId:'alchemist',branchId:'alchemist-pathways',branchName:'Specializations',
      subbranchId:entry,subbranchName:'Restorative Practice',subbranchNameKey:`pathway.${entry}.name`,nameKey:`skill.${id}.name`,
      sourceSkillId:id,effects:{},capstone:false,grade:first?'D-':'D',depth:first?1:2,cost:2,freePlaySpRequired:first?3:5,
      prerequisite:first?'alchemist-dyehouse-1':entry,role:first?'active':'fitting'});
  }
}
export const copy = {
  [`pathway.${entry}.name`]:'Restorative Practice',
  'ui.alchemyDressing.overview':'Commit a Mending flask to a spot where an injured survivor can stop for care.',
  'ui.alchemyDressing.busy':'Hands occupied',
  'ui.alchemyDressing.recovering':'Cast Flask is recovering',
  'ui.alchemyDressing.prepare':'Put a prepared Mending first',
  'ui.alchemyDressing.placed':'Dressing already placed or in flight',
  'ui.alchemyDressing.aim':'Aim at nearby clear ground',
  'ui.alchemyDressing.help':'Put a Mending flask first and wait for Cast Flask to be ready. Aim at clear ground and use Action 3. The dressing uses the ordinary throw recovery. An injured survivor can stop on the mark for care.',
  'ui.alchemyDressing.sharedHelp':'Each dressing has two portions at half strength. To use both, send two different people to the circle.',
  'ui.alchemyDressing.quickHelp':'The smaller circle gives its owner a shorter wait. Choose a safe place to stop before the dressing expires.',
};
for (const {id,name,description} of cards) {
  copy[`skill.${id}.name`] = name;
  copy[`skill.${id}.description`] = description;
  copy[`pathway.${id}.summary`] = description;
}
