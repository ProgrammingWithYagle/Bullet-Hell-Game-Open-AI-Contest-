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
  return { command:false, qNameKey:null, qAt:player.qAt, qBlocked:false, extras };
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
