export const authoredDate = '2026-11-20';

const entry = 'mage-fuse-seal-1';
const techniques = [
  { id: entry, name: 'Fuse Seal', description: 'Plant a seal on clear floor with Action 3. Spend Binding Sigil or Ward Detonation near it to charge a forward or transverse stroke and commit Silent Twelfth recovery. Charge the other spell on a later beat to combine the strokes and shorten the fuse. Aim and use the same action while still to release. A wound takes time off the fuse.' },
  { id: 'mage-volatile-shunt-fuse-1', name: 'Shunt Fuse', description: 'Walk away from a single-charge seal, then press Action 3 while walking to shift it once to the clear floor under you. The shift takes time off the same paid fuse. Stop and aim to release. Excludes Twin Vent.' },
  { id: 'mage-volatile-twin-vent-1', name: 'Twin Vent', description: 'Feed both spells on different beats. Release each stroke separately in the order you charged them. Aim again for the second stroke before the same fuse expires. Each target can take only one hit across both strokes. Excludes Shunt Fuse.' },
];

export function applyMageVolatileSpellwork(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'mage', branchId: 'mage-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Volatile Spellwork', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'mage-hexcraft-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.mage-fuse-seal-1.name': 'Volatile Spellwork',
  'ui.mage.fuseManualHelp': 'Set a seal and feed it a spell to choose a stroke. Release it while the fuse burns.',
  'ui.mage.fuseSet': 'Plant seal',
  'ui.mage.fuseFind': 'Stand on clear floor',
  'ui.mage.fuseFeed': 'Cast Binding or Ward',
  'ui.mage.fuseAim': 'Stop and aim',
  'ui.mage.fuseBinding': 'Release forward stroke',
  'ui.mage.fuseWard': 'Release cross stroke',
  'ui.mage.fuseCrossed': 'Release both strokes',
  'ui.mage.fuseShunt': 'Walk and press to shunt',
  'ui.mage.fuseSplit': 'Aim the first stroke',
  'ui.mage.fuseEcho': 'Aim and release again',
  'ui.mage.fuseHurry': 'Wounded · release soon',
  'ui.mage.fuseHelp': 'Plant while still and feed the seal a paid Binding or Ward action. That commits Silent Twelfth recovery. Stop and aim to release the charged stroke. The other spell can join it on a later beat.',
  'ui.mage.fuseShuntHelp': 'Walk several steps from a single-charge seal. Press the same action while walking once to move the seal under you. The fuse loses time. Stop to release.',
  'ui.mage.fuseTwinHelp': 'Feed both spells on separate beats. Use the seal action once for the first stroke. Aim again and press for the second before the same fuse goes out.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
