import catalog from '../../content/catalog.json';
const anchor='engineer-machinery-anchor-1',survey='engineer-machinery-survey-1';
const traps='engineer-traps-1',machinery='engineer-machinery-1';
const wire='engineer-traps-wire-1',safety='engineer-traps-switch-1';
const builder='engineer-builder-1',longspan='engineer-builder-longspan-1',wings='engineer-builder-wings-1';
const replacesTurrets=(id:string)=>catalog.skills.some(s=>s.id===id&&(('transform'in s&&s.transform==='crossfire-pair')||('extraTurrets'in s.effects&&(s.effects.extraTurrets??0)>0)));
/** Same conflicts for inspection, authoritative spending and boundary restoration. */
export function conflictingSkill(owned:readonly string[],candidate:string):string|undefined {
  return owned.find(id=>id!==candidate&&(
    (['soldier-sniper-1','soldier-grenadier-1','soldier-marksman-1','soldier-skirmisher-1'].includes(candidate)&&['soldier-sniper-1','soldier-grenadier-1','soldier-marksman-1','soldier-skirmisher-1'].includes(id))||
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
