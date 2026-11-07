import{heavyFlakMessages}from'./heavy-flak.mjs';
import {soldierSkirmisherMessages}from'./soldier-skirmisher.mjs';
import {engineerMachineryMessages} from './engineer-machinery.mjs';
import {engineerTrapsMessages} from './engineer-traps.mjs';
import {engineerBuilderMessages} from './engineer-builder.mjs';
const en={
  'ui.pathways':'Specializations',
  'ui.pathwayHelp':'Choose one Q specialization for this run. Open General to buy Level Footing (1 SP), then choose one D- technique (2 SP). Choosing neither keeps Rivet Turret.',
  'ui.pathwayConflict':'Conflicts with {name}. Choose a different build on your next run.',
  'branch.engineer-pathways':'Specializations',
  'pathway.engineer-machinery-1.name':'Machinery',
  'pathway.engineer-traps-1.name':'Traps',
  'skill.engineer-machinery-1.name':'Carriage Sentry',
  'skill.engineer-traps-1.name':'Pressure Charges',
  'pathway.engineer-machinery-1.summary':'Move your machine, then hold position to let it brace and fire. Q keeps its 18-second base cooldown.',
  'pathway.engineer-traps-1.summary':'Prepare an approach and lure enemies into armed ground. Q keeps its 18-second base cooldown.',
  'skill.engineer-machinery-1.description':'Q deploys an 80-health carriage for 12 seconds. It follows your movement at 150 pixels/second while holding its deployment offset, then braces for 0.5 seconds before firing at visible enemies within 420 pixels. Base output is 30 damage/second while braced; moving stops fire and banks no shots. Siege overclock, Crossfire Pair and extra-turret capacity still apply. Replaces Rivet Turret; excludes Pressure Charges.',
  'skill.engineer-traps-1.description':'Q places one charge 120 pixels ahead: 1 second to arm, then a 44-pixel trigger and a visible 0.5-second fuse. Its 100-pixel blast deals 150 base damage, with turret-damage bonuses; ordinary enemies slow by 50% for 2 seconds, bosses are never slowed. Cover blocks triggering and blasts. Maximum two owned charges, each expiring after 36 seconds. Invalid ground or full capacity spends no cooldown. Replaces Q turrets; excludes Carriage Sentry, Crossfire Pair and extra-turret capstones. Barricade and Impossible Machine remain available.',
};
// This pilot's detailed copy is explicitly English. Full translations remain pending.
export const engineerPathwayMessages=()=>({...en,...engineerMachineryMessages(),...engineerTrapsMessages(),...engineerBuilderMessages(),...soldierSkirmisherMessages(),...heavyFlakMessages()});
