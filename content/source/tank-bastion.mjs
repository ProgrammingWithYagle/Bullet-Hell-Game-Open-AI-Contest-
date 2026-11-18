export const authoredDate = '2026-11-18';
const entry = 'tank-gate-signal-1';
const split = 'tank-gate-signal-split-1';
const corner = 'tank-gate-signal-corner-1';
const descriptions = {
  [entry]: 'Stand still and aim toward danger with your hands clear. Action 2 spends The City Holds recovery to mark a retreat behind you. Walk from the arrow side across the sill to take the guard. The reserve and guard expire at the original cast deadline.',
  [split]: 'Divide the sill into two marked halves. Each half holds half the guard and can serve one crossing. The center divider separates the routes. Excludes Corner Post.',
  [corner]: 'Mark two perpendicular ways into one reserve. Either open face can grant the whole guard. Both approaches need clear ground. Excludes Split Watch.',
};
const node = (id, name, depth) => ({
  classId: 'tank', branchId: 'tank-pathways', branchName: 'Specializations',
  subbranchId: entry, subbranchName: 'Bastion', subbranchNameKey: 'pathway.' + entry + '.name',
  capstone: false, effects: {}, id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id,
  grade: depth === 1 ? 'D-' : 'D', depth, cost: 2, freePlaySpRequired: depth === 1 ? 3 : 5,
  prerequisite: depth === 1 ? 'tank-protection-1' : entry, role: depth === 1 ? 'active' : 'fitting',
  description: descriptions[id],
});
export const nodes = [node(entry, 'Gate Signal', 1), node(split, 'Split Watch', 2), node(corner, 'Corner Post', 2)];
export const copy = {
  'pathway.tank-gate-signal-1.name': 'Bastion',
  'ui.tank.bastionPlace': 'Place Gate Signal',
  'ui.tank.bastionBlocked': 'Gate Signal unavailable',
  'ui.tank.bastionHelp': 'Aim toward danger and stand still. Action 2 marks the retreat behind you and spends Ultimate recovery. Follow an arrow across an open sill to claim guard. While carrying a shield, Action 2 stays assigned to its owned fitting.',
};
for (const technique of nodes) {
  copy[technique.nameKey] = technique.name;
  copy['skill.' + technique.id + '.description'] = technique.description;
  copy['pathway.' + technique.id + '.summary'] = technique.description;
}
export function applyTankBastion(catalog) {
  catalog.specializationSkills = catalog.specializationSkills.filter(node => !Object.hasOwn(descriptions, node.id));
  catalog.specializationSkills.push(...structuredClone(nodes));
}
