import catalog from '../../content/catalog.json';

export function encounterAssists(difficulty: string) {
  const policies = catalog.rules.encounterAssists;
  return policies[difficulty as keyof typeof policies] ?? policies.hard;
}
export const combatReviveFraction = (difficulty:string) =>
  encounterAssists(difficulty).revivedHealthFraction;
export const phaseShieldBreak = (difficulty:string, variant:string) =>
  variant !== 'brutal' && encounterAssists(difficulty).phaseShieldBreak;
export const encounterVariant = (difficulty:string,variant:string='normal'):'normal'|'brutal' =>
  difficulty==='hellish'||variant==='brutal'?'brutal':'normal';

const bosses = new Map(catalog.bosses.map(b=>[b.id,b]));
export function encounterPhases(id:string, variant:string) {
  const boss= bosses.get(id);
  if(!boss)throw Error('Unknown encounter '+id);
  return variant==='brutal'?boss.variants.brutal.phases:boss.phases;
}
/** Visible phase number is separate from the retained authored pattern identity. */
export function bossPatternPhase(id:string, variant:string, phase:number) {
  const phases=encounterPhases(id,variant);
  const p=phases[Math.max(0,Math.min(phases.length-1,Math.floor(phase)))];
  return p.patternPhase;
}
export function phaseMarkers(id:string,variant:string) {
  return encounterPhases(id,variant).slice(1).map(p=>p.healthThreshold*100);
}
