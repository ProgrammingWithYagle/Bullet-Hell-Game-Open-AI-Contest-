import { loadProfile } from '../profile.ts';
import { defaultControls } from '../input-bindings.ts';
import { bindingLabel } from './control-settings.ts';
import { t, number } from '../i18n.ts';
import { escape as e } from './html.ts';
import { icon } from './icons.ts';
const STORAGE = 'ga-tutorial-v1';
export function tutorialSeen() {
  try {
    return localStorage.getItem(STORAGE) === 'done';
  } catch {
    return false;
  }
}
export function tutorial(host: HTMLElement, done: () => void) {
  let page = 0;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const panel = document.createElement('div');
  panel.className = 'tutorial-overlay';
  host.append(panel);
  let bindings = defaultControls();
  try {
    bindings = loadProfile(localStorage).controls;
  } catch {}
  const key = (action: keyof typeof bindings.bindings) =>
    bindings.bindings[action].map(bindingLabel).join(' / ');
  const slides = [
    [
      'move',
      'ui.controls',
      t('ui.tutorialMove', {
        binding: ['up', 'left', 'down', 'right'].map((a) => key(a as 'up')).join(' · ') + ' / LS',
      }) +
        ' ' +
        t('ui.tutorialDodge', { binding: key('dodge') + ' / ' + bindings.gamepad.dodge }),
    ],
    ['weapon', 'ui.tutorial', t('ui.tutorialCombat')],
    [
      'ultimate',
      'ui.ultimate',
      t('ui.tutorialUltimate', { binding: key('ultimate') + ' / ' + bindings.gamepad.ultimate }) +
        ' ' +
        t('ui.tutorialTeam'),
    ],
    ['tree', 'ui.skillTree', t('ui.tutorialShop')],
  ];
  const finish = () => {
    try {
      localStorage.setItem(STORAGE, 'done');
    } catch {}
    panel.remove();
    previous?.focus();
    done();
  };
  function render() {
    const [glyph, title, body] = slides[page];
    panel.innerHTML = `<section class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" tabindex="-1"><div class="section-heading"><span class="eyebrow">${e(t('ui.tutorial'))} · ${number(page + 1)} / ${number(slides.length)}</span><button id="tutorial-skip" class="text-button">${e(t('ui.skipTutorial'))}</button></div><div class="tutorial-glyph">${icon(glyph)}</div><h2 id="tutorial-title">${e(t(title))}</h2><p>${e(body)}</p><div class="tutorial-pips" aria-hidden="true">${slides.map((_, i) => `<span class="${i === page ? 'active' : ''}"></span>`).join('')}</div><div class="actions">${page ? `<button id="tutorial-back">${e(t('ui.back'))}</button>` : ''}<button id="tutorial-next" class="primary">${e(t(page === slides.length - 1 ? 'ui.confirm' : 'ui.next'))}</button></div></section>`;
    panel.querySelector<HTMLButtonElement>('#tutorial-skip')!.onclick = finish;
    const back = panel.querySelector<HTMLButtonElement>('#tutorial-back');
    if (back)
      back.onclick = () => {
        page--;
        render();
      };
    panel.querySelector<HTMLButtonElement>('#tutorial-next')!.onclick = () => {
      if (page === slides.length - 1) finish();
      else {
        page++;
        render();
      }
    };
    panel.querySelector<HTMLElement>('.tutorial-card')!.focus();
  }
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish();
    }
    if (event.key === 'Tab') {
      const buttons = [...panel.querySelectorAll<HTMLButtonElement>('button')],
        first = buttons[0],
        last = buttons.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.firstElementChild)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  render();
}
