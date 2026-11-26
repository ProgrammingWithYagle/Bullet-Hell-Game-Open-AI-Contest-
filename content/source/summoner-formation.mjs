export const authoredDate = '2026-11-23';

const entry = 'summoner-set-the-line-1';
const walking = 'summoner-walking-rank-1';
const turn = 'summoner-quarter-turn-1';
const techniques = [
  { id: entry, name: 'Set the Line', description: 'Aim at clear ground and spend two Focus with Action 3. Two living permanent companions walk to posts ahead of you and give up their attacks while assigned. Once both settle, each can catch one incoming shot across the line and takes its damage.' },
  { id: walking, name: 'Walking Rank', description: 'Replant a narrower line as you walk within 155 units of your casting position. The companions move under their own power and catch shots only when both settle again. Excludes Quarter Turn.' },
  { id: turn, name: 'Quarter Turn', description: 'Once both companions hold the line, aim to a side and press Action 3 again to turn the posts 90 degrees around their center. The companions must reach the new posts. The turn keeps the original time and catches. Excludes Walking Rank.' },
];

export function applySummonerFormation(catalog) {
  for (const { id, name, description } of techniques) {
    const first = id === entry;
    catalog.specializationSkills.push({
      classId: 'summoner', branchId: 'summoner-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Formation Keeper', subbranchNameKey: 'pathway.' + entry + '.name',
      id, name, nameKey: 'skill.' + id + '.name', sourceSkillId: id, description, capstone: false, effects: {},
      grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2, freePlaySpRequired: first ? 3 : 5,
      prerequisite: first ? 'summoner-bonds-1' : entry, role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  ['pathway.' + entry + '.name']: 'Formation Keeper',
  'ui.formation.overview': 'Set two companions to hold a line. They give up their attacks and take damage from the shots they catch.',
  'ui.formation.company': 'Call two nearby permanent companions',
  'ui.formation.ground': 'Aim at clear ground',
  'ui.formation.focus': 'Rebind for two Focus',
  'ui.formation.setting': 'Companions taking their posts',
  'ui.formation.set': 'Companions holding the line',
  'ui.formation.turnReady': 'Aim to a side to turn the line',
  'ui.formation.recovering': 'Set the Line recovering',
  'ui.formation.gathering': 'Wait for Gather to finish',
  'ui.formation.cohort': 'Wait for Cohort Drive to finish',
  'ui.formation.returning': 'Wait for the companion to return',
  'ui.formation.busy': 'Set the Line unavailable',
  'ui.formation.help': 'Stand behind the line and aim it toward the incoming shots. Two companions must reach their posts. Gather, another ordinary order, or the loss of either companion ends the formation.',
  'ui.formation.walkingHelp': 'Pause your movement to let both companions settle the narrower line again.',
  'ui.formation.turnHelp': 'Aim left or right and press Action 3 once more to turn the formed line without spending more Focus.',
  'ui.bond.formation': 'Wait for the formation to finish',
};
for (const { id, name, description } of techniques) {
  copy['skill.' + id + '.name'] = name;
  copy['skill.' + id + '.description'] = description;
  copy['pathway.' + id + '.summary'] = description;
}
