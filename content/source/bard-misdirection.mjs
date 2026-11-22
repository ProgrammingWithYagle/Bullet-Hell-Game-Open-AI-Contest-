export const authoredDate = '2026-11-21';

const entry = 'bard-false-entrance-1';
const techniques = [
  { id:entry, name:'False Entrance', description:'Earn two cadence. Aim at clear floor and press Action 3 to mark a false entrance for a few seconds. Walk away from the call to arm it. One nearby ordinary enemy already pursuing you can follow the mark briefly. It still hits players it reaches.' },
  { id:'bard-misdirection-wrong-door-1', name:'Wrong Door', description:'While a pursuer follows the mark, aim at a different clear entrance and press Action 3. Spend one fresh cadence to turn that same pursuer within the original window. Excludes Second Entrance.' },
  { id:'bard-misdirection-second-entrance-1', name:'Second Entrance', description:'After the first pursuer reaches the mark, press Action 3 to spend one fresh cadence. The same mark can draw one different ordinary enemy before it closes. Excludes Wrong Door.' },
];

export function applyBardMisdirection(catalog) {
  const ids=new Set(techniques.map(technique=>technique.id));
  catalog.specializationSkills=catalog.specializationSkills.filter(skill=>!ids.has(skill.id));
  for(const {id,name,description} of techniques){
    const first=id===entry;
    catalog.specializationSkills.push({classId:'bard',branchId:'bard-pathways',branchName:'Specializations',
      subbranchId:entry,subbranchName:'Misdirection',subbranchNameKey:'pathway.'+entry+'.name',
      id,name,nameKey:'skill.'+id+'.name',sourceSkillId:id,description,capstone:false,effects:{},
      grade:first?'D-':'D',depth:first?1:2,cost:2,freePlaySpRequired:first?3:5,
      prerequisite:first?'bard-company-1':entry,role:first?'active':'fitting'});
  }
}

export const copy = {
  'pathway.bard-false-entrance-1.name':'Misdirection',
  'ui.bard.entranceManualHelp':'Draw a pursuer off your path by leaving a brief false entrance behind you.',
  'ui.bard.entranceWalk':'Walk away from the call',
  'ui.bard.entranceWait':'Wait for a pursuer',
  'ui.bard.entranceTurn':'Turn the false entrance',
  'ui.bard.entranceTaken':'Pursuer diverted',
  'ui.bard.entranceRepeat':'Ring the entrance again',
  'ui.bard.entranceFresh':'Earn one fresh cadence',
  'ui.bard.entranceSet':'Mark the false entrance',
  'ui.bard.entranceAim':'Aim at clear floor',
  'ui.bard.entranceHelp':'Place the cue and walk away from the call to arm it. A nearby ordinary enemy already chasing you can follow the false path for a short time.',
  'ui.bard.entranceWrongHelp':'Spend one fresh cadence while a pursuer is diverted to move the same entrance once. Its original deadline stays in effect.',
  'ui.bard.entranceSecondHelp':'Wait for the first pursuer to reach the mark, then spend one fresh cadence to draw a different pursuer to that entrance.',
};
for(const {id,name,description} of techniques){
  copy['skill.'+id+'.name']=name;
  copy['skill.'+id+'.description']=description;
  copy['pathway.'+id+'.summary']=description;
}
