import {interceptorIds} from '../shared/tank-interceptor.ts';
import {bulwarkIds} from '../shared/tank-bulwark.ts';
import type {PlayerView} from '../shared/view.ts';
import {t} from './i18n.ts';

export function tankActions(p:PlayerView,now:number){
  const extras:{key:'technique1'|'technique2'|'technique3';id:string;at:number;blocked:boolean}[]=[];
  const owned=p.classId==='tank'&&!p.training&&p.skills.includes(bulwarkIds.entry);
  if(owned){
    extras.push({key:'technique1',id:bulwarkIds.entry,at:0,blocked:p.kit.bulwarkCarried?!p.kit.bulwarkCanSet:!p.kit.bulwarkCanLift});
    const handling=p.skills.includes(bulwarkIds.port)?bulwarkIds.port:p.skills.includes(bulwarkIds.pivot)?bulwarkIds.pivot:undefined;
    if(handling)extras.push({key:'technique2',id:handling,at:Math.max(p.kit.bulwarkRecoveryAt??0,p.kit.bulwarkCommitUntil??0),blocked:!p.kit.bulwarkCanHandle});
  }
  if(p.classId==='tank'&&!p.training&&p.skills.includes(interceptorIds.entry)){
    const phase=p.kit.interceptorPhase??'idle',active=phase==='screen',winding=phase==='winding';
    const id=p.skills.includes(interceptorIds.standfast)?interceptorIds.standfast:p.skills.includes(interceptorIds.crossing)?interceptorIds.crossing:interceptorIds.entry;
    extras.push({key:'technique3',id,at:active?0:winding?p.kit.interceptorReadyAt??0:p.eAt,blocked:active?false:winding?false:phase==='ready'?!p.kit.interceptorCanLaunch:!p.kit.interceptorCanArm});
  }
  return {command:false,qNameKey:null,qAt:p.qAt,qBlocked:!!p.kit.bulwarkCarried||p.kit.interceptorPhase==='screen',extras};
}

export function tankCommitBlocked(p:PlayerView,action:string){
  if(p.classId==='tank'&&p.kit.interceptorPhase==='screen'&&['q','e','ultimate','dodge','reload','fire','technique1','technique2'].includes(action))return true;
  return p.classId==='tank'&&!!p.kit.bulwarkCarried&&['q','e','ultimate','dodge','reload'].includes(action);
}

export function tankHudLabel(p:PlayerView,slot:'technique1'|'technique2'|'technique3',now:number){
  if(slot==='technique3'){
    const phase=p.kit.interceptorPhase??'idle';
    return t(phase==='screen'?'ui.tank.interceptBrake':phase==='winding'?'ui.tank.interceptWinding':phase==='ready'?(p.kit.interceptorMode==='standfast'?'ui.tank.interceptBrace':'ui.tank.interceptLaunch'):p.eAt<=now&&!p.kit.interceptorCanArm?'ui.tank.interceptBlocked':'ui.tank.interceptPrepare');
  }
  if(slot==='technique1')return t(p.kit.bulwarkCarried?'ui.tank.setShield':'ui.tank.liftShield');
  if(!p.kit.bulwarkCarried)return t('ui.tank.needsCarry');
  if(p.skills.includes(bulwarkIds.port)){
    const phase=p.kit.bulwarkPortPhase??'closed';
    return t(phase==='opening'?'ui.tank.openingPort':phase==='closing'?'ui.tank.closingPort':phase==='open'?'ui.tank.closePort':'ui.tank.openPort');
  }
  return t((p.kit.bulwarkCommitUntil??0)>now?'ui.tank.turningShield':'ui.tank.turnShield');
}
