export const authoredDate = '2026-11-21';

const entry = 'assassin-slip-route-1';
const techniques = [
  { id: entry, name: 'Slip Route', description: 'Face nearby cover while a hostile can see you. Press Action 2 to spend Invisibility recovery. Walk until the cover screens your route. Stop and press again to trade part of the remaining veil for a damageable echo at the entrance.' },
  { id: 'assassin-infiltrator-footstep-relay-1', name: 'Footstep Relay', description: 'After you trade veil for an echo, press Action 2 again to send that same body along part of your walked route. It moves through clear ground and keeps its remaining health and expiry. Excludes Threshold Echo.' },
  { id: 'assassin-infiltrator-threshold-echo-1', name: 'Threshold Echo', description: 'At the walked exit, press Action 2 to watch the route entrance. A hostile crossing into its clear threshold wakes the echo. Stay within range and press again to release it early. Excludes Footstep Relay.' },
];

export function applyAssassinInfiltrator(catalog) {
  const ids = new Set(techniques.map(technique => technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill => !ids.has(skill.id));
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'assassin', branchId: 'assassin-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Infiltrator', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description,
      capstone: false, effects: {}, grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2,
      freePlaySpRequired: first ? 3 : 5, prerequisite: first ? 'assassin-ambush-1' : entry,
      role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  'pathway.assassin-slip-route-1.name': 'Infiltrator',
  'ui.assassin.slipManualHelp': 'Read a cover edge, walk a screened route and leave a physical echo behind you.',
  'ui.assassin.slipFind': 'Face a cover edge',
  'ui.assassin.slipStart': 'Start Slip Route',
  'ui.assassin.slipWalk': 'Walk behind cover',
  'ui.assassin.slipStop': 'Stop at the exit',
  'ui.assassin.slipExchange': 'Leave an echo',
  'ui.assassin.slipArm': 'Watch the entrance',
  'ui.assassin.slipCall': 'Call echo early',
  'ui.assassin.slipWatch': 'Echo waiting',
  'ui.assassin.slipRelay': 'Send echo along route',
  'ui.assassin.slipRelaying': 'Echo following steps',
  'ui.assassin.slipSettle': 'Stop to relay the echo',
  'ui.assassin.slipHelp': 'Face cover where an enemy can see you. Start a route on Invisibility recovery and walk until the cover blocks an enemy’s view. Stop beyond the entrance and press again to leave an echo. With Decoy Veil, the same living decoy moves to the bend.',
  'ui.assassin.slipRelayHelp': 'After leaving an echo, stop and press again while the relay prompt is live. The existing echo follows your walked ground and can still be hit or stopped by cover.',
  'ui.assassin.slipThresholdHelp': 'Arm the echo at the exit. It wakes when a hostile walks into the clear entrance. You can call it early while the original route and veil still have time.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
