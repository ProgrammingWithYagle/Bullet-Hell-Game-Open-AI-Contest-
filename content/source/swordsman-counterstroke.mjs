export const authoredDate = '2026-11-22';

const entry = 'swordsman-drawn-reply-1';
const techniques = [
  { id:entry, name:'Drawn Reply', description:'Press Action 2 to spend Frontal Guard recovery on one ordinary projectile crossing your blade. A genuine stop opens a brief opportunity to aim forward and press Action 2 again for one sword cut.' },
  { id:'swordsman-counterstroke-needle-return-1', name:'Needle Return', description:'After a genuine stop, face back along the projectile’s path and press Action 2 to release one short returning point. Cover or the first target stops it. Excludes Back Answer.' },
  { id:'swordsman-counterstroke-back-answer-1', name:'Back Answer', description:'After a genuine stop, turn at least 45 degrees from the original guard to sweep beside or behind you. Aim forward for an ordinary drawn reply. Either choice spends the one answer. Excludes Needle Return.' },
];

export function applySwordsmanCounterstroke(catalog) {
  const ids = new Set(techniques.map(technique=>technique.id));
  catalog.specializationSkills = catalog.specializationSkills.filter(skill=>!ids.has(skill.id));
  for (const {id,name,description} of techniques) {
    const first = id===entry;
    catalog.specializationSkills.push({
      classId:'swordsman', branchId:'swordsman-pathways', branchName:'Specializations',
      subbranchId:entry, subbranchName:'Counterstroke', subbranchNameKey:'pathway.'+entry+'.name',
      id, name, nameKey:'skill.'+id+'.name', sourceSkillId:id, description, capstone:false, effects:{},
      grade:first?'D-':'D', depth:first?1:2, cost:2, freePlaySpRequired:first?3:5,
      prerequisite:first?'swordsman-edgework-1':entry, role:first?'active':'fitting',
    });
  }
}

export const copy = {
  'pathway.swordsman-drawn-reply-1.name':'Counterstroke',
  'ui.sword.replyOverview':'Stop one projectile at the blade, then choose when to answer it.',
  'ui.sword.replyRaise':'Raise the reply guard',
  'ui.sword.replyRecover':'Frontal Guard recovering',
  'ui.sword.replyWait':'Wait for a projectile',
  'ui.sword.replyForwardAim':'Face the front mark',
  'ui.sword.replyNeedleAim':'Face the return line',
  'ui.sword.replyBackAim':'Face forward or toward a flank',
  'ui.sword.replyRelease':'Deliver the drawn reply',
  'ui.sword.replyHelp':'Spend Frontal Guard recovery to stop one projectile. A real stop opens a brief manual answer. Ordinary E keeps its own three-shot guard.',
  'ui.sword.replyNeedleHelp':'Face back along the stopped shot’s bearing for one short return. Walls and the first target stop it.',
  'ui.sword.replyBackHelp':'After the stop, turn at least 45 degrees to sweep beside or behind you. Face the original heading for a front answer.',
};
for (const {id,name,description} of techniques) {
  copy['skill.'+id+'.name'] = name;
  copy['skill.'+id+'.description'] = description;
  copy['pathway.'+id+'.summary'] = description;
}
