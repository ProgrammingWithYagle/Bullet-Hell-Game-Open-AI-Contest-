export const authoredDate = '2026-11-24';
const entry = 'alchemist-flash-reaction-1';
const wick = 'alchemist-short-wick-1';
const vent = 'alchemist-vent-cap-1';

const cards = [
  { id: entry, name: 'Flash Reaction', description: 'Aim at your own Binding pool. While Cast Flask is recovering, spend one extra chalk to throw your first prepared Flare early with Action 1. Advance one throw per Cast Flask and add a full recovery to its scheduled ready time.' },
  { id: wick, name: 'Short Wick', description: 'Your early Flare lands in 9 combat ticks. Aim at a Binding pool within 190 units to use it. Excludes Vent Cap.' },
  { id: vent, name: 'Vent Cap', description: 'Your early Flare spreads over the Binding and forgoes its usual combination damage. The Binding keeps its natural remaining time. At the pool limit the oldest other pool gives way. Excludes Short Wick.' },
];

export function applyAlchemistReactive(catalog) {
  for (const { id, name, description } of cards) {
    const first = id === entry;
    catalog.specializationSkills.push({
      id, name, description, classId: 'alchemist', branchId: 'alchemist-pathways', branchName: 'Specializations',
      subbranchId: entry, subbranchName: 'Reactive Mixtures', subbranchNameKey: `pathway.${entry}.name`,
      nameKey: `skill.${id}.name`, sourceSkillId: id, effects: {}, capstone: false,
      grade: first ? 'D-' : 'D', depth: first ? 1 : 2, cost: 2, freePlaySpRequired: first ? 3 : 5,
      prerequisite: first ? 'alchemist-mixtures-1' : entry, role: first ? 'active' : 'fitting',
    });
  }
}

export const copy = {
  [`pathway.${entry}.name`]: 'Reactive Mixtures',
  'ui.alchemyReaction.overview': 'Advance a real Flare throw to catch your own Binding during a brief opening.',
  'ui.alchemyReaction.busy': 'Flash Reaction unavailable',
  'ui.alchemyReaction.normal': 'Cast Flask is ready',
  'ui.alchemyReaction.spent': 'Advance already spent',
  'ui.alchemyReaction.prepare': 'Put a prepared Flare first',
  'ui.alchemyReaction.chalk': 'Find one chalk',
  'ui.alchemyReaction.aim': 'Aim at a clear Binding pool',
  'ui.alchemyReaction.help': 'Throw a Binding with Cast Flask. Prepare a Flare at the front of your queue. Aim at the Binding while Cast Flask recovers and press Action 1. Spend one extra chalk and use the next throw opening in advance.',
  'ui.alchemyReaction.wickHelp': 'The early Flare lands sooner. Walk closer to the Binding pool before aiming.',
  'ui.alchemyReaction.ventHelp': 'The early Flare leaves the Binding active. Choose this fitting to keep its remaining control instead of the combination burst.',
};

for (const { id, name, description } of cards) {
  copy[`skill.${id}.name`] = name;
  copy[`skill.${id}.description`] = description;
  copy[`pathway.${id}.summary`] = description;
}
