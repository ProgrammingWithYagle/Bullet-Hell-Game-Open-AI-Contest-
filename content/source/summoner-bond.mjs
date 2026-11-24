export const authoredDate = '2026-11-23';

const entry = 'summoner-mending-bond-1';
const close = 'summoner-bond-close-stitch-1';
const homeward = 'summoner-bond-homeward-thread-1';
const techniques = [
  { id: entry, name: 'Mending Bond', description: 'Give up two permanent retinue slots. Keep a wounded permanent companion within 190 units and in sight. Mark an enemy with your beacon, then press Action 2 to spend two Focus on the bond. The companion’s next damaging hit on that mark restores up to 20 health.' },
  { id: close, name: 'Close Stitch', description: 'Stay within 108 units of the wounded companion and keep it in sight. Your next damaging beacon hit on the bonded mark restores up to 14 companion health. Excludes Homeward Thread.' },
  { id: homeward, name: 'Homeward Thread', description: 'Spend two Focus to call the wounded companion back from within 240 units, even without a mark. It stops attacking and travels around cover. Reaching you restores up to 18 health. Wait for any Cohort Drive order to finish. Excludes Close Stitch.' },
];

export function applySummonerBond(catalog) {
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'summoner', branchId: 'summoner-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Bonded Companion', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description, capstone: false, effects: {},
      grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2, freePlaySpRequired: first ? 3 : 5,
      prerequisite: first ? 'summoner-bonds-1' : entry, role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  ['pathway.' + entry + '.name']: 'Bonded Companion',
  'ui.bond.overview': 'Lead a smaller retinue and spend Focus to repair one living companion. Buying Mending Bond gives up two permanent slots.',
  'ui.bond.companion': 'Stay near a wounded companion',
  'ui.bond.mark': 'Mark an enemy with your beacon',
  'ui.bond.focus': 'Rebind for two Focus',
  'ui.bond.linked': 'Keep the bond within reach',
  'ui.bond.returning': 'Companion returning',
  'ui.bond.recovering': 'Mending Bond recovering',
  'ui.bond.gathering': 'Wait for Gather to finish',
  'ui.bond.cohort': 'Wait for Cohort Drive to finish',
  'ui.bond.busy': 'Mending Bond unavailable',
  'ui.bond.help': 'Action 2 binds the most wounded eligible permanent companion for four seconds. The bond ends if the companion falls, you move out of reach, or you issue Gather or another retinue order. A broken bond still costs two Focus.',
  'ui.bond.markHelp': 'Keep the companion in sight and keep your mark on the same enemy.',
  'ui.bond.closeHelp': 'At close range, follow with a damaging beacon hit on the same mark.',
  'ui.bond.homewardHelp': 'Leave the returning companion a walkable approach. The repair happens when it reaches you.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
