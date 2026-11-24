export const authoredDate = '2026-11-24';

const entry = 'ranger-sight-draw-1';
const roll = 'ranger-rolling-nock-1';
const bearing = 'ranger-change-bearing-1';
const techniques = [
  { id:entry, name:'Sight Draw', description:'Aim and press Action 1 to reserve one arrow. Walk slowly while the bow settles. Press Action 1 again within the aim guides to release from your current position. A dodge, sprint, or expired hold loses the reserved arrow.' },
  { id:roll, name:'Rolling Nock', description:'Once Sight Draw is ready, carry the arrow through one ordinary dodge. Release after landing within the original aim guides and deadline. Excludes Change Bearing.' },
  { id:bearing, name:'Change Bearing', description:'Aim outside the guides and press Action 1 to reset them once. Let the bow settle again, then release before the original deadline. Excludes Rolling Nock.' },
];

export function applyRangerSight(catalog) {
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId:'ranger', branchId:'ranger-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Marksman', subbranchNameKey:'pathway.' + entry + '.name',
      id, name, nameKey:'skill.' + id + '.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first ? 'D-' : 'D', depth:first ? 1 : 2, cost:2, freePlaySpRequired:first ? 3 : 5,
      prerequisite:first ? 'ranger-bowcraft-1' : entry, role:first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  ['pathway.' + entry + '.name']: 'Marksman',
  'ui.rangerSight.overview': 'Hold a drawn arrow and choose when to release it through a narrow aim arc.',
  'ui.rangerSight.busy': 'Sight Draw unavailable',
  'ui.rangerSight.empty': 'Replenish one arrow',
  'ui.rangerSight.recovery': 'Sight Draw recovering',
  'ui.rangerSight.drawing': 'Draw settling',
  'ui.rangerSight.outside': 'Aim within the guides',
  'ui.rangerSight.release': 'Press again to release',
  'ui.rangerSight.rolling': 'Release after the dodge',
  'ui.rangerSight.adjust': 'New bearing settling',
  'ui.rangerSight.change': 'Press to set a new bearing',
  'ui.rangerSight.help': 'Reserve one arrow with Action 1. When the draw settles, aim within the guides and press again. You can walk slowly and choose when to shoot. Other bow actions wait until the hold ends.',
  'ui.rangerSight.rollHelp': 'A ready Sight Draw survives one ordinary dodge with the same deadline. Land and aim within the original guides to release.',
  'ui.rangerSight.bearingHelp': 'Press Action 1 outside the guides to set a new bearing once. The second settling period uses the time left from the first draw.',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
