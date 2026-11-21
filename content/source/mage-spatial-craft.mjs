export const authoredDate = '2026-11-20';

const entry = 'mage-waymark-return-1';
const techniques = [
  { id: entry, name: 'Waymark Return', description: 'Set a waymark at your feet with Action 2. Walk a clear trail away. Stop and press again to spend Ward Detonation recovery and follow the same trail back. You can still take hits on the way. A new movement order or committed action ends the return.' },
  { id: 'mage-spatial-hold-trace-1', name: 'Hold the Trace', description: 'Travel partway back, then use Action 2 to hold the return briefly in place. You can fire or cast Binding Sigil there. Use Action 2 again to resume once before the hold ends. Both legs keep the original deadline. Excludes Side Landing.' },
  { id: 'mage-spatial-side-landing-1', name: 'Side Landing', description: 'Near the end of a return, aim across the trail into clear space and use Action 2. The last part bends there once, with the original time and the remaining distance budget. Excludes Hold the Trace.' },
];

export function applyMageSpatialCraft(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'mage', branchId: 'mage-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Spatial Craft', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'mage-warding-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.mage-waymark-return-1.name': 'Spatial Craft',
  'ui.mage.spatialManualHelp': 'Set a waymark before you leave. Return along the floor you walked when the position is worth the Ward Detonation recovery.',
  'ui.mage.waymarkMark': 'Set waymark',
  'ui.mage.waymarkFind': 'Stand on clear floor',
  'ui.mage.waymarkWalk': 'Walk the trail',
  'ui.mage.waymarkCommit': 'Follow the trail',
  'ui.mage.waymarkLive': 'Returning',
  'ui.mage.waymarkHold': 'Hold the trace',
  'ui.mage.waymarkResume': 'Resume the return',
  'ui.mage.waymarkAimSide': 'Aim across the trail',
  'ui.mage.waymarkSide': 'Take side landing',
  'ui.mage.waymarkHelp': 'Stand on clear floor and set a waymark. Walk away, then stop and use the same control when the return is ready. Leave room to keep the route clear. Ward Detonation stays available while preparing the trail.',
  'ui.mage.waymarkHoldHelp': 'When partway back, use the return control to stop briefly. Take a shot or cast Binding Sigil, then press it once more to follow the rest before the hold expires.',
  'ui.mage.waymarkSideHelp': 'Near the end, aim across the trail and use the return control. A clear side lane becomes the final landing on the same paid return.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
