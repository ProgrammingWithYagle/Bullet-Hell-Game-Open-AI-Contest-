import type { Shot } from '../shared/protocol.ts';
/** An arrested physical shot has zero velocity; retain its actual captured launch bearing. */
export function flakFlightBearing(shot:Pick<Shot,'vx'|'vy'>,launchAim:number|undefined){
 return Math.hypot(shot.vx,shot.vy)>1e-9?Math.atan2(shot.vy,shot.vx):Number.isFinite(launchAim)?launchAim!:0;
}
