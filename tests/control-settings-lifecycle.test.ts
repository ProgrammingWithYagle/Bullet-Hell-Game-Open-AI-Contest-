import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { menuEnvironment, menuBundle } from './helpers/menu-fixture.ts';
import {
  defaultControls,
  type ControlOptions,
} from '../src/client/input-bindings.ts';
import { freshProfile, PROFILE_KEY } from '../src/client/profile.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function keyboardWindow(env: ReturnType<typeof menuEnvironment>) {
  const listeners = new Map<
    string,
    { fn: (event: any) => void; signal?: AbortSignal; capture: boolean }[]
  >();
  const window = {
    innerHeight: 800,
    location: { protocol: 'http:', hostname: '127.0.0.1' },
    scrollTo() {},
    addEventListener(
      type: string,
      fn: (event: any) => void,
      options: any = {},
    ) {
      const item = {
        fn,
        signal: options.signal,
        capture: options === true || options.capture === true,
      };
      if (item.signal?.aborted) return;
      listeners.set(type, [...(listeners.get(type) ?? []), item]);
      item.signal?.addEventListener(
        'abort',
        () => {
          listeners.set(
            type,
            (listeners.get(type) ?? []).filter((x) => x !== item),
          );
        },
        { once: true },
      );
    },
    removeEventListener(type: string, fn: (event: any) => void) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((x) => x.fn !== fn),
      );
    },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: window,
  });
  const fire = (type: string, extra: Record<string, unknown> = {}) => {
    let stopped = false,
      prevented = false;
    const event = {
      target: env.host,
      code: 'KeyK',
      repeat: false,
      isComposing: false,
      pointerType: 'mouse',
      button: 0,
      preventDefault() {
        prevented = true;
      },
      stopImmediatePropagation() {
        stopped = true;
      },
      ...extra,
    };
    for (const item of [...(listeners.get(type) ?? [])].sort(
      (a, b) => Number(b.capture) - Number(a.capture),
    )) {
      if (!item.signal?.aborted) item.fn(event);
      if (stopped) break;
    }
    return { stopped, prevented };
  };
  return {
    fire,
    captures: () =>
      [...listeners.values()]
        .flat()
        .filter((x) => x.capture && !x.signal?.aborted).length,
  };
}
async function fixture(t: TestContext, fail = false, inDisclosure = false) {
  const env = menuEnvironment(t),
    keys = keyboardWindow(env),
    ui = await menuBundle(t, 'src/client/ui/control-settings.ts');
  let options = defaultControls(),
    saves = 0,
    failSave = fail;
  env.host.innerHTML = ui.controlsMarkup(options);
  const root = env.host.querySelector('[data-controls]')!;
  const details = inDisclosure
    ? env.document.createElement('details')
    : undefined;
  if (details) {
    details.open = true;
    env.host.append(details);
    details.append(root);
  }
  const binding = ui.bindControlSettings(
    root,
    () => options,
    (next: ControlOptions) => {
      if (failSave) throw Error('quota');
      options = next;
      saves++;
    },
  );
  env.cleanup.push(() => {
    binding?.dispose?.();
    env.host.replaceChildren();
    keys.fire('keydown', { code: 'Escape' });
  });
  return {
    ...env,
    ...keys,
    ui,
    root,
    details,
    binding,
    get: () => options,
    saves: () => saves,
    allowSave: () => {
      failSave = false;
    },
  };
}
const keyButton = (f: Awaited<ReturnType<typeof fixture>>) =>
  f.host.querySelector('[data-bind="fire"][data-slot="0"]')!;

test('a successful key change keeps its owning controls and keyboard focus with a saved notice', async (t) => {
  const f = await fixture(t),
    old = keyButton(f);
  old.focus();
  old.click();
  f.fire('keydown', { code: 'KeyK' });
  assert.equal(f.get().bindings.fire[0], 'KeyK');
  assert(
    f.document.activeElement === keyButton(f),
    'Focus must return to the current action button',
  );
  assert(
    f.host.querySelector('[data-controls]') === f.root,
    'An edit must not replace the owner',
  );
  assert.equal(
    f.host.querySelector('[data-controls-status]')!.textContent,
    'ui.controlsSaved',
  );
  assert.equal(f.captures(), 0);
});

test('a failed control-mode save restores the displayed value and allows a focused retry', async (t) => {
  const f = await fixture(t, true),
    select = f.host.querySelector('[data-control-mode="fireMode"]')!;
  select.focus();
  select.value = 'toggle';
  select.dispatch('change');
  assert.equal(f.get().fireMode, 'hold');
  assert.equal(
    f.host.querySelector('[data-control-mode="fireMode"]')!.value,
    'hold',
  );
  assert.equal(
    f.host.querySelector('[data-controls-status]')!.textContent,
    'ui.errorSave',
  );
  assert(
    f.document.activeElement ===
      f.host.querySelector('[data-control-mode="fireMode"]'),
  );
  f.allowSave();
  const retry = f.host.querySelector('[data-control-mode="fireMode"]')!;
  retry.value = 'toggle';
  retry.dispatch('change');
  assert.equal(f.get().fireMode, 'toggle');
  assert.equal(f.saves(), 1);
});

test('held-key repeats and IME composition cannot accidentally choose a new control', async (t) => {
  const f = await fixture(t);
  keyButton(f).click();
  f.fire('keydown', { code: 'KeyK', repeat: true });
  f.fire('keydown', { code: 'KeyJ', isComposing: true });
  assert.equal(f.saves(), 0);
  assert.equal(f.get().bindings.fire[0], 'Mouse0');
  f.fire('keydown', { code: 'KeyK' });
  assert.equal(f.saves(), 1);
  assert.equal(f.get().bindings.fire[0], 'KeyK');
});

test('disposed settings ignore detached and still-connected old actions and release captured events', async (t) => {
  const f = await fixture(t);
  const old = keyButton(f);
  old.click();
  assert.equal(f.captures(), 2);
  f.binding?.dispose?.();
  old.click();
  f.host.querySelector('[data-reset-controls]')!.click();
  f.fire('keydown', { code: 'KeyK' });
  assert.equal(f.saves(), 0);
  assert.equal(f.captures(), 0);
  assert.equal(f.fire('keydown', { code: 'Escape' }).prevented, false);
});

test('closing a settings disclosure or losing focus cancels capture before the next key', async (t) => {
  const f = await fixture(t, false, true),
    details = f.details!;
  keyButton(f).click();
  details.open = false;
  details.dispatch('toggle');
  assert.equal(f.captures(), 0);
  assert.equal(f.fire('keydown', { code: 'KeyK' }).prevented, false);
  assert.equal(f.saves(), 0);
  details.open = true;
  keyButton(f).click();
  f.fire('blur');
  assert.equal(f.captures(), 0);
  assert.equal(f.saves(), 0);
});

test('leaving the actual setup settings page disposes its capture without waiting for a key or timer', async (t) => {
  const env = menuEnvironment(t),
    keys = keyboardWindow(env);
  env.saved.set(PROFILE_KEY, JSON.stringify(freshProfile()));
  const ui = await menuBundle(
    t,
    'src/client/main.ts',
    {
      'scene.ts': 'export class CombatScene {}',
      phaser: 'export default {AUTO:0,Scale:{FIT:0,CENTER_BOTH:0}};',
      'audio.ts': 'export class AudioBus {setVolume(){}stop(){}}',
    },
    'export {leave};',
  );
  env.cleanup.push(() => {
    env.host.replaceChildren();
    keys.fire('keydown', { code: 'Escape' });
    return ui.leave();
  });
  env.host.querySelector('#settings')!.click();
  env.host.querySelector('[data-bind="fire"][data-slot="0"]')!.click();
  assert.equal(keys.captures(), 2);
  env.host.querySelector('#brand-home')!.click();
  assert.equal(keys.captures(), 0);
  assert(env.host.querySelector('#new-run'));
  assert.equal(
    JSON.parse(env.saved.get(PROFILE_KEY)!).controls.bindings.fire[0],
    'Mouse0',
  );
});

test('a conflicting binding stays unchanged and Tab or Escape can cancel capture without saving', async (t) => {
  const f = await fixture(t);
  keyButton(f).click();
  f.fire('keydown', { code: 'KeyW' });
  assert.equal(f.saves(), 0);
  assert.equal(f.get().bindings.fire[0], 'Mouse0');
  assert.equal(f.captures(), 0);
  keyButton(f).click();
  assert.equal(f.fire('keydown', { code: 'Tab' }).prevented, false);
  assert.equal(f.captures(), 0);
  assert.equal(f.saves(), 0);
  keyButton(f).click();
  assert.equal(f.fire('keydown', { code: 'Escape' }).prevented, true);
  assert.equal(f.captures(), 0);
  assert.equal(f.saves(), 0);
  assert.equal(
    f.host.querySelector('[data-controls-status]')!.textContent,
    'ui.controlsUnchanged',
  );
});

test('mouse buttons, Space and the left stick have source-backed readable labels in all fifteen languages', async (t) => {
  const f = await fixture(t),
    source = await import(
      pathToFileURL(resolve('locales/source/control-settings.mjs')).href
    );
  assert.equal(f.ui.bindingLabel('Mouse0'), 'ui.controlMouseLeft');
  assert.equal(f.ui.bindingLabel('Mouse1'), 'ui.controlMouseMiddle');
  assert.equal(f.ui.bindingLabel('Mouse2'), 'ui.controlMouseRight');
  assert.equal(f.ui.bindingLabel('Space'), 'ui.controlSpace');
  assert(f.root.textContent.includes('ui.controlLeftStick'));
  assert(!f.root.textContent.includes('🖱'));
  const locales = JSON.parse(
    readFileSync('content/catalog.json', 'utf8'),
  ).locales;
  for (const { id } of locales) {
    const labels = source.controlSettingsMessages(id),
      catalog = JSON.parse(
        readFileSync('locales/' + id + '.json', 'utf8'),
      ).messages;
    assert.equal(Object.keys(labels).length, 7);
    for (const [key, value] of Object.entries(labels)) {
      assert(
        typeof value === 'string' && value.trim() && !/[<>]/u.test(value),
        id + key,
      );
      assert.equal(catalog[key], value, id + key);
    }
  }
});

test('clicking another menu control cancels capture without swallowing navigation or rebinding the mouse', async (t) => {
  const f = await fixture(t);
  const resume = f.document.createElement('button');
  f.host.append(resume);
  keyButton(f).click();
  const event = f.fire('pointerdown', { target: resume, button: 0 });
  assert.equal(event.prevented, false);
  assert.equal(event.stopped, false);
  assert.equal(f.saves(), 0);
  assert.equal(f.captures(), 0);
  assert.equal(f.get().bindings.fire[0], 'Mouse0');
  keyButton(f).click();
  f.fire('pointerdown', { target: f.root, button: 2 });
  assert.equal(f.get().bindings.fire[0], 'Mouse2');
  assert.equal(f.saves(), 1);
});
