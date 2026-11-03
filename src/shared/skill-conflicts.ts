import catalog from '../../content/catalog.json';
const anchor='engineer-machinery-anchor-1',survey='engineer-machinery-survey-1';
const traps='engineer-traps-1',machinery='engineer-machinery-1';
const wire='engineer-traps-wire-1',safety='engineer-traps-switch-1';
const builder='engineer-builder-1',longspan='engineer-builder-longspan-1',wings='engineer-builder-wings-1';
const replacesTurrets=(id:string)=>catalog.skills.some(s=>s.id===id&&(('transform'in s&&s.transform==='crossfire-pair')||('extraTurrets'in s.effects&&(s.effects.extraTurrets??0)>0)));
/** Same conflicts for inspection, authoritative spending and boundary restoration. */
export function conflictingSkill(owned:readonly string[],candidate:string):string|undefined {
  return owned.find(id=>id!==candidate&&(
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
