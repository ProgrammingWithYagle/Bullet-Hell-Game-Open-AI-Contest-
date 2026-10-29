import {bossDefeatRemaining} from '../../shared/boss-defeat-flow.ts';
import {HZ,type Phase} from '../../shared/protocol.ts';
export function bossDefeatStatus(phase:Phase,boss:{health:number;defeatedAt:number},tick:number){
  return {key:phase==='victory'||phase==='defeat'?'ui.preparingResults':phase==='secretOffer'?'ui.preparingChoice':'ui.preparingNextEncounter',seconds:Math.ceil(bossDefeatRemaining(boss,tick)/HZ)};
}
