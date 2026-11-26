export const authoredDate = '2026-11-20';

const entry = 'medic-precaution-wrap-1';
const skills = [
  { id: entry, name: 'Precaution Wrap', description: 'Stand still and use Action 3 to prepare one living patient for 2.2 seconds. The first hostile projectile, charge contact or Stitchwright seam that takes health from the patient spends Healing Field recovery and schedules a small follow-up dose. Casting Healing Field ends any unused wrap.' },
  { id: 'medic-preventive-doorstep-kit-1', name: 'Doorstep Kit', description: 'Prepare yourself, then use Action 3 while standing on clear ground to leave the same wrap at your feet. The first living player to walk in from outside takes it. The original deadline follows the wrap. Excludes Layered Wrap.' },
  { id: 'medic-preventive-layered-wrap-1', name: 'Layered Wrap', description: 'Use Action 3 again while the same patient is within reach. The wrap can record two separate qualifying wounds. Stand still within reach and use Action 3 before expiry to schedule a single dose based on the wounds so far. The first wound spends the original recovery. Excludes Doorstep Kit.' },
];

export function applyMedicPreventiveCare(catalog) {
  const ids = new Set(skills.map(skill => skill.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of skills) {
    const first = id === entry;
    catalog.specializationSkills.push({ classId: 'medic', branchId: 'medic-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Preventive Care', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'medic-chemistry-1' : entry, role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.medic-precaution-wrap-1.name': 'Preventive Care',
  'ui.medic.wrapPrepare': 'Prepare a wrap',
  'ui.medic.wrapAim': 'Aim at an ally or away for yourself',
  'ui.medic.wrapWaiting': 'Wrap ready for a hit',
  'ui.medic.wrapSettle': 'Dose settling',
  'ui.medic.wrapPlace': 'Place Doorstep Kit',
  'ui.medic.wrapStation': 'Kit on the ground',
  'ui.medic.wrapLayer': 'Layer this wrap',
  'ui.medic.wrapLayerWaiting': 'Waiting for a hit',
  'ui.medic.wrapRelease': 'Give layered dose',
  'ui.medic.wrapPrepareHelp': 'Stand still and aim at a nearby living ally or away for yourself. The first nonlethal projectile, charge or stitched-seam wound pays for the short follow-up dose. Healing Field remains available until that hit.',
  'ui.medic.wrapDoorstepHelp': 'Wrap yourself. Use the same control on clear ground to set the kit down. Walk in from outside to claim it or leave it for a teammate.',
  'ui.medic.wrapLayerHelp': 'Before a hit, use the wrap control again to layer it. After one or two wounds, use it again while still and in reach to give the one dose.',
};
for (const { id, name, description } of skills) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
