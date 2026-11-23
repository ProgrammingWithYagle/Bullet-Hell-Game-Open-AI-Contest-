export const authoredDate = '2026-11-23';

const entry = 'summoner-cohort-drive-1';
const techniques = [
  { id: entry, name: 'Cohort Drive', description: 'Mark an enemy with a damaging beacon hit. Press Action 1 to spend one Focus and send two living permanent companions to separate approaches. Each reaches its position, makes one ordinary attack when in range, then returns to its orders.' },
  { id: 'summoner-cohort-cross-orders-1', name: 'Cross Orders', description: 'Send the two companions around opposite sides of the mark. They must travel and attack through legal ground and clear lines. Excludes Relay Orders.' },
  { id: 'summoner-cohort-relay-orders-1', name: 'Relay Orders', description: 'Send the lead companion first. If its ordered attack damages the mark, press Action 1 again during the opening to send the second companion toward your current beacon mark. The second order uses the Focus already spent. Excludes Cross Orders.' },
];

export function applySummonerCohort(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'summoner', branchId: 'summoner-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Cohort Commander', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description, capstone: false, effects: {},
      grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2, freePlaySpRequired: first ? 3 : 5,
      prerequisite: first ? 'summoner-bonds-1' : entry, role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.summoner-cohort-drive-1.name': 'Cohort Commander',
  'ui.cohort.overview': 'Mark a target and direct your living companions along distinct approaches.',
  'ui.cohort.mark': 'Mark an enemy with your beacon',
  'ui.cohort.company': 'Call two permanent companions',
  'ui.cohort.march': 'Companions advancing',
  'ui.cohort.recover': 'Cohort Drive recovering',
  'ui.cohort.focus': 'Rebind to recover Focus',
  'ui.cohort.blocked': 'Wait for a clear approach',
  'ui.cohort.relay': 'Send the second companion',
  'ui.cohort.help': 'Hit with the beacon, then press Action 1 with two living permanent companions. Each walks to its assignment before attacking. Gather or a new ordinary order recalls the command.',
  'ui.cohort.crossHelp': 'Use opposite approaches when there is room around the mark.',
  'ui.cohort.relayHelp': 'Wait for the lead companion to damage the mark. Press Action 1 to direct the second companion to your current mark before the opening closes.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
