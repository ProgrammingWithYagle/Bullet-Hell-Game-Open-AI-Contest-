export const authoredDate = '2026-11-19';

const fittings = [
  { parent: 'medic-surgery-steady-step-1', id: 'medic-surgery-tie-off-1', name: 'Tie Off',
    description: 'After a paid dose and 5 pixels of Steady Step, use Action 1 while walking to tie off the next dose. You can act while the same patient stays within 24 pixels of the tie point and within treatment reach. Give up any later dose.' },
  { parent: 'medic-surgery-set-aside-1', id: 'medic-surgery-wrapped-dressing-1', name: 'Wrapped Dressing',
    description: 'Halfway through preparation, use Action 1 while still to wrap the dressing. Move or act for up to 0.8 seconds, then stand still and use Action 1 to continue preparation on the same patient. The first successful dose spends Healing Field recovery.' },
];

export function applyMedicSurgeryFittings(catalog) {
  const ids = new Set(fittings.map(fitting => fitting.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { parent, id, name, description } of fittings) {
    const founder = catalog.specializationSkills.find(skill => skill.id === parent);
    if (!founder) throw Error('Field Surgery prerequisite missing: ' + parent);
    catalog.specializationSkills.push({ ...founder, id, name, description, sourceSkillId: id,
      nameKey: 'skill.' + id + '.name', depth: 3, grade: 'D+', cost: 3, freePlaySpRequired: 13, prerequisite: parent });
  }
}

export const copy = {
  'ui.medic.dressingTieMoving': 'Tie off while walking',
  'ui.medic.dressingTied': 'Tied dose pending',
  'ui.medic.dressingWrap': 'Wrap unfinished dressing',
  'ui.medic.dressingUnwrap': 'Unwrap and resume',
  'ui.medic.dressingTieHelp': 'Walk briefly after a dose. Use your Field Dressing control while still walking to tie off the next dose and free your hands. Keep the patient inside the ring and within reach.',
  'ui.medic.dressingWrapHelp': 'Use your Field Dressing control while standing once the wrap prompt appears. You can briefly move or act. Plant your feet and use it again to finish preparation.',
};
for (const { id, name, description } of fittings) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
