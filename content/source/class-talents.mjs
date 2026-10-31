export const classTalents = {
  soldier: ['breach-cadence', 'supply-line', 'marching-colors'],
  heavy: ['shoulder-mantlet', 'furnace-vents', 'split-suppression'],
  tank: ['wake-guard', 'procession', 'cornerstone'],
  medic: ['serum-relay', 'second-breath', 'field-triage'],
  mage: ['ward-echo', 'orbit-requiem', 'twin-sigils'],
  engineer: ['return-current', 'foundry-relay', 'crossfire-pair'],
  assassin: ['aftercut', 'unwritten-traps', 'decoy-veil'],
};
export function addClassTalents(catalog) {
  for (const cl of catalog.classes)
    for (const [lane, talent] of classTalents[cl.id].entries()) {
      const node = catalog.skills.find(
        (s) =>
          s.classId === cl.id &&
          s.branchId === cl.branches[1].id &&
          s.lane === lane &&
          s.depth === 3,
      );
      if (!node)
        throw Error('Missing transformation node ' + cl.id + '/' + lane);
      node.transform = talent;
      node.descriptionKey = 'talent.' + talent + '.description';
    }
}
