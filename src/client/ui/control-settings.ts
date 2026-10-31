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
        Mouse0: t('ui.controlMouseLeft'),
        Mouse1: t('ui.controlMouseMiddle'),
        Mouse2: t('ui.controlMouseRight'),
        Space: t('ui.controlSpace'),
      } as Record<string, string>
    )[code] ?? code.replace(/^Key|^Digit/, '')
  );
}
export function actionLabel(action: Action) {
  if (['up', 'down', 'left', 'right', 'fire'].includes(action))
    return profileText(
      locale,
      action as 'up' | 'down' | 'left' | 'right' | 'fire',
    );
  if (action.startsWith('supply'))
    return t('ui.supplies') + ' ' + action.slice(-1);
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
function controlsBodyMarkup(options: ControlOptions) {
  return `<div class="section-heading"><h3>${e(t('ui.controls'))}</h3><button type="button" data-reset-controls>${e(t('ui.reset'))}</button></div><div class="hold-options">${(['fireMode', 'interactMode'] as const).map((key) => `<label>${e(key === 'fireMode' ? p('fire') : t('ui.interact'))}<select data-control-mode="${key}">${['hold', 'toggle'].map((value) => `<option value="${value}" ${options[key] === value ? 'selected' : ''}>${e(p(value as 'hold'))}</option>`).join('')}</select></label>`).join('')}</div><div class="binding-head" aria-hidden="true"><span></span><span>${e(p('keyboard'))}</span><span>${e(p('pad'))}</span></div>${actions.map((action) => `<div class="binding-row"><span>${e(actionLabel(action))}</span><div class="key-bindings">${[0, 1].map((slot) => `<button type="button" data-bind="${action}" data-slot="${slot}" aria-label="${e(actionLabel(action) + ' · ' + p('keyboard') + ' ' + (slot + 1))}"><kbd dir="auto">${e(options.bindings[action][slot] ? bindingLabel(options.bindings[action][slot]) : '—')}</kbd></button>`).join('')}${options.bindings[action][1] ? `<button type="button" class="clear-binding" data-clear-bind="${action}" aria-label="${e(p('clearAlternate'))}">×</button>` : ''}</div>${buttonActions.includes(action as (typeof buttonActions)[number]) ? `<select data-pad-bind="${action}" aria-label="${e(actionLabel(action) + ' · ' + p('pad'))}" dir="ltr">${Array.from({ length: 17 }, (_, n) => `<option value="${n}" ${options.gamepad[action as (typeof buttonActions)[number]] === n ? 'selected' : ''}>${n}</option>`).join('')}</select>` : '<span>' + e(t('ui.controlLeftStick')) + '</span>'}</div>`).join('')}<p data-controls-status role="status" aria-live="polite"></p>`;
}
export function controlsMarkup(options: ControlOptions) {
  return (
    '<section class="control-settings" data-controls>' +
    controlsBodyMarkup(options) +
    '</section>'
  );
}
export function bindControlSettings(
  root: HTMLElement,
  get: () => ControlOptions,
  set: (options: ControlOptions) => void,
) {
  let capture: AbortController | undefined,
    disposed = false;
  const lifetime = new AbortController();
  const active = (element: HTMLElement = root) => {
    if (disposed || !root.isConnected || !element.isConnected) return false;
    for (let node: HTMLElement | null = root; node; node = node.parentElement)
      if (node.hidden) return false;
    const details = root.closest('details');
    return !details || details.open;
  };
  const status = (message: string) => {
    if (!disposed && root.isConnected) {
      const target = root.querySelector<HTMLElement>('[data-controls-status]');
      if (target) target.textContent = message;
    }
  };
  const cancelCapture = (message = 'ui.controlsUnchanged') => {
    const previous = capture;
    capture = undefined;
    previous?.abort();
    if (previous) status(message ? t(message) : '');
  };
  const render = (focus: string, message: string) => {
    if (disposed || !root.isConnected) return;
    root.innerHTML = controlsBodyMarkup(get());
    bindActions();
    root.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
    status(message);
  };
  const replace = (options: ControlOptions, focus: string) => {
    if (!active()) return;
    cancelCapture('');
    try {
      set(options);
      render(focus, t('ui.controlsSaved'));
    } catch {
      render(focus, t('ui.errorSave'));
    }
  };
  function bindActions() {
    const reset = root.querySelector<HTMLButtonElement>(
      '[data-reset-controls]',
    )!;
    reset.onclick = () => {
      if (active(reset)) replace(defaultControls(), '[data-reset-controls]');
    };
    root
      .querySelectorAll<HTMLSelectElement>('[data-control-mode]')
      .forEach((select) => {
        select.onchange = () => {
          if (!active(select)) return;
          const next = structuredClone(get());
          next[select.dataset.controlMode as 'fireMode' | 'interactMode'] =
            select.value as 'hold';
          const focus =
            '[data-control-mode="' + select.dataset.controlMode + '"]';
          if (validControls(next)) replace(next, focus);
          else render(focus, p('conflict'));
        };
      });
    root
      .querySelectorAll<HTMLButtonElement>('[data-clear-bind]')
      .forEach((button) => {
        button.onclick = () => {
          if (!active(button)) return;
          const next = structuredClone(get()),
            action = button.dataset.clearBind as Action;
          next.bindings[action].splice(1, 1);
          replace(next, '[data-bind="' + action + '"][data-slot="0"]');
        };
      });
    root
      .querySelectorAll<HTMLSelectElement>('[data-pad-bind]')
      .forEach((select) => {
        select.onchange = () => {
          if (!active(select)) return;
          const next = structuredClone(get()),
            action = select.dataset.padBind as (typeof buttonActions)[number];
          next.gamepad[action] = Number(select.value);
          const focus = '[data-pad-bind="' + action + '"]';
          if (validControls(next)) replace(next, focus);
          else {
            select.value = String(get().gamepad[action]);
            status(p('conflict'));
          }
        };
      });
    root
      .querySelectorAll<HTMLButtonElement>('[data-bind]')
      .forEach((button) => {
        button.onclick = () => {
          if (!active(button)) return;
          cancelCapture('');
          const current = (capture = new AbortController()),
            signal = current.signal;
          status(p('press'));
          const finish = (code?: string) => {
            if (capture !== current) return;
            cancelCapture('');
            if (!active(button)) return;
            if (!code) {
              status(t('ui.controlsUnchanged'));
              return;
            }
            const next = rebind(
              get(),
              button.dataset.bind as Action,
              Number(button.dataset.slot),
              code,
            );
            if (next)
              replace(
                next,
                '[data-bind="' +
                  button.dataset.bind +
                  '"][data-slot="' +
                  button.dataset.slot +
                  '"]',
              );
            else status(p('conflict'));
          };
          window.addEventListener(
            'keydown',
            (event) => {
              if (!active(button)) {
                cancelCapture('');
                return;
              }
              if (event.repeat || event.isComposing) return;
              if (event.code === 'Tab') {
                finish();
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
              if (!active(button)) {
                cancelCapture('');
                return;
              }
              if (event.pointerType === 'touch') {
                finish();
                return;
              }
              const target = event.target as Element | null;
              if (
                [
                  'button',
                  'input',
                  'select',
                  'summary',
                  'a',
                  '[role="button"]',
                ].some((selector) => target?.closest?.(selector))
              ) {
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
          signal.addEventListener('abort', () => clearTimeout(timeout), {
            once: true,
          });
        };
      });
  }
  const disclosure = root.closest('details');
  const close = () => {
    if (!disclosure?.open) cancelCapture();
  };
  disclosure?.addEventListener('toggle', close);
  window.addEventListener('blur', () => cancelCapture(), {
    signal: lifetime.signal,
  });
  bindActions();
  return {
    cancelCapture,
    dispose() {
      if (disposed) return;
      cancelCapture('');
      disposed = true;
      lifetime.abort();
      disclosure?.removeEventListener('toggle', close);
    },
  };
}
