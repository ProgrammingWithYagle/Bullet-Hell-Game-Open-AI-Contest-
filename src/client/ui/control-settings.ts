import {
  actions,
  buttonActions,
  defaultControls,
  rebind,
  validControls,
  type Action,
  type ControlOptions,
} from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { profileText } from '../profile-text.ts';
import { escape as e } from './html.ts';
const p = (key: Parameters<typeof profileText>[1]) => profileText(locale, key);
export function bindingLabel(code: string) {
  return (
    (
      {
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
        Mouse0: '🖱1',
        Mouse1: '🖱2',
        Mouse2: '🖱3',
      } as Record<string, string>
    )[code] ?? code.replace(/^Key|^Digit/, '')
  );
}
export function actionLabel(action: Action) {
  if (['up', 'down', 'left', 'right', 'fire'].includes(action))
    return profileText(locale, action as 'up' | 'down' | 'left' | 'right' | 'fire');
  if (action.startsWith('supply')) return t('ui.supplies') + ' ' + action.slice(-1);
  return t(
    (
      {
        dodge: 'ui.dodge',
        reload: 'ui.reload',
        q: 'ui.abilityQ',
        e: 'ui.abilityE',
        ultimate: 'ui.ultimate',
        interact: 'ui.interact',
      } as Record<string, string>
    )[action],
  );
}
export function controlsMarkup(options: ControlOptions) {
  return `<section class="control-settings" data-controls><div class="section-heading"><h3>${e(t('ui.controls'))}</h3><button type="button" data-reset-controls>${e(t('ui.reset'))}</button></div><div class="hold-options">${(['fireMode', 'interactMode'] as const).map((key) => `<label>${e(key === 'fireMode' ? p('fire') : t('ui.interact'))}<select data-control-mode="${key}">${['hold', 'toggle'].map((value) => `<option value="${value}" ${options[key] === value ? 'selected' : ''}>${e(p(value as 'hold'))}</option>`).join('')}</select></label>`).join('')}</div><div class="binding-head" aria-hidden="true"><span></span><span>${e(p('keyboard'))}</span><span>${e(p('pad'))}</span></div>${actions.map((action) => `<div class="binding-row"><span>${e(actionLabel(action))}</span><div class="key-bindings">${[0, 1].map((slot) => `<button type="button" data-bind="${action}" data-slot="${slot}" aria-label="${e(actionLabel(action) + ' · ' + p('keyboard') + ' ' + (slot + 1))}"><kbd dir="ltr">${e(options.bindings[action][slot] ? bindingLabel(options.bindings[action][slot]) : '—')}</kbd></button>`).join('')}${options.bindings[action][1] ? `<button type="button" class="clear-binding" data-clear-bind="${action}" aria-label="${e(p('clearAlternate'))}">×</button>` : ''}</div>${buttonActions.includes(action as (typeof buttonActions)[number]) ? `<select data-pad-bind="${action}" aria-label="${e(actionLabel(action) + ' · ' + p('pad'))}" dir="ltr">${Array.from({ length: 17 }, (_, n) => `<option value="${n}" ${options.gamepad[action as (typeof buttonActions)[number]] === n ? 'selected' : ''}>${n}</option>`).join('')}</select>` : '<span dir="ltr">LS</span>'}</div>`).join('')}<p data-controls-status role="status" aria-live="polite"></p></section>`;
}
export function bindControlSettings(
  root: HTMLElement,
  get: () => ControlOptions,
  set: (options: ControlOptions) => void,
) {
  let capture: AbortController | undefined;
  const status = (message: string) => {
    const el = root.querySelector<HTMLElement>('[data-controls-status]');
    if (el) el.textContent = message;
  };
  const replace = (options: ControlOptions) => {
    capture?.abort();
    try {
      set(options);
      root.outerHTML = controlsMarkup(get());
    } catch {
      status(t('ui.errorSave'));
      return;
    }
    // The settings root is replaced only after a successful validated save.
    const next = document.querySelector<HTMLElement>('[data-controls]');
    if (next) bindControlSettings(next, get, set);
  };
  root.querySelector<HTMLButtonElement>('[data-reset-controls]')!.onclick = () =>
    replace(defaultControls());
  root.querySelectorAll<HTMLSelectElement>('[data-control-mode]').forEach((select) => {
    select.onchange = () => {
      const next = structuredClone(get());
      next[select.dataset.controlMode as 'fireMode' | 'interactMode'] = select.value as 'hold';
      if (validControls(next)) replace(next);
    };
  });
  root.querySelectorAll<HTMLButtonElement>('[data-clear-bind]').forEach((button) => {
    button.onclick = () => {
      const next = structuredClone(get());
      next.bindings[button.dataset.clearBind as Action].splice(1, 1);
      replace(next);
    };
  });
  root.querySelectorAll<HTMLSelectElement>('[data-pad-bind]').forEach((select) => {
    select.onchange = () => {
      const next = structuredClone(get());
      next.gamepad[select.dataset.padBind as (typeof buttonActions)[number]] = Number(select.value);
      if (validControls(next)) replace(next);
      else {
        select.value = String(
          get().gamepad[select.dataset.padBind as (typeof buttonActions)[number]],
        );
        status(p('conflict'));
      }
    };
  });
  root.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach((button) => {
    button.onclick = () => {
      capture?.abort();
      capture = new AbortController();
      const signal = capture.signal;
      status(p('press'));
      const finish = (code?: string) => {
        capture?.abort();
        if (!button.isConnected) return;
        if (!code) {
          status('');
          return;
        }
        const next = rebind(
          get(),
          button.dataset.bind as Action,
          Number(button.dataset.slot),
          code,
        );
        if (next) replace(next);
        else status(p('conflict'));
      };
      window.addEventListener(
        'keydown',
        (event) => {
          if (!button.isConnected) {
            capture?.abort();
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          finish(event.code === 'Escape' ? undefined : event.code);
        },
        { capture: true, signal },
      );
      window.addEventListener(
        'pointerdown',
        (event) => {
          if (!button.isConnected) {
            capture?.abort();
            return;
          }
          if (event.pointerType === 'touch') {
            finish();
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          finish('Mouse' + event.button);
        },
        { capture: true, signal },
      );
      const timeout = setTimeout(() => finish(), 10000);
      signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
    };
  });
}
