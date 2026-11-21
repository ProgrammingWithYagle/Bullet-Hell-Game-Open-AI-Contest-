export const authoredDate = '2026-11-20';

const entry = 'mage-pivot-sigil-1';
const techniques = [
  { id: entry, name: 'Pivot Sigil', description: 'Stand still and aim at clear floor. Use Action 1 to mark a pivot. Stand within clear reach and press again to spend Binding Sigil recovery. Aim to guide the line for a moment. It stops at walls, hits each enemy once and briefly slows ordinary minions. Firing, dodging or casting ends the guided line.' },
  { id: 'mage-binding-fixed-angle-1', name: 'Fixed Angle', description: 'Turn the live line by about 23 degrees, then stand still and use Action 1 to fix the line in place. The same stroke stays until its original deadline while you act or move. Excludes Reverse Face.' },
  { id: 'mage-binding-reverse-face-1', name: 'Reverse Face', description: 'After turning the line by about 36 degrees, stand still, aim at its opposite face and use Action 1. The line moves there once and keeps its remaining time, turn allowance and earlier contacts. Excludes Fixed Angle.' },
];

export function applyMageBinding(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'mage', branchId: 'mage-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Binding', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'mage-control-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.mage-pivot-sigil-1.name': 'Binding',
  'ui.mage.fieldManual': 'Mage field manual',
  'ui.mage.manualHelp': 'Binding shapes space from a floor pivot. Spend Binding Sigil recovery only when the line starts.',
  'ui.mage.pivotMark': 'Mark pivot',
  'ui.mage.pivotFindFloor': 'Aim at clear floor',
  'ui.mage.pivotStroke': 'Draw the line',
  'ui.mage.pivotLineup': 'Line up the stroke',
  'ui.mage.pivotGuide': 'Guide the stroke',
  'ui.mage.pivotFix': 'Fix the line',
  'ui.mage.pivotFixed': 'Line fixed',
  'ui.mage.pivotOpposite': 'Aim opposite',
  'ui.mage.pivotReverse': 'Reverse the line',
  'ui.mage.pivotHelp': 'Plant your feet and aim into an open lane. Mark the floor, then use the same control while still within clear reach. You can walk and steer the live line. Firing, dodging or casting releases it. Binding Sigil stays available until you spend its recovery.',
  'ui.mage.pivotFixedHelp': 'Guide the line through a turn, stop and use the same control. The fixed line keeps its original end time while you move or fire.',
  'ui.mage.pivotReverseHelp': 'Guide the line through a sharper turn, stop, face the opposite way and use the same control. The new face keeps the same time and earlier contacts.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
