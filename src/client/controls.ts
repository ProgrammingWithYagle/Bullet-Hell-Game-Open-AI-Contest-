import { idleInput, type InputFrame } from '../shared/protocol.ts';
export class Controls {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private pointers = new Map<number, { kind: 'move' | 'aim'; x: number; y: number }>();
  move = { x: 0, y: 0 };
  aim = { x: 0, y: 0 };
  pointer = { x: 800, y: 250 };
  firing = false;
  interacting = false;
  autoFire = false;
  aimAssist = false;
  touch = false;
  blocked = true;
  private sequence = 0;
  private lastButtons: boolean[] = [];
  private angle = -Math.PI / 2;
  private listeners = new AbortController();
  constructor(readonly element: HTMLElement) {
    const on = <K extends keyof WindowEventMap>(
      target: EventTarget,
      type: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => target.addEventListener(type, fn as EventListener, { signal: this.listeners.signal });
    on(window, 'keydown', (e) => {
      if (
        this.blocked ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    on(window, 'keyup', (e) => this.keys.delete(e.code));
    on(window, 'blur', () => this.clear());
    on(element, 'contextmenu', (e) => e.preventDefault());
    on(element, 'pointerdown', (e) => {
      if (this.blocked) return;
      element.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch') {
        this.touch = true;
        const r = element.getBoundingClientRect(),
          kind = e.clientX < r.left + r.width * 0.45 ? 'move' : 'aim';
        this.pointers.set(e.pointerId, { kind, x: e.clientX, y: e.clientY });
        if (kind === 'aim') this.firing = true;
      } else {
        this.touch = false;
        this.firing = true;
      }
      this.setPointer(e);
    });
    on(element, 'pointermove', (e) => {
      this.setPointer(e);
      const start = this.pointers.get(e.pointerId);
      if (start) {
        const delta = {
          x: Math.max(-1, Math.min(1, (e.clientX - start.x) / 55)),
          y: Math.max(-1, Math.min(1, (e.clientY - start.y) / 55)),
        };
        if (start.kind === 'move') this.move = delta;
        else this.aim = delta;
      }
    });
    const release = (e: PointerEvent) => {
      const start = this.pointers.get(e.pointerId);
      if (start?.kind === 'move') this.move = { x: 0, y: 0 };
      else {
        this.firing = false;
        this.aim = { x: 0, y: 0 };
      }
      this.pointers.delete(e.pointerId);
    };
    on(element, 'pointerup', release);
    on(element, 'pointercancel', release);
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      on(button, 'pointerdown', (e) => {
        e.preventDefault();
        if (this.blocked) return;
        const action = button.dataset.action!;
        if (action === 'interact') this.interacting = true;
        else this.pressed.add(action);
        button.setPointerCapture(e.pointerId);
      });
      const up = () => {
        this.interacting = false;
      };
      on(button, 'pointerup', up);
      on(button, 'pointercancel', up);
    }
  }
  private setPointer(e: PointerEvent) {
    const r = this.element.getBoundingClientRect(),
      scale = Math.min(r.width / 1600, r.height / 1000);
    this.pointer = {
      x: (e.clientX - r.left - (r.width - 1600 * scale) / 2) / scale,
      y: (e.clientY - r.top - (r.height - 1000 * scale) / 2) / scale,
    };
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.pointers.clear();
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.firing = false;
    this.interacting = false;
  }
  destroy() {
    this.clear();
    this.listeners.abort();
  }
  sample(
    tick: number,
    player?: { x: number; y: number },
    boss?: { x: number; y: number },
  ): InputFrame {
    const input = idleInput();
    input.sequence = ++this.sequence;
    input.clientTick = tick;
    if (this.blocked) {
      this.clear();
      return input;
    }
    const key = (...names: string[]) => names.some((k) => this.keys.has(k));
    input.moveX =
      Number(key('KeyD', 'ArrowRight')) - Number(key('KeyA', 'ArrowLeft')) + this.move.x;
    input.moveY = Number(key('KeyS', 'ArrowDown')) - Number(key('KeyW', 'ArrowUp')) + this.move.y;
    if (player && !this.touch)
      this.angle = Math.atan2(this.pointer.y - player.y, this.pointer.x - player.x);
    if (Math.hypot(this.aim.x, this.aim.y) > 0.15) this.angle = Math.atan2(this.aim.y, this.aim.x);
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    let gamepadFire = false;
    if (pad) {
      const dead = (n: number) => (Math.abs(n) > 0.18 ? n : 0);
      input.moveX += dead(pad.axes[0] ?? 0);
      input.moveY += dead(pad.axes[1] ?? 0);
      const x = dead(pad.axes[2] ?? 0),
        y = dead(pad.axes[3] ?? 0);
      if (x || y) this.angle = Math.atan2(y, x);
      const actions: Record<number, string> = {
        0: 'Space',
        2: 'KeyR',
        4: 'KeyQ',
        5: 'KeyE',
        3: 'KeyX',
        12: 'Digit1',
        13: 'Digit2',
        14: 'Digit3',
      };
      for (const [index, action] of Object.entries(actions)) {
        const n = Number(index),
          down = pad.buttons[n]?.pressed ?? false;
        if (down && !this.lastButtons[n]) this.pressed.add(action);
      }
      this.lastButtons = pad.buttons.map((b) => b.pressed);
      gamepadFire = Boolean(pad.buttons[7]?.pressed);
      input.interact = Boolean(pad.buttons[1]?.pressed);
    }
    if (this.aimAssist && player && boss) {
      const target = Math.atan2(boss.y - player.y, boss.x - player.x),
        difference = Math.atan2(Math.sin(target - this.angle), Math.cos(target - this.angle));
      if (Math.abs(difference) < 0.16) this.angle += difference * 0.35;
    }
    input.aim = this.angle;
    input.moveX = Math.max(-1, Math.min(1, input.moveX));
    input.moveY = Math.max(-1, Math.min(1, input.moveY));
    input.fire = this.firing || this.autoFire || gamepadFire;
    input.interact ||= this.interacting || key('KeyF');
    for (let n = 0; n < 3; n++)
      if (this.pressed.has('Digit' + (n + 1))) {
        input.supply = n;
        break;
      }
    for (const [action, code] of [
      ['dodge', 'Space'],
      ['reload', 'KeyR'],
      ['q', 'KeyQ'],
      ['e', 'KeyE'],
      ['ultimate', 'KeyX'],
    ] as const)
      input[action] = this.pressed.has(code);
    this.pressed.clear();
    return input;
  }
}
