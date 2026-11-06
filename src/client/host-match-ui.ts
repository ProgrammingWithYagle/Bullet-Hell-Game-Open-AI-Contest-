import type {Session} from './session.ts';
import {escape as e} from './ui/html.ts';
type Translate = (key: string) => string;
/** Only explicit buttons send match commands; ordinary menus have no such side effect. */
export class HostMatchUI {
  readonly pauseButton = document.createElement('button');
  private panel = document.createElement('section');
  private banner = document.createElement('p');
  private confirmation?: HTMLDialogElement;
  constructor(private session: Session, private host: HTMLElement, menuButton: HTMLElement, menu: HTMLElement, private t: Translate) {
    this.pauseButton.id = 'host-pause-match'; this.pauseButton.type = 'button'; this.pauseButton.hidden = true;
    this.pauseButton.onclick = () => session.setMatchPaused(!session.view?.matchPaused);
    menuButton.before(this.pauseButton);
    this.panel.className = 'host-match-controls'; this.panel.hidden = true;
    this.panel.innerHTML = `<h3>${e(t('ui.hostControls'))}</h3><div class="actions"><button type="button" data-host-pause></button><button type="button" data-host-end>${e(t('ui.endMatch'))}</button></div><p>${e(t('ui.leaveKeepsPlaying'))}</p>`;
    this.panel.querySelector<HTMLButtonElement>('[data-host-pause]')!.onclick = () => session.setMatchPaused(!session.view?.matchPaused);
    this.panel.querySelector<HTMLButtonElement>('[data-host-end]')!.onclick = () => this.confirmEnd();
    menu.append(this.panel);
    this.banner.className = 'match-pause-banner'; this.banner.hidden = true;
    this.banner.setAttribute('role','status'); this.banner.textContent = t('ui.matchPaused'); host.append(this.banner);
  }
  update() {
    const view = this.session.view, isHost = this.session.isHost;
    const terminal = !view || ['victory','defeat'].includes(view.phase);
    const canPause = isHost && !terminal && view.phase !== 'lobby';
    const matchPaused = view?.matchPaused === true;
    const label = this.t(matchPaused ? 'ui.continueMatch' : 'ui.pauseMatch');
    this.pauseButton.hidden = !canPause;
    this.pauseButton.innerHTML = (matchPaused ? '▶' : 'Ⅱ') + ` <span>${e(label)}</span>`;
    this.pauseButton.setAttribute('aria-label', label); this.pauseButton.setAttribute('aria-pressed', String(matchPaused));
    this.panel.hidden = !isHost || terminal;
    const pause = this.panel.querySelector<HTMLButtonElement>('[data-host-pause]')!;
    pause.hidden = !canPause; pause.textContent = label;
    this.banner.hidden = !matchPaused || terminal;
    if ((!isHost || terminal) && this.confirmation) this.confirmation.close();
  }
  private confirmEnd() {
    if (!this.session.isHost || this.confirmation || !this.session.view || ['victory','defeat'].includes(this.session.view.phase)) return;
    const dialog = document.createElement('dialog'); this.confirmation = dialog;
    dialog.className = 'room-password-dialog end-match-dialog'; dialog.setAttribute('aria-labelledby','end-match-heading');
    dialog.innerHTML = `<h2 id="end-match-heading">${e(this.t('ui.endMatch'))}</h2><p>${e(this.t('ui.endMatchConfirm'))}</p><div class="actions"><button type="button" data-end-cancel>${e(this.t('ui.cancel'))}</button><button type="button" data-end-confirm>${e(this.t('ui.endMatch'))}</button></div>`;
    dialog.addEventListener('close', () => {dialog.remove(); if (this.confirmation === dialog) this.confirmation = undefined;}, {once:true});
    dialog.querySelector<HTMLButtonElement>('[data-end-cancel]')!.onclick = () => dialog.close();
    dialog.querySelector<HTMLButtonElement>('[data-end-confirm]')!.onclick = () => {this.session.endMatch(); dialog.close();};
    this.host.append(dialog); dialog.showModal(); dialog.querySelector<HTMLButtonElement>('[data-end-cancel]')!.focus();
  }
  destroy() {this.confirmation?.close(); this.panel.remove(); this.pauseButton.remove(); this.banner.remove();}
}
