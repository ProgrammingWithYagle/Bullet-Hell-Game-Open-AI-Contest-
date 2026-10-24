export const actions = [
  'up',
  'down',
  'left',
  'right',
  'fire',
  'dodge',
  'reload',
  'q',
  'e',
  'ultimate',
  'interact',
  'supply1',
  'supply2',
  'supply3',
] as const;
export type Action = (typeof actions)[number];
export const buttonActions = actions.filter(
  (a) => !['up', 'down', 'left', 'right'].includes(a),
) as Exclude<Action, 'up' | 'down' | 'left' | 'right'>[];
export type ButtonAction = (typeof buttonActions)[number];
export type ControlOptions = {
  bindings: Record<Action, string[]>;
  gamepad: Record<ButtonAction, number>;
  fireMode: 'hold' | 'toggle';
  interactMode: 'hold' | 'toggle';
};
export const defaultControls = (): ControlOptions => ({
  bindings: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    fire: ['Mouse0'],
    dodge: ['Space'],
    reload: ['KeyR'],
    q: ['KeyQ'],
    e: ['KeyE'],
    ultimate: ['KeyX'],
    interact: ['KeyF'],
    supply1: ['Digit1'],
    supply2: ['Digit2'],
    supply3: ['Digit3'],
  },
  gamepad: {
    fire: 7,
    dodge: 0,
    reload: 2,
    q: 4,
    e: 5,
    ultimate: 3,
    interact: 1,
    supply1: 12,
    supply2: 13,
    supply3: 14,
  },
  fireMode: 'hold',
  interactMode: 'hold',
});
export function allowedBinding(code: string) {
  return /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Mouse[012])$/.test(
    code,
  );
}
export function validControls(value: unknown): value is ControlOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as ControlOptions;
  if (
    Object.keys(p).length !== 4 ||
    !['hold', 'toggle'].includes(p.fireMode) ||
    !['hold', 'toggle'].includes(p.interactMode) ||
    !p.bindings ||
    !p.gamepad ||
    Object.keys(p.bindings).length !== actions.length ||
    Object.keys(p.gamepad).length !== buttonActions.length
  )
    return false;
  const codes: string[] = [],
    pads: number[] = [];
  for (const action of actions) {
    const list = p.bindings[action];
    if (
      !Array.isArray(list) ||
      list.length < 1 ||
      list.length > 2 ||
      !list.every((c) => typeof c === 'string' && allowedBinding(c))
    )
      return false;
    codes.push(...list);
  }
  for (const action of buttonActions) {
    const n = p.gamepad[action];
    if (!Number.isInteger(n) || n < 0 || n > 16) return false;
    pads.push(n);
  }
  return new Set(codes).size === codes.length && new Set(pads).size === pads.length;
}
export function rebind(options: ControlOptions, action: Action, slot: number, code: string) {
  if (!actions.includes(action) || ![0, 1].includes(slot) || !allowedBinding(code)) return null;
  const next = structuredClone(options);
  if (slot === 1 && next.bindings[action][0] === code) return null;
  next.bindings[action][slot] = code;
  return validControls(next) ? next : null;
}
/** One edge per physical press; quick taps between simulation samples still count. */
export class ActionLatch {
  private previous = false;
  private latched = false;
  sample(held: boolean, pulse: boolean, mode: 'hold' | 'toggle') {
    if (mode === 'hold') {
      this.previous = held;
      this.latched = false;
      return held || pulse;
    }
    if (pulse || (held && !this.previous)) this.latched = !this.latched;
    this.previous = held;
    return this.latched;
  }
  clear() {
    this.previous = this.latched = false;
  }
}
