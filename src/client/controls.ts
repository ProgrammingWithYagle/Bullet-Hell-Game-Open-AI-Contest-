import { idleInput, type InputFrame } from '../shared/protocol.ts';
import {
  defaultControls,
  actions,
  buttonActions,
  ActionLatch,
  type Action,
  type ControlOptions,
} from './input-bindings.ts';
export class Controls {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private virtualPressed = new Set<Action>();
  private pointers = new Map<number, { kind: 'move' | 'aim'; x: number; y: number }>();
  private options = defaultControls();
  private fireLatch = new ActionLatch();
  private interactLatch = new ActionLatch();
  private suppressPad = true;
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
  constructor(readonly element: HTMLElement,private toWorld=(point:{x:number;y:number})=>point,private viewport=()=>({width:1600,height:1000})) {
    const on = <K extends keyof WindowEventMap>(
      target: EventTarget,
      type: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => target.addEventListener(type, fn as EventListener, { signal: this.listeners.signal });
    on(window, 'keydown', (e) => {
      if (
        this.blocked ||
        (e.target instanceof HTMLElement &&
          e.target.closest('input,select,textarea,[contenteditable="true"]'))
      )
        return;
      if (Object.values(this.options.bindings).some((list) => list.includes(e.code)))
        e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    on(window, 'keyup', (e) => {
      this.keys.delete(e.code);
    });
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
        const code = 'Mouse' + e.button;
        if (!this.keys.has(code)) this.pressed.add(code);
        this.keys.add(code);
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
      else if (start) {
        this.firing = false;
        this.aim = { x: 0, y: 0 };
      }
      this.keys.delete('Mouse' + e.button);
      if (e.type === 'pointercancel')
        for (const code of ['Mouse0', 'Mouse1', 'Mouse2']) this.keys.delete(code);
      this.pointers.delete(e.pointerId);
    };
    on(element, 'pointerup', release);
    on(element, 'pointercancel', release);
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      on(button, 'pointerdown', (e) => {
        e.preventDefault();
        if (this.blocked || button.disabled) return;
        const action = button.dataset.action as Action;
        if (!actions.includes(action)) return;
        if (action === 'interact') this.interacting = true;
        this.virtualPressed.add(action);
        button.setPointerCapture(e.pointerId);
      });
      const up = () => {
        if (button.dataset.action === 'interact') this.interacting = false;
      };
      on(button, 'pointerup', up);
      on(button, 'pointercancel', up);
    }
  }
  configure(options: ControlOptions) {
    if (JSON.stringify(options) === JSON.stringify(this.options)) return;
    this.options = structuredClone(options);
    this.clear();
  }
  private setPointer(e: PointerEvent) {
    const r = (this.element.querySelector?.('canvas') ?? this.element).getBoundingClientRect(),
      {width,height} = this.viewport(), scale = Math.min(r.width / width, r.height / height);
    if (!Number.isFinite(scale) || scale <= 0) return;
    this.pointer = this.toWorld({
      x: (e.clientX - r.left - (r.width - width * scale) / 2) / scale,
      y: (e.clientY - r.top - (r.height - height * scale) / 2) / scale,
    });
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.virtualPressed.clear();
    this.pointers.clear();
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.firing = this.interacting = false;
    this.fireLatch.clear();
    this.interactLatch.clear();
    this.suppressPad = true;
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
    const held = (a: Action) => this.options.bindings[a].some((k) => this.keys.has(k));
    const pulse = (a: Action) =>
      this.virtualPressed.has(a) || this.options.bindings[a].some((k) => this.pressed.has(k));
    input.moveX = Number(held('right')) - Number(held('left')) + this.move.x;
    input.moveY = Number(held('down')) - Number(held('up')) + this.move.y;
    if (player && !this.touch)
      this.angle = Math.atan2(this.pointer.y - player.y, this.pointer.x - player.x);
    if (Math.hypot(this.aim.x, this.aim.y) > 0.15) this.angle = Math.atan2(this.aim.y, this.aim.x);
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    let padFire = false,
      padInteract = false;
    if (pad) {
      const dead = (n: number) => (Math.abs(n) > 0.18 ? n : 0);
      input.moveX += dead(pad.axes[0] ?? 0);
      input.moveY += dead(pad.axes[1] ?? 0);
      const x = dead(pad.axes[2] ?? 0),
        y = dead(pad.axes[3] ?? 0);
      if (x || y) this.angle = Math.atan2(y, x);
      const down = pad.buttons.map((b) => b.pressed);
      if (this.suppressPad && !down.some(Boolean)) this.suppressPad = false;
      if (!this.suppressPad) {
        for (const a of buttonActions) {
          const n = this.options.gamepad[a];
          if (down[n] && !this.lastButtons[n]) this.virtualPressed.add(a);
        }
        padFire = Boolean(down[this.options.gamepad.fire]);
        padInteract = Boolean(down[this.options.gamepad.interact]);
      }
      this.lastButtons = down;
    } else {
      this.lastButtons = [];
      this.suppressPad = false;
    }
    if (this.aimAssist && player && boss) {
      const target = Math.atan2(boss.y - player.y, boss.x - player.x),
        difference = Math.atan2(Math.sin(target - this.angle), Math.cos(target - this.angle));
      if (Math.abs(difference) < 0.16) this.angle += difference * 0.35;
    }
    input.aim = this.angle;
    input.moveX = Math.max(-1, Math.min(1, input.moveX));
    input.moveY = Math.max(-1, Math.min(1, input.moveY));
    input.fire =
      this.fireLatch.sample(
        held('fire') || this.firing || padFire,
        pulse('fire'),
        this.options.fireMode,
      ) || this.autoFire;
    input.interact = this.interactLatch.sample(
      held('interact') || this.interacting || padInteract,
      pulse('interact'),
      this.options.interactMode,
    );
    for (let n = 0; n < 3; n++)
      if (pulse(('supply' + (n + 1)) as Action)) {
        input.supply = n;
        break;
      }
    for (const a of ['dodge', 'reload', 'q', 'e', 'ultimate'] as const) input[a] = pulse(a);
    this.pressed.clear();
    this.virtualPressed.clear();
    return input;
  }
}
