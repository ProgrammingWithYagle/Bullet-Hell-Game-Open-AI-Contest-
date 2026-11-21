export const authoredDate = '2026-11-20';

const entry = 'assassin-called-opening-1';
const techniques = [
  { id: entry, name: 'Called Opening', description: 'Use Action 1 while still to mark one visible enemy. Walk sideways past one shoulder while keeping the target in view. Stop, aim at that enemy and press again to spend Shadow Step recovery on a single strike.' },
  { id: 'assassin-duelist-passing-cut-1', name: 'Passing Cut', description: 'After earning the opening, aim and press Action 1 during another real sideways step in the same direction. The strike spends Shadow Step recovery and preserves your walking pace. Excludes Counterturn.' },
  { id: 'assassin-duelist-counterturn-1', name: 'Counterturn', description: 'After earning the opening, walk the other way and press Action 1 to turn back. Walk partway across your old line, then stop and strike the same enemy before the original clock ends. Excludes Passing Cut.' },
];

export function applyAssassinDuelist(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'assassin', branchId: 'assassin-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Duelist', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'assassin-precision-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.assassin-called-opening-1.name': 'Duelist',
  'ui.assassin.fieldManual': 'Assassin field manual',
  'ui.assassin.duelManualHelp': 'Pick one enemy, walk across its bearing and strike the opening.',
  'ui.assassin.duelMark': 'Mark one enemy',
  'ui.assassin.duelFind': 'Aim at a visible enemy',
  'ui.assassin.duelMeasure': 'Walk past one shoulder',
  'ui.assassin.duelAlign': 'Stop and aim',
  'ui.assassin.duelStrike': 'Strike the opening',
  'ui.assassin.duelPass': 'Cut on the next step',
  'ui.assassin.duelTurn': 'Walk back across the line',
  'ui.assassin.duelHelp': 'Mark one enemy while still. Move across its bearing to earn the opening. Keep the enemy in sight. Stop and aim at it to strike on your Shadow Step recovery.',
  'ui.assassin.duelPassingHelp': 'Once the opening is ready, aim at the marked enemy and press on another sideways step in the same direction.',
  'ui.assassin.duelCounterHelp': 'Once ready, press while stepping the other way. Walk farther back along that bearing and stop to strike before the first deadline.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
