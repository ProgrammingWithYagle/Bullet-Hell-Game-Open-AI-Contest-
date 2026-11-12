export const lineworkRules={speed:900,radius:3,flightTicks:20,lineTicks:150,cooldown:8,maximumLength:600,bodyStop:10,slack:2};
export const reserveRules={minimumSeparation:100};
const common={classId:'heavy',branchId:'heavy-pathways',branchName:'Specializations',subbranchId:'heavy-linework-1',subbranchName:'Lineworker',subbranchNameKey:'pathway.heavy-linework-1.name',capstone:false,effects:{}};
export const nodes=[
 {...common,id:'heavy-linework-1',name:'Anchor Cartridge',nameKey:'skill.heavy-linework-1.name',sourceSkillId:'heavy-linework-1',grade:'D-',depth:1,cost:2,freePlaySpRequired:3,prerequisite:'heavy-ordnance-1',role:'active',description:'Action1 spends one magazine round on a real900px/s,radius3 anchor with20flight ticks. Current masonry within600px may hold it; living bodies and temporary constructs stop it without becoming attachments. A later separate Action2 engages or brakes the hauling motor. Action1 releases the line. Bare hauling permits lateral walking but commits primary fire. The carried gun stays with your body; current collision, slows and hazards remain. The line lasts150combat ticks from cast, with8second base recovery from payment. A miss still spends the admitted round. Choose Lineworker instead of Flak or Siege Gunner.'},
 {...common,id:'heavy-linework-yoke-1',name:'Straight Yoke',nameKey:'skill.heavy-linework-yoke-1.name',sourceSkillId:'heavy-linework-yoke-1',grade:'D',depth:2,cost:2,freePlaySpRequired:5,prerequisite:'heavy-linework-1',role:'evolution',description:'While hauling, permit ordinary paid primary and restrict ordinary walking to the current anchor approach axis. Aim every shot yourself. A separate Action2 brakes the motor and restores ordinary steering; another engages within the same remaining line. The original one-round anchor,150tick lifetime,600px maximum and recovery remain. Losing this fitting after using its handling releases dependent work. Choose Straight Yoke instead of Open Sheave.'},
 {...common,id:'heavy-linework-sheave-1',name:'Open Sheave',nameKey:'skill.heavy-linework-sheave-1.name',sourceSkillId:'heavy-linework-sheave-1',grade:'D',depth:2,cost:2,freePlaySpRequired:5,prerequisite:'heavy-linework-1',role:'evolution',description:'While braked, pay out actual clear cable up to its original600px maximum, then use a separate Action2 to haul from the changed approach. Keep lateral walking while hauling and keep primary fire committed. Repeated braking never resets the original150tick lifetime, returns the paid anchor round or resets recovery. Losing this fitting after using payout releases dependent work. Choose Open Sheave instead of Straight Yoke.'},
 {...common,id:'heavy-linework-reserve-1',name:'Reserve Anchor',nameKey:'skill.heavy-linework-reserve-1.name',sourceSkillId:'heavy-linework-reserve-1',grade:'B-',depth:3,cost:3,freePlaySpRequired:11,prerequisite:'heavy-linework-1',role:'evolution',description:"While braked on an attached line, Action 3 spends one more magazine round on a second physical anchor. It must attach to current masonry at least 100 px from the first contact. A separate Action 3 selects the reserve and releases the first line. Action 2 then hauls on the selected line. Both anchors share the first cast’s expiry and recovery. A paid shot can miss or hit an obstruction. You can prepare one reserve per first anchor."},
];
export const copy={
 'pathway.heavy-linework-1.name':'Lineworker',
 'pathway.heavy-linework-1.description':'Prepare a real masonry anchor, then commit the feed motor to a finite hauling route while carrying the gun. Choose firing-axis handling or finite cable payout.',
 ...Object.fromEntries(nodes.flatMap(s=>[[s.nameKey,s.name],['skill.'+s.id+'.description',s.description]])),
 'ui.technique3':'Action 3',
 'ui.heavy.reserveAction':'Cast / select reserve',
 'ui.heavy.reserveCast':'Cast reserve',
 'ui.heavy.reserveWaiting':'Reserve in flight',
 'ui.heavy.reserveSelect':'Select reserve',
 'ui.heavy.reserveBrake':'Brake to use reserve',
 'ui.heavy.reserveSpent':'Reserve spent',
 'ui.heavy.reserveNeedsAnchor':'Needs an anchor',
 'ui.heavy.reserveHelp':"While braked on an attached line, Action 3 spends one more magazine round on a second physical anchor. It must attach to current masonry at least 100 px from the first contact. A separate Action 3 selects the reserve and releases the first line. Action 2 then hauls on the selected line. Both anchors share the first cast’s expiry and recovery. A paid shot can miss or hit an obstruction. You can prepare one reserve per first anchor.",
 'ui.heavy.lineworkAction':'Anchor / release',
 'ui.heavy.lineworkDrive':'Haul / brake',
 'ui.heavy.lineworkRelease':'Release anchor',
 'ui.heavy.lineworkWaiting':'Waiting for attachment',
 'ui.heavy.lineworkEngage':'Engage haul',
 'ui.heavy.lineworkBrake':'Brake motor',
 'ui.heavy.lineworkIdle':'Needs an anchor',
 'ui.heavy.lineworkRemaining':'Cable: {seconds}s',
 'ui.heavy.lineworkHelp':'Action1 pays one actual magazine round for a physical masonry anchor, or releases existing work. Wait for its actual attachment, then use a separate Action2 to engage or brake. The carried gun and body move together through current collision. No shield, hazard clearing, terrain passage or automatic aim is granted. The original150tick line and8second base recovery start with the paid shot.',
 'ui.heavy.lineworkBareHelp':'Bare handling keeps lateral walking while hauling and commits primary fire. Braking cannot manufacture more cable; re-engagement may shorten the captured paid length.',
 'ui.heavy.lineworkYokeHelp':'Straight Yoke permits ordinary paid primary while hauling but restricts walking to the current anchor approach axis. Aim manually. Brake to recover lateral steering.',
 'ui.heavy.lineworkSheaveHelp':'Open Sheave allows clear payout while braked, within the same600px maximum and original deadline. Hauling keeps lateral walking and commits primary fire.',
};
export function applyHeavyLinework(c){c.specializationSkills=c.specializationSkills.filter(s=>!nodes.some(n=>n.id===s.id));c.specializationSkills.push(...structuredClone(nodes));c.rules.heavyLinework=structuredClone(lineworkRules);c.rules.heavyLineworkReserve=structuredClone(reserveRules);}
