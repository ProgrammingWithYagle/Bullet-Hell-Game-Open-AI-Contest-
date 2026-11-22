export const authoredDate = '2026-11-21';

const entry = 'bard-call-and-response-1';
const techniques = [
  { id: entry, name: 'Call and Response', description: 'Earn two cadence. Aim at clear ground and press Action 1 to spend Resolving Phrase recovery and your cadence. A call sounds at your feet. Hit an enemy with a primary note fired from the marked stage, then press again to answer there.' },
  { id: 'bard-conductor-side-stage-1', name: 'Side Stage', description: 'Earn one fresh cadence after the call. Aim to one side and press Action 1 to move the same reply stage. A new primary note must land before the original deadline. Excludes Reprise.' },
  { id: 'bard-conductor-reprise-1', name: 'Reprise', description: 'After a note confirms the reply, face the original call site and press Action 1 to send the reply back there. Aim elsewhere to answer from the marked stage. Excludes Side Stage.' },
];

export function applyBardConductor(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({ classId:'bard', branchId:'bard-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Conductor', subbranchNameKey:'pathway.' + entry + '.name',
      id, name, nameKey:'skill.' + id + '.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first ? 'D-' : 'D', depth:first ? 1 : 2, cost:2, freePlaySpRequired:first ? 3 : 5,
      prerequisite:first ? 'bard-performance-1' : entry, role:first ? 'active' : 'fitting' });
  }
}

export const copy = {
  'pathway.bard-call-and-response-1.name': 'Conductor',
  'ui.bard.fieldManual': 'Bard field manual',
  'ui.bard.conductorManualHelp': 'Choose where the call sounds and when to answer from the next stage.',
  'ui.bard.earnCadence': 'Earn two cadence',
  'ui.bard.startCall': 'Start the call',
  'ui.bard.findStage': 'Aim at clear ground',
  'ui.bard.landStageNote': 'Land a note from the stage',
  'ui.bard.shiftStage': 'Move the reply stage',
  'ui.bard.returnRange': 'Move within range',
  'ui.bard.answerAtStage': 'Answer at the stage',
  'ui.bard.answerAtCall': 'Answer at the call',
  'ui.bard.conductorHelp': 'Make the call on Resolving Phrase recovery. Hit an enemy with a primary note fired from the marked stage. Press again while the stage is live to answer. Both pulses protect nearby allies.',
  'ui.bard.sideHelp': 'Earn one fresh cadence before your reply is confirmed. Aim to one side to move the stage once. A new note must hit before the original deadline.',
  'ui.bard.repriseHelp': 'After the qualifying note, face the original call site to send your reply there. The aim guide shows the chosen reply location.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
