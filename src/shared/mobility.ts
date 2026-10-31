import catalog from "../../content/catalog.json";
import { DT, HZ, type InputFrame } from "./protocol.ts";
export const generalSkills = catalog.generalSkills;
export const allSkills = [...catalog.skills, ...generalSkills];
export const skillFor = (id: string, classId: string) =>
  allSkills.find(
    (s) => s.id === id && (s.classId === classId || s.classId === "general"),
  );
export const mobilityRules = catalog.rules.generalMobility;
export type Mobility = {
  dodgeCharges: number;
  dodgeMaximum: number;
  dodgeAt: number;
  sprintStamina: number;
  sprintRecoveryAt: number;
  sprintExhausted: boolean;
  sprinting: boolean;
  dashUntil: number;
};
export const dodgeMaximum = (skills: readonly string[]) =>
  skills.includes("general-double-dash") ? 2 : 1;
export const sprintUnlocked = (skills: readonly string[]) =>
  skills.includes("general-sprint");
export function resetMobility(p: Mobility, skills: readonly string[]) {
  p.dodgeMaximum = dodgeMaximum(skills);
  p.dodgeCharges = p.dodgeMaximum;
  p.dodgeAt = 0;
  p.dashUntil = 0;
  p.sprintStamina = mobilityRules.sprintMaximum;
  p.sprintRecoveryAt = 0;
  p.sprintExhausted = false;
  p.sprinting = false;
}
/** Authority and prediction share charge regeneration and stamina integration. */
export function advanceMobility(
  p: Mobility,
  input: InputFrame,
  now: number,
  cooldown: number,
  canSprint: boolean,
  reloading: boolean,
) {
  const period = Math.max(1, Math.ceil(cooldown));
  if (p.dodgeMaximum === 1) p.dodgeCharges = now >= p.dodgeAt ? 1 : 0;
  else if (p.dodgeCharges < p.dodgeMaximum && now >= p.dodgeAt) {
    const recovered = 1 + Math.floor((now - p.dodgeAt) / period);
    p.dodgeCharges = Math.min(p.dodgeMaximum, p.dodgeCharges + recovered);
    p.dodgeAt =
      p.dodgeCharges === p.dodgeMaximum ? 0 : p.dodgeAt + recovered * period;
  }
  p.sprintStamina = Math.max(
    0,
    Math.min(mobilityRules.sprintMaximum, p.sprintStamina),
  );
  if (p.sprintExhausted && p.sprintStamina >= mobilityRules.sprintRestart)
    p.sprintExhausted = false;
  p.sprinting =
    canSprint &&
    !p.sprintExhausted &&
    p.sprintStamina > 0 &&
    input.sprint &&
    Math.hypot(input.moveX, input.moveY) > 0.05 &&
    now >= p.dashUntil &&
    !input.dodge &&
    !input.fire &&
    !input.reload &&
    !input.interact &&
    !input.q &&
    !input.e &&
    !input.ultimate &&
    !reloading;
  if (p.sprinting) {
    p.sprintStamina = Math.max(
      0,
      p.sprintStamina - mobilityRules.sprintDrainPerSecond * DT,
    );
    p.sprintRecoveryAt =
      now + Math.ceil(mobilityRules.sprintRecoveryDelay * HZ);
    if (p.sprintStamina <= 1e-8) {
      p.sprintStamina = 0;
      p.sprintExhausted = true;
      p.sprinting = false;
    }
  } else if (now >= p.sprintRecoveryAt)
    p.sprintStamina = Math.min(
      mobilityRules.sprintMaximum,
      p.sprintStamina + mobilityRules.sprintRecoveryPerSecond * DT,
    );
}
export function takeDodge(p: Mobility, now: number, cooldown: number) {
  if (p.dodgeCharges <= 0 || now < p.dashUntil) return false;
  if (p.dodgeCharges === p.dodgeMaximum)
    p.dodgeAt = now + Math.max(1, Math.ceil(cooldown));
  p.dodgeCharges--;
  p.sprinting = false;
  return true;
}
