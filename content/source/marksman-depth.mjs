export function applyMarksmanDepth(c) {
  const entry = 'soldier-marksman-1';
  const nodes = [
    ['soldier-marksman-carom-1', 'Double Bank', 'D', 2, 5, 'variant', 'Carry Bank Shot through a second real masonry contact. Its original lifetime and travel budget stay finite; a third wall absorbs it. Choose this instead of Line Drive.'],
    ['soldier-marksman-line-1', 'Line Drive', 'D', 2, 5, 'variant', 'After its first real bank, the shot can pass through one ordinary hostile body. Bosses, weak points and further cover still stop it. Bodies before the bank still intercept. Choose this instead of Double Bank.'],
    ['soldier-marksman-pair-1', 'Measured Pair', 'B-', 3, 11, 'active', 'Action 2 spends one actual round on a bank shot and starts twelve seconds of recovery. Its first real cover contact earns 1.2 seconds to manually aim and spend one further round with action 2. At most two shots; the second cannot earn another. Both inherit your chosen bank variant.'],
  ];
  c.specializationSkills = c.specializationSkills.filter(s => !nodes.some(([id]) => id === s.id));
  for (const [id, name, grade, cost, freePlaySpRequired, role, description] of nodes)
    c.specializationSkills.push({id, classId:'soldier', branchId:'soldier-pathways', branchName:'Specializations', subbranchId:entry, subbranchName:'Marksman', subbranchNameKey:'pathway.'+entry+'.name', name, nameKey:'skill.'+id+'.name', sourceSkillId:id, depth:2, cost, grade, prerequisite:entry, capstone:false, effects:{}, description, freePlaySpRequired, role});
  Object.assign(c.rules.soldierMarksman, {caromBanks:2, linePierce:1, pairCooldown:12, pairWindow:1.2});
}
