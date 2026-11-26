import {nodes as originalFittings} from './tank-bulwark.mjs';

export const authoredDate = '2026-11-18';
const folded = 'tank-bulwark-folded-setdown-1';
const side = 'tank-bulwark-side-port-1';
const descriptions = {
  [folded]: 'When terrain blocks a full-width setdown, stand still and use Action 1 to leave the shield folded. It keeps its current health and expires on schedule. You can use your weapon again. The folded shield stays fixed until it breaks or expires.',
  [side]: 'With the port open, stand still, aim 12 to 35 degrees off center and use Action 2 to move the slit once. Keep still for 0.2 seconds. The old slit stays open during the shift. Aim along the new opening to fire using your ammunition.',
};
const summaries = {
  [folded]: 'Leave narrow fixed cover in a tight lane when a full-width setdown is blocked.',
  [side]: 'Move the open slit once to fire along a new bearing without turning the carried shield.',
};
function fitting(id, name, prerequisite) {
  const original = originalFittings.find(node => node.id === prerequisite);
  return {
    ...original, id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id,
    capstone: false, grade: 'B-', depth: 3, cost: 3, freePlaySpRequired: 17, prerequisite,
    description: descriptions[id],
  };
}
export const nodes = [
  fitting(folded, 'Folded Setdown', 'tank-bulwark-pivot-1'),
  fitting(side, 'Side Port', 'tank-bulwark-port-1'),
];
export const copy = {
  'ui.tank.setFoldedShield': 'Set down folded',
  'ui.tank.shiftPort': 'Shift port',
  'ui.tank.shiftingPort': 'Shifting port',
  'ui.tank.foldedSetdownHelp': 'Folded Setdown lets you leave fixed narrow cover. Stand still when terrain blocks the full-width setdown and use Action 1 to free your hands.',
  'ui.tank.sidePortHelp': 'With Side Port, aim 12 to 35 degrees off center while the port is open. When Shift port appears, use Action 2 and stay still for 0.2 seconds. You can shift only once per wall. Aim straight ahead and use Action 2 to close it.',
};
for (const node of nodes) {
  copy[node.nameKey] = node.name;
  copy['skill.' + node.id + '.description'] = node.description;
  copy['pathway.' + node.id + '.summary'] = summaries[node.id];
}
export function applyTankBulwarkLate(catalog) {
  catalog.specializationSkills = catalog.specializationSkills.filter(node => !Object.hasOwn(descriptions, node.id));
  catalog.specializationSkills.push(...structuredClone(nodes));
}
