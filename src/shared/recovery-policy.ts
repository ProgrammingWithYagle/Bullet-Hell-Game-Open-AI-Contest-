import {combatReviveFraction} from './encounter-policy.ts';

/** Revival is decided by the rescuer's class, never by the recipient's class. */
export function combatReviveAllowed(difficulty:string,reviverClass:string) {
  if(difficulty==='hellish')return false;
  if(difficulty==='hard'||difficulty==='insane')return reviverClass==='medic';
  return combatReviveFraction(difficulty)>0;
}
export function revivedHealth(difficulty:string,maximumHealth:number,reviverClass:string) {
  if(!combatReviveAllowed(difficulty,reviverClass))return 0;
  if(reviverClass==='medic'){
    if(difficulty==='insane')return Math.min(1,maximumHealth);
    const fraction=difficulty==='hard'?.3:difficulty==='normal'?.45:difficulty==='easy'?.75:1;
    return maximumHealth*fraction;
  }
  return maximumHealth*combatReviveFraction(difficulty);
}
export function revivalShield(difficulty:string,maximumHealth:number,reviverClass:string) {
  return difficulty==='baby'&&reviverClass==='medic'?maximumHealth*.2:0;
}
export function passiveRegenerationMultiplier(difficulty:string) {
  return difficulty==='hellish'?0:difficulty==='insane'?.5:difficulty==='hard'?.75:1;
}
export function selfReviveAllowed(difficulty:string,classId:string,players:number) {
  return combatReviveAllowed(difficulty,classId)&&(players===1||classId==='medic');
}
export function selfReviveCharges(difficulty:string,classId:string,extra=0) {
  return combatReviveAllowed(difficulty,classId)?1+Math.max(0,Math.floor(extra)):0;
}
export function maximumPersonalShield(difficulty:string,maximumHealth:number) {
  const multiplier=difficulty==='hellish'?0:difficulty==='insane'?.5:difficulty==='hard'?.75:1;
  return Math.max(0,Math.floor(maximumHealth*multiplier));
}
export function startingShieldFraction(classId:string){
  return classId==='tank'?1:classId==='heavy'?.5:classId==='soldier'?.15:0;
}
