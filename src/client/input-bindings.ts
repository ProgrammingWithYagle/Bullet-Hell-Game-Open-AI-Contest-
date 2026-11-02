export const actions = [
  'up',
  'down',
  'left',
  'right',
  'fire',
  'dodge',
  'sprint',
  'retinue',
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
  sprintMode: 'hold' | 'toggle';
};
export const defaultControls = (): ControlOptions => ({
  bindings: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    fire: ['Mouse0'],
    dodge: ['Space'],
    sprint:['ShiftLeft'],
    retinue:['KeyV'],
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
    sprint:10,
    retinue:15,
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
  sprintMode:'hold',
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
    Object.keys(p).length !== 5 ||
    !['hold', 'toggle'].includes(p.fireMode) ||
    !['hold', 'toggle'].includes(p.interactMode) ||
    !['hold','toggle'].includes(p.sprintMode) ||
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

/** Add Sprint to an exact legacy control shape without overwriting a chosen key/button. */
export function migrateMobilityControls(value:unknown):unknown {
 if(validControls(value))return value;
 const retinue = migrateRetinueControls(value);if(validControls(retinue))return retinue;
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const old=value as Record<string,any>,legacyActions=actions.filter(a=>a!=='sprint'&&a!=='retinue'),legacyButtons=buttonActions.filter(a=>a!=='sprint'&&a!=='retinue');
 if(Object.keys(old).length!==4||!['bindings','gamepad','fireMode','interactMode'].every(k=>Object.hasOwn(old,k))||!old.bindings||!old.gamepad||Object.keys(old.bindings).length!==legacyActions.length||Object.keys(old.gamepad).length!==legacyButtons.length||!legacyActions.every(a=>Object.hasOwn(old.bindings,a))||!legacyButtons.every(a=>Object.hasOwn(old.gamepad,a)))return value;
 const used=new Set(Object.values(old.bindings).flat()),pads=new Set(Object.values(old.gamepad));
 const candidates=['ShiftLeft','ShiftRight','ControlLeft','ControlRight',...Array.from({length:26},(_,n)=>'Key'+String.fromCharCode(65+n)),...Array.from({length:10},(_,n)=>'Digit'+n),'Mouse0','Mouse1','Mouse2','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
 const key=candidates.find(k=>!used.has(k)),button=[10,11,6,8,9,15,16,...Array.from({length:17},(_,n)=>n)].find(n=>!pads.has(n));
 if(!key||button===undefined)return value;
 const next={...old,bindings:{...old.bindings,sprint:[key]},gamepad:{...old.gamepad,sprint:button},sprintMode:'hold'};
 return migrateRetinueControls(next);
}


/** Preserve exact existing mappings when adding the new discrete retinue command. */
export function migrateRetinueControls(value: unknown): unknown {
  if(validControls(value))return value;
  if(!value || typeof value!=='object' || Array.isArray(value))return value;
  const old=value as Record<string,any>, legacyActions=actions.filter(a=>a!=='retinue'), legacyButtons=buttonActions.filter(a=>a!=='retinue');
  if(Object.keys(old).length!==5 || !['bindings','gamepad','fireMode','interactMode','sprintMode'].every(k=>Object.hasOwn(old,k)) || !old.bindings || !old.gamepad || Object.keys(old.bindings).length!==legacyActions.length || Object.keys(old.gamepad).length!==legacyButtons.length || !legacyActions.every(a=>Object.hasOwn(old.bindings,a)) || !legacyButtons.every(a=>Object.hasOwn(old.gamepad,a)))return value;
  const keys=new Set(Object.values(old.bindings).flat()), pads=new Set(Object.values(old.gamepad));
  const key=['KeyV','KeyG','KeyB',...Array.from({length:26},(_,n)=>'Key'+String.fromCharCode(65+n)),...Array.from({length:10},(_,n)=>'Digit'+n)].find(k=>!keys.has(k));
  const button=[15,11,6,8,9,16,...Array.from({length:17},(_,n)=>n)].find(n=>!pads.has(n));
  if(!key || button===undefined)return value;
  const next={...old,bindings:{...old.bindings,retinue:[key]},gamepad:{...old.gamepad,retinue:button}};
  return validControls(next)?next:value;
}
