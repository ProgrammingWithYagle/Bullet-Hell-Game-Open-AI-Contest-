export const authoredDate = '2026-11-19';

const entry = 'medic-rescue-run-1';
const switchback = 'medic-response-switchback-1';
const handoff = 'medic-response-moving-handoff-1';
const techniques = [
  { id: entry, name: 'Rescue Run', description: 'Use Action 2 with a clear step ahead while moving to spend Cleansing Serum recovery. Steer the brief run yourself. Cover 48 pixels, stop, and use Action 2 for one focused dose on an aimed ally or yourself. Hold Revive in reach for an ordinary rescue.' },
  { id: switchback, name: 'Switchback', description: 'After 36 pixels of Rescue Run, use Action 2 while taking a turn of at least 60 degrees. A clear turn buys a quarter-second of extra running once. Excludes Moving Handoff.' },
  { id: handoff, name: 'Moving Handoff', description: 'After 48 pixels of Rescue Run, aim at a nearby ally or away for yourself and use Action 2 while still moving. Give one smaller dose immediately and end the run. Excludes Switchback.' },
];

export function applyMedicRapidResponse(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const founder = id === entry;
    catalog.specializationSkills.push({
      classId: 'medic', branchId: 'medic-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Rapid Response', subbranchNameKey: 'pathway.' + entry + '.name',
      capstone: false, effects: {}, id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id,
      grade: founder ? 'D-' : 'D', depth: founder ? 1 : 2, cost: 2, freePlaySpRequired: founder ? 3 : 5,
      prerequisite: founder ? 'medic-recovery-1' : entry, role: founder ? 'active' : 'fitting', description,
    });
  }
}

export const copy = {
  'pathway.medic-rescue-run-1.name': 'Rapid Response',
  'ui.medic.responseRun': 'Run with serum',
  'ui.medic.responseStep': 'Keep running',
  'ui.medic.responseBrake': 'Stop to use the dose',
  'ui.medic.responseDose': 'Give focused dose',
  'ui.medic.responseAim': 'Aim at a wounded ally or toward clear ground for yourself',
  'ui.medic.responseTurn': 'Take the switchback',
  'ui.medic.responseHandoff': 'Give dose while moving',
  'ui.medic.responseHelp': 'Use Rescue Run while moving. Steer around walls. Stop after covering enough ground and use the same control for one dose. You can use your usual Revive control beside a fallen ally.',
  'ui.medic.responseTurnHelp': 'Once you have covered 36 pixels, turn sharply and use Rescue Run during that step to extend the run once.',
  'ui.medic.responseHandoffHelp': 'Once you have covered 48 pixels, aim at a wounded ally or away for yourself. Use Rescue Run while moving to give a smaller dose and end the run.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
