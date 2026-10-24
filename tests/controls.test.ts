import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls } from '../src/client/controls.ts';
import { defaultControls } from '../src/client/input-bindings.ts';
// EventTarget routing fixture only; this test makes no browser/rendering claim.
test('remapped keyboard, mouse, gamepad and touch dispatch actions independently and clear toggles on blur', () => {
  class Element extends EventTarget {
    dataset: Record<string, string> = {};
    disabled = false;
    closest() {
      return null;
    }
    setPointerCapture(_id: number) {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 1000 };
    }
  }
  const stage = new Element(),
    touch = new Element(),
    win = new EventTarget();
  touch.dataset.action = 'q';
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const descriptors = ['window', 'document', 'navigator', 'HTMLElement'].map(
    (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)] as const,
  );
  Object.defineProperties(globalThis, {
    window: { value: win, configurable: true },
    document: { value: { querySelectorAll: () => [touch] }, configurable: true },
    navigator: {
      value: { getGamepads: () => [{ connected: true, axes: [0, 0, 0, 0], buttons }] },
      configurable: true,
    },
    HTMLElement: { value: Element, configurable: true },
  });
  const event = (target: EventTarget, type: string, values: Record<string, unknown> = {}) => {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, values);
    target.dispatchEvent(e);
  };
  let controls: Controls | undefined;
  try {
    controls = new Controls(stage as unknown as HTMLElement);
    controls.blocked = false;
    const options = defaultControls();
    options.bindings.q = ['KeyV'];
    options.bindings.e = ['KeyQ'];
    options.bindings.fire = ['KeyC'];
    options.fireMode = 'toggle';
    controls.configure(options);
    controls.sample(0);
    event(win, 'keydown', { code: 'KeyQ' });
    const first = controls.sample(1);
    assert(first.e);
    assert(!first.q);
    event(win, 'keyup', { code: 'KeyQ' });
    event(touch, 'pointerdown', { pointerId: 2, pointerType: 'touch' });
    const touched = controls.sample(2);
    assert(touched.q);
    assert(!touched.e);
    buttons[4].pressed = true;
    const pad = controls.sample(3);
    assert(pad.q);
    assert(!pad.e);
    buttons[4].pressed = false;
    controls.sample(4);
    event(stage, 'pointerdown', {
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 200,
    });
    assert(!controls.sample(5).fire);
    event(stage, 'pointerup', { pointerId: 3, pointerType: 'mouse', button: 0 });
    event(win, 'keydown', { code: 'KeyC' });
    event(win, 'keyup', { code: 'KeyC' });
    assert(controls.sample(6).fire);
    assert(controls.sample(7).fire);
    event(win, 'blur');
    assert(!controls.sample(8).fire);
    event(win, 'keydown', { code: 'KeyW' });
    assert.equal(controls.sample(9).moveY, -1);
    event(win, 'keyup', { code: 'KeyW' });
    buttons[7].pressed = true;
    assert(controls.sample(10).fire);
    controls.blocked = true;
    assert(!controls.sample(11).fire);
    controls.blocked = false;
    assert(!controls.sample(12).fire);
    buttons[7].pressed = false;
    controls.sample(13);
    buttons[7].pressed = true;
    assert(controls.sample(14).fire);
    controls.destroy();
    controls = undefined;
  } finally {
    controls?.destroy();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
