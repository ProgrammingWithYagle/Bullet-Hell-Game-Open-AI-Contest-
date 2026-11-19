import {nodes as early} from './tank-interceptor.mjs';

export const authoredDate = '2026-11-19';
const crossing = 'tank-interceptor-crossing-1';
const standfast = 'tank-interceptor-standfast-1';
const returnId = 'tank-interceptor-return-crossing-1';
const offsetId = 'tank-interceptor-offset-brace-1';
const descriptions = {
  [returnId]: 'During a sideways Crossing Guard, use Action 3 with the opposite sideways direction to turn back once. Keep the captured facing and original screen deadline. The return route needs clear ground. Action 3 without that direction brakes.',
  [offsetId]: 'When Standfast is ready, give Action 3 a sideways direction relative to your facing. A narrower screen braces farther out on that side and leaves your center exposed. Stay planted to keep it through its original deadline.',
};
function fitting(id,name,prerequisite) {
  const parent=early.find(node=>node.id===prerequisite);
  return {
    ...parent,id,name,nameKey:'skill.'+id+'.name',sourceSkillId:id,
    depth:3,cost:3,capstone:false,freePlaySpRequired:17,grade:'B-',prerequisite,description:descriptions[id],
  };
}
export const nodes = [
  fitting(returnId,'Return Crossing',crossing),
  fitting(offsetId,'Offset Brace',standfast),
];
export const copy = {
  'ui.tank.interceptReturn':'Reverse crossing',
  'ui.tank.interceptOffset':'Brace to either clear side',
  'ui.tank.interceptReturnHelp':'Return Crossing works after the first two steps of a sideways screen. Give Action 3 the opposite sideways direction while time remains. The screen keeps its current facing and paid recovery.',
  'ui.tank.interceptOffsetHelp':'Offset Brace uses Action 3 with a sideways direction after Standfast is ready. The shorter screen covers farther on that side. Hold or release the launch direction while planted. A new walk or Action 3 releases the screen.',
};
for(const node of nodes) {
  copy[node.nameKey]=node.name;
  copy['skill.'+node.id+'.description']=node.description;
  copy['pathway.'+node.id+'.summary']=node.description;
}
export function applyTankInterceptorLate(catalog) {
  catalog.specializationSkills=catalog.specializationSkills.filter(node=>!Object.hasOwn(descriptions,node.id));
  catalog.specializationSkills.push(...structuredClone(nodes));
}
