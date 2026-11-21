export const handlingIds=['heavy-flak-running-1','heavy-flak-hanging-1'];
export function applyHeavyFlakHandling(c){
 c.specializationSkills=c.specializationSkills.filter(s=>!handlingIds.includes(s.id));
 const parent=c.specializationSkills.find(s=>s.id==='heavy-flak-command-1');
 if(!parent)throw Error('Manual Fuze must exist before its optional handling choices.');
 const node=(id,name,description)=>({...parent,id,name,nameKey:'skill.'+id+'.name',sourceSkillId:id,grade:'B+',depth:4,cost:3,freePlaySpRequired:13,prerequisite:parent.id,role:'evolution',description,effects:{},capstone:false});
 c.specializationSkills.push(
  node(handlingIds[0],'Running Fuze','Change your first Action 2 command into one early interception pulse while the same paid shell keeps flying. That pulse may clear at most one actual small hostile shot. The original fuse or first body/cover contact later makes the final pulse, using only the unspent part of the original combined three-shot allowance. An empty early pulse uses no interception allowance, but the command is still spent. You cannot command that shell again. No new round, extra carrier, extended fuse or recovery reset. Choose this handling instead of Hanging Fuze; omitting both keeps the original immediate three-shot Manual Fuze.'),
  node(handlingIds[1],'Hanging Fuze','Your first Action 2 command arrests the actual shell at its current air position and firing bearing. It does not burst on that command or extend its original fuse. A separate later Action 2 can burst the same shell there; its original fuse or an actual enemy body contact can still end it. The one burst retains the original three-small-shot allowance and real cover. Busy rejection keeps the arrested shell and original deadline. No teleport, attachment, extra round, persistent mine, refund or recovery reset. Choose this handling instead of Running Fuze; omitting both keeps the original immediate Manual Fuze.')
 );
}
