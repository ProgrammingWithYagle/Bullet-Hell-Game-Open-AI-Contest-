export const authoredDate = '2026-11-22';

const entry = 'swordsman-passing-cut-1';
const techniques = [
  { id: entry, name: 'Passing Cut', description: 'Walk 54 pixels along a clear approach. Face along your approach and press Action 3 while your footing is fresh. The cut spends one primary charge and has its own recovery.' },
  { id: 'swordsman-pursuit-through-step-1', name: 'Through Step', description: 'Land a Passing Cut, then walk 32 more pixels along the first approach. Press Action 3 for one narrow, longer cut that spends a second primary charge. Excludes Crossing Step.' },
  { id: 'swordsman-pursuit-crossing-step-1', name: 'Crossing Step', description: 'Land a Passing Cut, then walk 32 pixels across the first approach. Press Action 3 for one broad cut toward your new footing that spends a second primary charge. Excludes Through Step.' },
];

export function applySwordsmanPursuit(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId:'swordsman', branchId:'swordsman-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Flowing Pursuit', subbranchNameKey:'pathway.' + entry + '.name',
      id, name, nameKey:'skill.' + id + '.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first ? 'D-' : 'D', depth:first ? 1 : 2, cost:2, freePlaySpRequired:first ? 3 : 5,
      prerequisite:first ? 'swordsman-footwork-1' : entry, role:first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.swordsman-passing-cut-1.name': 'Flowing Pursuit',
  'ui.sword.pursuitOverview': 'Walk into a cut. A clean hit can open a second approach.',
  'ui.sword.pursuitStride': 'Walk the approach {distance}/{goal}',
  'ui.sword.pursuitThrough': 'Continue forward {distance}/{goal}',
  'ui.sword.pursuitCross': 'Walk across the approach {distance}/{goal}',
  'ui.sword.pursuitAlign': 'Face along your new footing',
  'ui.sword.pursuitRelease': 'Deliver Passing Cut',
  'ui.sword.pursuitRecover': 'Passing Cut recovering',
  'ui.sword.pursuitLoad': 'Load another primary charge',
  'ui.sword.pursuitHelp': 'Walk along an approach to build footing, then face along it and press Action 3. Each cut spends one primary charge. Dashes and forced movement break footing.',
  'ui.sword.pursuitThroughHelp': 'After a damaging first cut, continue along the approach for a narrower, longer cut.',
  'ui.sword.pursuitCrossHelp': 'After a damaging first cut, take a crossing step for a broad cut in the new direction.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
