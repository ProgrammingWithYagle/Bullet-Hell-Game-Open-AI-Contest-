import type { View } from '../../shared/view.ts';
import { escape as e } from './html.ts';
import {characterHeadshot} from './character-headshot.ts';
type Translate = (key: string, args?: Record<string, string | number>) => string;

export function mapChoiceLabel(view: View, t: Translate) {
  const choice = view.run.arenaSelection;
  return t(choice === 'randomRun' ? 'ui.randomMapRun' : choice === 'randomEncounter' ? 'ui.randomMapEncounter'
    : 'arena.' + (view.run.selectedArenaId ?? view.arenaId) + '.name');
}
export function roomCodeMarkup(code: string, t: Translate) {
  if (!code) return '';
  return `<div class="room-code-card"><span>${e(t('ui.roomCode'))}</span><strong data-room-code-value tabindex="0"><bdi>${e(code)}</bdi></strong><button type="button" data-room-code-copy>${e(t('ui.copyCode'))}</button><small data-room-code-status role="status" aria-live="polite"></small></div>`;
}
export function bindRoomCode(host: HTMLElement, code: string, t: Translate) {
  const button = host.querySelector<HTMLButtonElement>('[data-room-code-copy]');
  if (!button) return;
  button.onclick = async () => {
    const status = host.querySelector<HTMLElement>('[data-room-code-status]');
    try {
      await navigator.clipboard.writeText(code);
      if (status?.isConnected) status.textContent = t('ui.codeCopied');
    } catch {
      const value = host.querySelector<HTMLElement>('[data-room-code-value]');
      if (value?.isConnected) {
        value.focus({ preventScroll: true });
        const range = document.createRange(); range.selectNodeContents(value);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      }
      if (status?.isConnected) status.textContent = t('ui.copyCodeFallback');
    }
  };
}
export function waitingRoomMarkup(view: View, me: string, code: string, t: Translate, number: (value: number) => string,portraits?:Record<string,string>,hasPassword=false) {
  const host = view.owner === me;
  const maximum = view.run.maximumPlayers ?? (view.run.mode === 'endless' ? 50 : view.run.mode === 'raid' ? 16 : 8);
  return `<div class="waiting-room"><p class="waiting-room-help">${e(t(host ? 'ui.lobbyHostHint' : 'ui.lobbyGuestHint'))}</p>${roomCodeMarkup(code,t)}${hasPassword?`<p class="room-password-status">${e(t('ui.roomPasswordProtected'))}</p>`:''}<dl class="room-run-settings"><div><dt>${e(t('ui.chooseMode'))}</dt><dd>${e(t('mode.'+view.run.mode+'.name'))}</dd></div><div><dt>${e(t('ui.map'))}</dt><dd>${e(mapChoiceLabel(view,t))}</dd></div><div><dt>${e(t('ui.chooseDifficulty'))}</dt><dd>${e(t('difficulty.'+view.run.difficulty))}</dd></div></dl><h3>${e(t('ui.lobbyPlayers',{count:number(view.players.filter(p=>p.connected).length),maximum:number(maximum)}))}</h3><ul class="room-player-list">${view.players.map(p=>`<li>${portraits?`<span class="room-player-portrait">${characterHeadshot(p.classId,portraits[p.classId])}</span>`:''}<div><bdi>${e(p.name)}</bdi>${p.id===view.owner?`<span class="room-host">${e(t('ui.lobbyHost'))}</span>`:''}<small>${e(t('class.'+p.classId+'.name'))}</small></div><span class="room-connection ${p.connected?'connected':'disconnected'}">${e(t(p.connected?'ui.lobbyConnected':'ui.lobbyDisconnected'))}</span></li>`).join('')}</ul></div>`;
}
