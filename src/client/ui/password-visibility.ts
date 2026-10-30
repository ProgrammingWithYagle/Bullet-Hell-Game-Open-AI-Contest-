import {escape as e} from './html.ts';
import {icon} from './icons.ts';
type Translate = (key: string) => string;
export function passwordToggleMarkup(id: string, t: Translate) {
  return `<button type="button" class="password-visibility" data-password-toggle aria-controls="${e(id)}" aria-label="${e(t('ui.showPassword'))}" aria-pressed="false">${icon('eye')}</button>`;
}
export function bindPasswordVisibility(host: HTMLElement, t: Translate) {
  host.querySelectorAll<HTMLButtonElement>('[data-password-toggle]').forEach(button => {
    button.onclick = () => {
      const id = button.getAttribute('aria-controls');
      const input = button.parentElement?.querySelector<HTMLInputElement>('input');
      if (!input || input.id !== id) return;
      const shown = input.type === 'password';
      const start = input.selectionStart, end = input.selectionEnd;
      input.type = shown ? 'text' : 'password';
      if (start !== null && end !== null) input.setSelectionRange(start, end);
      button.setAttribute('aria-pressed', String(shown));
      button.setAttribute('aria-label', t(shown ? 'ui.hidePassword' : 'ui.showPassword'));
      button.innerHTML = icon(shown ? 'eye-off' : 'eye');
    };
  });
}
/** Caller provides only the password retained by the current host's Session. */
export function hostPasswordMarkup(password: string | undefined, id: string, t: Translate) {
  return password === undefined ? '' : `<label class="host-room-password">${e(t('ui.roomPassword'))}<span class="password-field"><input id="${e(id)}" type="password" readonly autocomplete="off" spellcheck="false" value="${e(password)}">${passwordToggleMarkup(id,t)}</span></label>`;
}
