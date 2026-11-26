export const authoredDate = '2026-11-22';

const entry = 'swordsman-held-edge-1';
const techniques = [
  { id:entry, name:'Held Edge', description:'Stand still and press Action 1 to spend Measured Cut recovery and set your edge. Hold until the arc is ready, then face it and press again to cut. Movement and other abilities break the stance.' },
  { id:'swordsman-measured-turn-edge-1', name:'Turn the Edge', description:'Once the held arc is ready, turn your aim 20 to 80 degrees and press Action 1 to reset its heading once. The new arc takes nine ticks to settle. The first deadline still applies. Excludes Second Line.' },
  { id:'swordsman-measured-second-line-1', name:'Second Line', description:'After a Held Edge cut deals real damage, aim 20 to 95 degrees off its heading and press Action 1 for a smaller follow-up cut. Stay on the same footing. Excludes Turn the Edge.' },
];

export function applySwordsmanMeasured(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const {id,name,description} of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId:'swordsman', branchId:'swordsman-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Measured Stance', subbranchNameKey:'pathway.'+entry+'.name',
      id, name, nameKey:'skill.'+id+'.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first?'D-':'D', depth:first?1:2, cost:2, freePlaySpRequired:first?3:5,
      prerequisite:first?'swordsman-measure-1':entry, role:first?'active':'fitting',
    });
  }
}

export const copy = {
  'pathway.swordsman-held-edge-1.name':'Measured Stance',
  'ui.sword.heldOverview':'Commit your footing, wait for the arc to settle and choose when to release the cut.',
  'ui.sword.heldSet':'Set your edge',
  'ui.sword.heldRecover':'Measured Cut recovering',
  'ui.sword.heldWait':'Hold your footing',
  'ui.sword.heldRelease':'Release the held cut',
  'ui.sword.heldAim':'Face the marked arc',
  'ui.sword.heldTurn':'Turn the edge once',
  'ui.sword.heldFollow':'Aim beside the first cut',
  'ui.sword.heldHelp':'Stand still and set the edge. When the marked arc is ready, aim along it and release. This shares Measured Cut recovery.',
  'ui.sword.turnHelp':'Once ready, aim 20 to 80 degrees aside to turn the arc once. The same deadline stays in effect.',
  'ui.sword.followHelp':'After the first cut deals damage, stay put and aim beside it for one smaller Second Line cut.',
};
for (const {id,name,description} of techniques) {
  copy['skill.'+id+'.name'] = name;
  copy['skill.'+id+'.description'] = description;
  copy['pathway.'+id+'.summary'] = description;
}
