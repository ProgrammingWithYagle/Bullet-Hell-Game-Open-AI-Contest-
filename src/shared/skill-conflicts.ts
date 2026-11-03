import catalog from '../../content/catalog.json';
const traps='engineer-traps-1',machinery='engineer-machinery-1';
const replacesTurrets=(id:string)=>catalog.skills.some(s=>s.id===id&&(('transform'in s&&s.transform==='crossfire-pair')||('extraTurrets'in s.effects&&(s.effects.extraTurrets??0)>0)));
/** Same conflicts for inspection, authoritative spending and boundary restoration. */
export function conflictingSkill(owned:readonly string[],candidate:string):string|undefined {
  return owned.find(id=>id!==candidate&&(
    (candidate===traps&&(id===machinery||replacesTurrets(id)))||
    (candidate===machinery&&id===traps)||
    (id===traps&&replacesTurrets(candidate))
  ));
}
