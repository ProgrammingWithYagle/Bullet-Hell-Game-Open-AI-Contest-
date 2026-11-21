export const seamId='heavy-flak-seam-1';
export const seamDescription='While your paid flak shell is still live, press Action 1 again to cut its flight and clear a thin seam along the ground it actually crossed. The seam reaches 9 pixels to either side and uses only the unspent part of that shell’s original three-small-shot allowance. Action 2 keeps your acquired point-burst operation, so choose a narrow line behind the shell or a wider burst at it. Running Fuze spends from the same allowance; Hanging Fuze retains only the line laid before arrest. Real cover crossing that line permanently severs it for this shell, leaving Action 2 and the original fuse available. Cut before the original fuse ends. Busy hands reject without cutting. No extra round, body damage, shield, recovery reset or lingering trap.';
export function applyHeavySeam(c){
 c.specializationSkills=c.specializationSkills.filter(s=>s.id!==seamId);
 const parent=c.specializationSkills.find(s=>s.id==='heavy-flak-command-1');
 if(!parent)throw Error('Manual Fuze must exist before Seam Fuze.');
 c.specializationSkills.push({...parent,id:seamId,name:'Seam Fuze',nameKey:'skill.'+seamId+'.name',sourceSkillId:seamId,grade:'S-',depth:5,cost:4,freePlaySpRequired:19,prerequisite:parent.id,role:'active',description:seamDescription,effects:{},capstone:false});
 c.rules.heavySeam={width:9,maximumPoints:25};
}
