export const authoredDate = '2026-11-19';

const entry = 'medic-field-dressing-1';
const step = 'medic-surgery-steady-step-1';
const aside = 'medic-surgery-set-aside-1';
const descriptions = {
  [entry]: 'Stand still with your hands free. Aim at a nearby ally or away from allies to treat yourself with Action 1. Give up to three quick doses. The first dose spends Healing Field recovery. Moving, another action, lost reach or health loss interrupts treatment.',
  [step]: 'After the first Field Dressing dose, walk up to 32 pixels while continuing the treatment. Follow the same patient within reach. Firing, dodging or taking health damage ends treatment. Excludes Set Aside.',
  [aside]: 'After a Field Dressing dose, press Action 1 while still to set aside one remaining dose. Move or act for up to 0.8 seconds, then stand still and press Action 1 again to treat the same patient within reach. The original recovery still applies. Excludes Steady Step.',
};
const node = (id, name, depth) => ({
  classId: 'medic', branchId: 'medic-pathways', branchName: 'Specializations',
  subbranchId: entry, subbranchName: 'Field Surgery', subbranchNameKey: 'pathway.' + entry + '.name',
  capstone: false, effects: {}, id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id,
  grade: depth === 1 ? 'D-' : 'D', depth, cost: 2, freePlaySpRequired: depth === 1 ? 3 : 5,
  prerequisite: depth === 1 ? 'medic-triage-1' : entry, role: depth === 1 ? 'active' : 'fitting',
  description: descriptions[id],
});
export const nodes = [node(entry, 'Field Dressing', 1), node(step, 'Steady Step', 2), node(aside, 'Set Aside', 2)];
export const copy = {
  'pathway.medic-field-dressing-1.name': 'Field Surgery',
  'ui.medic.dressingPrepare': 'Prepare Field Dressing',
  'ui.medic.dressingPatient': 'Aim at a wounded ally or treat yourself',
  'ui.medic.dressingPreparing': 'Preparing dressing',
  'ui.medic.dressingSetAside': 'Set aside a dose',
  'ui.medic.dressingResume': 'Resume dressing',
  'ui.medic.dressingCancel': 'Stop dressing',
  'ui.medic.dressingHelp': 'Stand still and aim at a nearby wounded ally, or aim away from allies to treat yourself. Action 1 prepares the treatment. Its first successful dose spends Healing Field recovery.',
  'ui.medic.fieldManual': 'Medic field manual',
  'ui.medic.manualHelp': 'Use your issued kit and owned treatment techniques. Inspect a technique before choosing how to spend your points.',
};
for (const card of nodes) {
  copy[card.nameKey] = card.name;
  copy['skill.' + card.id + '.description'] = card.description;
  copy['pathway.' + card.id + '.summary'] = card.description;
}
export function applyFieldSurgery(catalog) {
  catalog.specializationSkills = catalog.specializationSkills.filter(node => !Object.hasOwn(descriptions, node.id));
  catalog.specializationSkills.push(...structuredClone(nodes));
}
