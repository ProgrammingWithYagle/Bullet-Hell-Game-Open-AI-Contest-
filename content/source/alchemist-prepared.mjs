export const authoredDate = '2026-11-24';
const entry = 'alchemist-stow-flask-1';
const brew = 'alchemist-brew-latch-1';
const toss = 'alchemist-throw-latch-1';

const cards = [
  { id:entry, name:'Stow Flask', description:'Use Action 2 to seal your first prepared vial for up to seven seconds. It still takes one slot. After 1.2 seconds, press Action 2 again to return it to the front. An expired vial is lost.' },
  { id:brew, name:'Brew Latch', description:'Finish brewing a different recipe to return the sealed vial to the front. This latch opens only after the brew is completed. Excludes Throw Latch.' },
  { id:toss, name:'Throw Latch', description:'Use Cast Flask to launch a different recipe and return the sealed vial to the front. Flash Reaction leaves the sleeve closed. Excludes Brew Latch.' },
];

export function applyAlchemistPrepared(catalog) {
  for (const {id,name,description} of cards) {
    const first = id === entry;
    catalog.specializationSkills.push({ id,name,description,classId:'alchemist',branchId:'alchemist-pathways',branchName:'Specializations',
      subbranchId:entry,subbranchName:'Prepared Compounds',subbranchNameKey:`pathway.${entry}.name`,nameKey:`skill.${id}.name`,
      sourceSkillId:id,effects:{},capstone:false,grade:first ? 'D-' : 'D',depth:first ? 1 : 2,cost:2,freePlaySpRequired:first ? 3 : 5,
      prerequisite:first ? 'alchemist-reagents-1' : entry,role:first ? 'active' : 'fitting' });
  }
}

export const copy = {
  [`pathway.${entry}.name`]:'Prepared Compounds',
  'ui.alchemyReserve.overview':'Seal one prepared flask now and keep it for a different part of the fight.',
  'ui.alchemyReserve.empty':'Prepare a flask first',
  'ui.alchemyReserve.stow':'Stow Flask',
  'ui.alchemyReserve.busy':'Hands occupied',
  'ui.alchemyReserve.latched':'Sleeve settling',
  'ui.alchemyReserve.return':'Return flask to the front',
  'ui.alchemyReserve.brew':'Finish a different brew',
  'ui.alchemyReserve.toss':'Throw a different flask',
  'ui.alchemyReserve.held':'Stowed {recipe} · {seconds}s',
  'ui.alchemyReserve.help':'Stow the first prepared flask with Action 2. A stowed flask takes up one slot and is lost when its timer runs out.',
  'ui.alchemyReserve.manualHelp':'After the sleeve settles, use Action 2 to put the flask back at the front.',
  'ui.alchemyReserve.brewHelp':'Brew Latch returns the stowed flask after you finish brewing a different recipe. A cancelled brew leaves the latch closed.',
  'ui.alchemyReserve.tossHelp':'Throw Latch returns the stowed flask after Cast Flask launches a different recipe. Plan an open throw before the reserve expires.',
};

for (const {id,name,description} of cards) {
  copy[`skill.${id}.name`] = name;
  copy[`skill.${id}.description`] = description;
  copy[`pathway.${id}.summary`] = description;
}
