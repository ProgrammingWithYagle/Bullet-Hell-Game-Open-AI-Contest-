import { formationIds } from './summoner-formation.ts';
import { bondIds } from './summoner-bond.ts';
import { cohortIds } from './summoner-cohort.ts';
import { pursuitIds } from './swordsman-pursuit.ts';
import { counterstrokeIds } from './swordsman-counterstroke.ts';
import { measuredIds } from './swordsman-measured.ts';
import { misdirectionIds } from './bard-misdirection.ts';
import { lamentIds } from './bard-lament.ts';
import { conductorIds } from './bard-kit.ts';
import { markHunterIds } from './assassin-crossing-writ.ts';
import { infiltratorIds } from './assassin-slip-route.ts';
import { duelistIds } from './assassin-called-opening.ts';
import { mageVolatileIds } from './mage-fuse-seal.ts';
import { mageSpatialIds } from './mage-waymark-return.ts';
import { mageBindingIds } from './mage-pivot-sigil.ts';
import { preventiveCareIds } from './medic-preventive-care.ts';
import { rapidResponseIds } from './medic-rapid-response.ts';
import { fieldSurgeryIds } from './medic-field-surgery.ts';
import { bastionIds } from './tank-bastion.ts';
import catalog from '../../content/catalog.json';
const anchor='engineer-machinery-anchor-1',survey='engineer-machinery-survey-1';
const traps='engineer-traps-1',machinery='engineer-machinery-1';
const wire='engineer-traps-wire-1',safety='engineer-traps-switch-1';
const builder='engineer-builder-1',longspan='engineer-builder-longspan-1',wings='engineer-builder-wings-1';
const replacesTurrets=(id:string)=>catalog.skills.some(s=>s.id===id&&(('transform'in s&&s.transform==='crossfire-pair')||('extraTurrets'in s.effects&&(s.effects.extraTurrets??0)>0)));
/** Same conflicts for inspection, authoritative spending and boundary restoration. */
export function conflictingSkill(owned:readonly string[],candidate:string):string|undefined {
  const otherFormation = candidate === formationIds.walking ? formationIds.turn :
    candidate === formationIds.turn ? formationIds.walking : undefined;
  if (otherFormation && owned.includes(otherFormation)) return otherFormation;
  const otherBond = candidate === bondIds.close ? bondIds.homeward :
    candidate === bondIds.homeward ? bondIds.close : undefined;
  if (otherBond && owned.includes(otherBond)) return otherBond;
  const otherCohort = candidate === cohortIds.cross ? cohortIds.relay :
    candidate === cohortIds.relay ? cohortIds.cross : undefined;
  if (otherCohort && owned.includes(otherCohort)) return otherCohort;
  const otherPursuit = candidate === pursuitIds.through ? pursuitIds.cross :
    candidate === pursuitIds.cross ? pursuitIds.through : undefined;
  if (otherPursuit && owned.includes(otherPursuit)) return otherPursuit;
  const otherReply = candidate === counterstrokeIds.needle ? counterstrokeIds.back :
    candidate === counterstrokeIds.back ? counterstrokeIds.needle : undefined;
  if (otherReply && owned.includes(otherReply)) return otherReply;
  const otherMeasured = candidate === measuredIds.turn ? measuredIds.follow :
    candidate === measuredIds.follow ? measuredIds.turn : undefined;
  if (otherMeasured && owned.includes(otherMeasured)) return otherMeasured;
  const otherEntrance = candidate === misdirectionIds.wrong ? misdirectionIds.second :
    candidate === misdirectionIds.second ? misdirectionIds.wrong : undefined;
  if (otherEntrance && owned.includes(otherEntrance)) return otherEntrance;
  const otherLament = candidate === lamentIds.cross ? lamentIds.closing :
    candidate === lamentIds.closing ? lamentIds.cross : undefined;
  if (otherLament && owned.includes(otherLament)) return otherLament;
  const otherConductor = candidate === conductorIds.side ? conductorIds.reprise :
    candidate === conductorIds.reprise ? conductorIds.side : undefined;
  if (otherConductor && owned.includes(otherConductor)) return otherConductor;
  const otherHunter = candidate === markHunterIds.canted ? markHunterIds.transfer :
    candidate === markHunterIds.transfer ? markHunterIds.canted : undefined;
  if (otherHunter && owned.includes(otherHunter)) return otherHunter;
  const otherInfiltrator = candidate === infiltratorIds.relay ? infiltratorIds.threshold :
    candidate === infiltratorIds.threshold ? infiltratorIds.relay : undefined;
  if (otherInfiltrator && owned.includes(otherInfiltrator)) return otherInfiltrator;
  const otherDuel = candidate === duelistIds.passing ? duelistIds.counter :
    candidate === duelistIds.counter ? duelistIds.passing : undefined;
  if (otherDuel && owned.includes(otherDuel)) return otherDuel;
  const otherFuse = candidate === mageVolatileIds.shunt ? mageVolatileIds.twin :
    candidate === mageVolatileIds.twin ? mageVolatileIds.shunt : undefined;
  if (otherFuse && owned.includes(otherFuse)) return otherFuse;
  const otherSpatial = candidate === mageSpatialIds.hold ? mageSpatialIds.side :
    candidate === mageSpatialIds.side ? mageSpatialIds.hold : undefined;
  if (otherSpatial && owned.includes(otherSpatial)) return otherSpatial;
  const otherPivot = candidate === mageBindingIds.fixed ? mageBindingIds.reverse :
    candidate === mageBindingIds.reverse ? mageBindingIds.fixed : undefined;
  if (otherPivot && owned.includes(otherPivot)) return otherPivot;
  const otherPrecaution = candidate === preventiveCareIds.doorstep ? preventiveCareIds.layered :
    candidate === preventiveCareIds.layered ? preventiveCareIds.doorstep : undefined;
  if (otherPrecaution && owned.includes(otherPrecaution)) return otherPrecaution;
  const otherResponse = candidate === rapidResponseIds.switchback ? rapidResponseIds.handoff :
    candidate === rapidResponseIds.handoff ? rapidResponseIds.switchback : undefined;
  if (otherResponse && owned.includes(otherResponse)) return otherResponse;
  const otherSurgery = candidate === fieldSurgeryIds.step ? fieldSurgeryIds.aside :
    candidate === fieldSurgeryIds.aside ? fieldSurgeryIds.step : undefined;
  if (otherSurgery && owned.includes(otherSurgery)) return otherSurgery;
  const otherBastion = candidate === bastionIds.split ? bastionIds.corner :
    candidate === bastionIds.corner ? bastionIds.split : undefined;
  if (otherBastion && owned.includes(otherBastion)) return otherBastion;
  return owned.find(id=>id!==candidate&&((["tank-interceptor-crossing-1","tank-interceptor-standfast-1"].includes(candidate)&&["tank-interceptor-crossing-1","tank-interceptor-standfast-1"].includes(id))||(['tank-bulwark-pivot-1','tank-bulwark-port-1'].includes(candidate)&&['tank-bulwark-pivot-1','tank-bulwark-port-1'].includes(id))||
    ((candidate==='heavy-linework-guide-1'&&id==='heavy-linework-reserve-1')||(candidate==='heavy-linework-reserve-1'&&id==='heavy-linework-guide-1'))||
    ((candidate==='heavy-linework-yoke-1'&&id==='heavy-linework-sheave-1')||(candidate==='heavy-linework-sheave-1'&&id==='heavy-linework-yoke-1'))||
    ((candidate==='heavy-traverse-keyed-1'&&id==='heavy-traverse-open-1')||(candidate==='heavy-traverse-open-1'&&id==='heavy-traverse-keyed-1'))||
    ((['heavy-flak-1','heavy-traverse-1','heavy-linework-1'].includes(candidate)&&['heavy-flak-1','heavy-traverse-1','heavy-linework-1'].includes(id)))||
    ((candidate==='heavy-traverse-spade-1'&&id==='heavy-traverse-floating-1')||(candidate==='heavy-traverse-floating-1'&&id==='heavy-traverse-spade-1'))||
    (['soldier-sniper-1','soldier-grenadier-1','soldier-marksman-1','soldier-skirmisher-1'].includes(candidate)&&['soldier-sniper-1','soldier-grenadier-1','soldier-marksman-1','soldier-skirmisher-1'].includes(id))||
    ((candidate==='heavy-flak-running-1'&&id==='heavy-flak-hanging-1')||(candidate==='heavy-flak-hanging-1'&&id==='heavy-flak-running-1'))||
    ((candidate==='heavy-flak-compact-1'&&id==='heavy-flak-frontal-1')||(candidate==='heavy-flak-frontal-1'&&id==='heavy-flak-compact-1'))||
    ((candidate==='soldier-sniper-carry-1'&&id==='soldier-sniper-clear-1')||(candidate==='soldier-sniper-clear-1'&&id==='soldier-sniper-carry-1'))||
    ((candidate==='soldier-grenadier-skim-1'&&id==='soldier-grenadier-contact-1')||(candidate==='soldier-grenadier-contact-1'&&id==='soldier-grenadier-skim-1'))||
    ((candidate==='soldier-grenadier-pin-1'&&id==='soldier-grenadier-sling-1')||(candidate==='soldier-grenadier-sling-1'&&id==='soldier-grenadier-pin-1'))||
    ((candidate==='soldier-marksman-carom-1'&&id==='soldier-marksman-line-1')||(candidate==='soldier-marksman-line-1'&&id==='soldier-marksman-carom-1'))||
    ((candidate==='soldier-marksman-1'&&id==='soldier-skirmisher-1')||(candidate==='soldier-skirmisher-1'&&id==='soldier-marksman-1'))||
    ((candidate==='soldier-skirmisher-advance-1'&&id==='soldier-skirmisher-rear-1')||(candidate==='soldier-skirmisher-rear-1'&&id==='soldier-skirmisher-advance-1'))||
    ((candidate===anchor&&id===survey)||(candidate===survey&&id===anchor))||
    ((candidate===wire&&id===safety)||(candidate===safety&&id===wire))||
    ((candidate===longspan&&id===wings)||(candidate===wings&&id===longspan))||
    (candidate===builder&&([machinery,traps].includes(id)||replacesTurrets(id)))||
    (id===builder&&([machinery,traps].includes(candidate)||replacesTurrets(candidate)))||
    (candidate===traps&&(id===machinery||replacesTurrets(id)))||
    (candidate===machinery&&id===traps)||
    (id===traps&&replacesTurrets(candidate))
  ));
}
