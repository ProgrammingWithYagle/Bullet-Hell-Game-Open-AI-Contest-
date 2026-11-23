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
  return { command:false, qNameKey:null, qAt:player.qAt, qBlocked:false, extras:[...extras,...replyAction] };
}

export function swordsmanHudLabel(player: PlayerView, now: number) {
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
