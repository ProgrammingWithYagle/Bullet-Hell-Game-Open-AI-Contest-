export const authoredDate = '2026-11-21';

const entry = 'bard-mourning-measure-1';
const techniques = [
  { id:entry, name:'Mourning Measure', description:'Earn two cadence. Aim along clear ground and press Action 2 to spend Cut In recovery and lay a lane. Stay near its start and face along it for up to five pulses. Your primary rests during the measure. Press again to end it early.' },
  { id:'bard-lament-cross-verse-1', name:'Cross Verse', description:'After the first pulse, aim a little to one side and press Action 2 to turn the same lane once. The turn spends one remaining pulse. The lane keeps its original start and deadline. Excludes Closing Chord.' },
  { id:'bard-lament-closing-chord-1', name:'Closing Chord', description:'After two damaging pulses, press Action 2 while facing down the lane to play one chord at its far end. It spends all remaining pulses. Excludes Cross Verse.' },
];

export function applyBardLament(catalog) {
  const ids = new Set(techniques.map(technique=>technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill=>!ids.has(skill.id));
  for (const {id,name,description} of techniques) {
    const first=id===entry;
    catalog.specializationSkills.push({ classId:'bard', branchId:'bard-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Lament', subbranchNameKey:'pathway.'+entry+'.name',
      id, name, nameKey:'skill.'+id+'.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first?'D-':'D', depth:first?1:2, cost:2, freePlaySpRequired:first?3:5,
      prerequisite:first?'bard-notecraft-1':entry, role:first?'active':'fitting' });
  }
}

export const copy = {
  'pathway.bard-mourning-measure-1.name':'Lament',
  'ui.bard.lamentManualHelp':'Hold a lane at the cost of your primary, or give up future pulses to turn or finish it.',
  'ui.bard.lamentAim':'Aim along clear ground',
  'ui.bard.lamentStart':'Begin the measure',
  'ui.bard.lamentSustain':'Sustain or end the lane',
  'ui.bard.lamentTurn':'Turn the lane',
  'ui.bard.lamentClose':'Play the closing chord',
  'ui.bard.lamentHelp':'Spend two cadence and Cut In recovery to sustain the lane. Stay near the start and face along it. Primary fire waits while you play. Dodge or use another ability to leave early.',
  'ui.bard.lamentCrossHelp':'After the first pulse, aim toward a clear new line. Turn once by spending one of the original pulses.',
  'ui.bard.lamentClosingHelp':'Land two damaging pulses. As you face down the lane, spend the remaining pulses on one chord at its far end.',
};
for (const {id,name,description} of techniques) {
  copy['skill.'+id+'.name']=name;
  copy['skill.'+id+'.description']=description;
  copy['pathway.'+id+'.summary']=description;
}
