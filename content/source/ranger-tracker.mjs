export const authoredDate = '2026-11-24';

const entry = 'ranger-read-the-sign-1';
const stakes = 'ranger-trail-stakes-1';
const backtrack = 'ranger-backtrack-1';
const techniques = [
  { id:entry, name:'Read the Sign', description:'Hit a visible enemy with an ordinary arrow, then press Action 2 near the last contact. Cross to a new shooting lane and hit the same enemy with another ordinary arrow to recover one arrow.' },
  { id:stakes, name:'Trail Stakes', description:'While the trail is active, a newly placed Tripline can also recover the arrow by damaging the tracked enemy. Uses the normal Tripline action and arming time. Excludes Backtrack.' },
  { id:backtrack, name:'Backtrack', description:'Trace the enemy, then move away from the original firing point. Return to its marked circle and land an ordinary arrow on the same enemy to recover one arrow. Excludes Trail Stakes.' },
];

export function applyRangerTracker(catalog) {
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId:'ranger', branchId:'ranger-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Tracker', subbranchNameKey:'pathway.' + entry + '.name',
      id, name, nameKey:'skill.' + id + '.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first ? 'D-' : 'D', depth:first ? 1 : 2, cost:2, freePlaySpRequired:first ? 3 : 5,
      prerequisite:first ? 'ranger-trailkeeping-1' : entry, role:first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  ['pathway.' + entry + '.name']: 'Tracker',
  'ui.rangerTracker.overview': 'Read an ordinary arrow hit and follow the target’s visible trail. A second hit from a new angle recovers an arrow.',
  'ui.rangerTracker.busy': 'Trail unavailable',
  'ui.rangerTracker.recovering': 'Trail recovering',
  'ui.rangerTracker.find': 'Hit with an ordinary arrow',
  'ui.rangerTracker.distance': 'Move toward the last contact',
  'ui.rangerTracker.flank': 'Move across the first shot',
  'ui.rangerTracker.stake': 'Change lane or set Tripline',
  'ui.rangerTracker.leave': 'Leave the original firing point',
  'ui.rangerTracker.return': 'Return to the marked circle',
  'ui.rangerTracker.follow': 'Shoot the tracked target',
  'ui.rangerTracker.help': 'After an ordinary arrow damages a visible enemy, press Action 2 near the last contact. Move across the first shot’s line and land another ordinary arrow on that enemy before the trail fades.',
  'ui.rangerTracker.stakesHelp': 'A fresh Tripline can also finish the trail. Place it after reading the trail and let it damage the same enemy.',
  'ui.rangerTracker.backtrackHelp': 'Read a trail after an ordinary arrow hits. Move away from the old firing point, return inside its marked circle, then land a new ordinary arrow on the tracked enemy.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
