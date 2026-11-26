export const authoredDate = '2026-11-21';

const entry = 'assassin-crossing-writ-1';
const techniques = [
  { id: entry, name: 'Crossing Writ', description: 'Mark a visible enemy with Action 3. Land two separate primary hits to confirm it. Aim and press again to spend Unwritten Passage recovery on a cutoff. The marked enemy must cross the line before it expires.' },
  { id: 'assassin-mark-hunter-canted-cutoff-1', name: 'Canted Cutoff', description: 'After confirming the writ, press Action 3 to pin a nearby point. Aim independently and press again to pay for the line before the same mark expires. Excludes Transfer Writ.' },
  { id: 'assassin-mark-hunter-transfer-writ-1', name: 'Transfer Writ', description: 'While the paid cutoff is live, aim at a new visible enemy and press Action 3. One fresh primary hit confirms the transfer. The same line and deadline carry over. Excludes Canted Cutoff.' },
];

export function applyAssassinMarkHunter(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'assassin', branchId: 'assassin-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Mark Hunter', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'assassin-evasion-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.assassin-crossing-writ-1.name': 'Mark Hunter',
  'ui.assassin.writManualHelp': 'Confirm a moving quarry with two primary hits, then place a cutoff in its path.',
  'ui.assassin.writFind': 'Find visible quarry',
  'ui.assassin.writStart': 'Mark quarry',
  'ui.assassin.writFirst': 'Land two primary hits',
  'ui.assassin.writSecond': 'One more primary hit',
  'ui.assassin.writAim': 'Aim at clear ground',
  'ui.assassin.writPin': 'Pin cutoff position',
  'ui.assassin.writSet': 'Set cutoff',
  'ui.assassin.writLead': 'Cutoff waiting',
  'ui.assassin.writOffer': 'Offer writ to new quarry',
  'ui.assassin.writTransferHit': 'Hit the new quarry',
  'ui.assassin.writHelp': 'Aim at a moving enemy and mark it. Confirm with two primary hits. Aim across its route and set the line when the guide appears. Placing it spends Unwritten Passage recovery. You can still use Unwritten Passage while preparing the line.',
  'ui.assassin.writCantedHelp': 'Pin a clear point after confirmation. Turn the line around that point and set it before your mark expires.',
  'ui.assassin.writTransferHelp': 'After placing a line, aim at another enemy and press Action 3. Hit that enemy with a new primary shot before the line expires to transfer the writ once.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
