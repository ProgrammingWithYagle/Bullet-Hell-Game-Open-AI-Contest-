import { pursuitIds, pursuitRules } from '../shared/swordsman-pursuit.ts';
import { counterstrokeIds } from '../shared/swordsman-counterstroke.ts';
import { measuredIds } from '../shared/swordsman-measured.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function swordsmanActions(player: PlayerView, now: number) {
  const state = player.kit.measuredStance;
  const held = (state?.until ?? 0) > now;
  const movingEdge = state?.action === 'turn';
  const id = state?.following ? measuredIds.follow : movingEdge ? measuredIds.turn : measuredIds.entry;
  const owned = player.classId === 'swordsman' && !player.training && player.skills.includes(measuredIds.entry);
  const extras = owned ? [{
    key:'technique1' as const,
    id,
    at: held ? state?.readyAt ?? 0 : player.qAt,
    blocked: held ? !state?.action : !state?.canPlant,
  }] : [];
  const reply=player.kit.counterstroke;
  const ownedReply=player.classId==='swordsman'&&!player.training&&player.skills.includes(counterstrokeIds.entry);
  const answering=(reply?.responseUntil??0)>now;
  const guarding=(reply?.guardUntil??0)>now&&!answering;
  const ready=answering?reply?.canAnswer:!guarding&&reply?.canGuard;
  const replyAction=ownedReply?[{key:'technique2' as const,id:answering&&reply?.action!=='front'?reply?.fitting??counterstrokeIds.entry:counterstrokeIds.entry,
    at:answering?0:guarding?reply!.guardUntil:player.eAt,blocked:!ready}]:[];
  const pursuit = player.kit.pursuit;
  const ownsPursuit = player.classId === 'swordsman' && !player.training && player.skills.includes(pursuitIds.entry);
  const following = !!pursuit?.fitting && pursuit.followUntil > now;
  const pursuitAction = ownsPursuit ? [{
    key:'technique3' as const,
    id:following && pursuit.fitting ? pursuitIds[pursuit.fitting] : pursuitIds.entry,
    at:following ? 0 : pursuit?.recoveryAt ?? 0,
    blocked:!pursuit?.canStrike,
  }] : [];
  return { command:false, qNameKey:null, qAt:player.qAt, qBlocked:false, extras:[...extras,...replyAction,...pursuitAction] };
}

export function swordsmanHudLabel(player: PlayerView, now: number, key = 'technique1') {
  if (key === 'technique2') return swordsmanCounterstrokeLabel(player, now);
  if (key === 'technique3') return swordsmanPursuitLabel(player, now);
  const state = player.kit.measuredStance;
  if (state && state.until > now) {
    if (state.action === 'turn') return t('ui.sword.heldTurn');
    if (state.following) return t(state.action === 'follow' ? 'skill.'+measuredIds.follow+'.name' : 'ui.sword.heldFollow');
    if (state.readyAt > now) return t('ui.sword.heldWait');
    return t(state.action === 'first' ? 'ui.sword.heldRelease' : 'ui.sword.heldAim');
  }
  return t(state?.canPlant ? 'ui.sword.heldSet' : player.qAt > now ? 'ui.sword.heldRecover' : 'skill.'+measuredIds.entry+'.name');
}

export function swordsmanCounterstrokeLabel(player:PlayerView,now:number) {
  const state=player.kit.counterstroke;
  if(state&&state.responseUntil>now) {
    if(state.canAnswer) return t(state.fitting&&state.action!=='front'?'skill.'+state.fitting+'.name':'ui.sword.replyRelease');
    return t(state.fitting===counterstrokeIds.needle?'ui.sword.replyNeedleAim':state.fitting===counterstrokeIds.back?'ui.sword.replyBackAim':'ui.sword.replyForwardAim');
  }
  if(state&&state.guardUntil>now) return t('ui.sword.replyWait');
  return t(state?.canGuard?'ui.sword.replyRaise':player.eAt>now?'ui.sword.replyRecover':'skill.'+counterstrokeIds.entry+'.name');
}

export function swordsmanPursuitLabel(player: PlayerView, now: number) {
  const state = player.kit.pursuit;
  const follow = state?.followUntil && state.followUntil > now ? state.fitting : undefined;
  if (state?.canStrike) return t(follow ? 'skill.' + pursuitIds[follow] + '.name' : 'ui.sword.pursuitRelease');
  if (!follow && (state?.recoveryAt ?? 0) > now) return t('ui.sword.pursuitRecover');
  if (!player.ammo) return t('ui.sword.pursuitLoad');
  const distance = follow ? state?.followStride ?? 0 : state?.stride ?? 0;
  const goal = follow ? pursuitRules.followStride : pursuitRules.stride;
  if (distance >= goal) {
    if (state?.heading === undefined) return t('ui.sword.pursuitAlign');
    const difference = player.aim - state.heading;
    const angle = Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference)));
    return t(angle <= pursuitRules.aimAngle ? 'ui.swordRecovery' : 'ui.sword.pursuitAlign');
  }
  const key = follow === 'through' ? 'ui.sword.pursuitThrough' : follow === 'cross' ? 'ui.sword.pursuitCross' : 'ui.sword.pursuitStride';
  return t(key, { distance:Math.floor(distance), goal });
}
