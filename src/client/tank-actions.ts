import {bulwarkIds} from '../shared/tank-bulwark.ts';
import type {PlayerView} from '../shared/view.ts';
import {t} from './i18n.ts';

export function tankActions(p:PlayerView,now:number){
  const extras:{key:'technique1'|'technique2';id:string;at:number;blocked:boolean}[]=[];
  const owned=p.classId==='tank'&&!p.training&&p.skills.includes(bulwarkIds.entry);
  if(owned){
    extras.push({key:'technique1',id:bulwarkIds.entry,at:0,blocked:p.kit.bulwarkCarried?!p.kit.bulwarkCanSet:!p.kit.bulwarkCanLift});
    const handling=p.skills.includes(bulwarkIds.port)?bulwarkIds.port:p.skills.includes(bulwarkIds.pivot)?bulwarkIds.pivot:undefined;
    if(handling)extras.push({key:'technique2',id:handling,at:Math.max(p.kit.bulwarkRecoveryAt??0,p.kit.bulwarkCommitUntil??0),blocked:!p.kit.bulwarkCanHandle});
  }
  return {command:false,qNameKey:null,qAt:p.qAt,qBlocked:!!p.kit.bulwarkCarried,extras};
}

export function tankCommitBlocked(p:PlayerView,action:string){
  return p.classId==='tank'&&!!p.kit.bulwarkCarried&&['q','e','ultimate','dodge','reload'].includes(action);
}

export function tankHudLabel(p:PlayerView,slot:'technique1'|'technique2'|'technique3',now:number){
  if(slot==='technique1')return t(p.kit.bulwarkCarried?'ui.tank.setShield':'ui.tank.liftShield');
  if(!p.kit.bulwarkCarried)return t('ui.tank.needsCarry');
  if(p.skills.includes(bulwarkIds.port)){
    const phase=p.kit.bulwarkPortPhase??'closed';
    return t(phase==='opening'?'ui.tank.openingPort':phase==='closing'?'ui.tank.closingPort':phase==='open'?'ui.tank.closePort':'ui.tank.openPort');
  }
  return t((p.kit.bulwarkCommitUntil??0)>now?'ui.tank.turningShield':'ui.tank.turnShield');
}
