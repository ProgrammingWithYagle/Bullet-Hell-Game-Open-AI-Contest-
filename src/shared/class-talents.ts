import catalog from '../../content/catalog.json';
export type TalentId =
  | 'split-pour'
  | 'settled-batch'
  | 'second-extraction'
  | 'crosswind'
  | 'linked-stakes'
  | 'long-survey'
  | 'running-pack'
  | 'closed-ranks'
  | 'patient-company'
  | 'return-step'
  | 'open-circle'
  | 'second-watch'
  | 'held-note'
  | 'travelling-chorus'
  | 'borrowed-cue'
  | 'breach-cadence'
  | 'supply-line'
  | 'marching-colors'
  | 'shoulder-mantlet'
  | 'furnace-vents'
  | 'split-suppression'
  | 'wake-guard'
  | 'procession'
  | 'cornerstone'
  | 'serum-relay'
  | 'second-breath'
  | 'field-triage'
  | 'ward-echo'
  | 'orbit-requiem'
  | 'twin-sigils'
  | 'return-current'
  | 'foundry-relay'
  | 'crossfire-pair'
  | 'aftercut'
  | 'unwritten-traps'
  | 'decoy-veil';
const byNode = new Map(
  catalog.skills.map((s) => [
    s.id,
    'transform' in s ? (s.transform as TalentId) : undefined,
  ]),
);
export function talentForSkill(id: string) {
  return byNode.get(id);
}
export function hasTalent(p: { skills: string[] }, id: TalentId) {
  return p.skills.some((node) => byNode.get(node) === id);
}
