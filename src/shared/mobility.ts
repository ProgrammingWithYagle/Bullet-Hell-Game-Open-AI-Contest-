import catalog from "../../content/catalog.json";
import { DT, HZ, type InputFrame } from "./protocol.ts";
export const generalSkills = catalog.generalSkills;
export const allSkills = [
  ...catalog.skills,
  ...generalSkills,
  ...catalog.specializationSkills,
];
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
  dodgeInputDown?: boolean;
  dodgeSteered?: boolean;
  dodgeControlUntil?: number;
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
  p.dodgeInputDown = false;
  p.dodgeSteered = false;
  p.dodgeControlUntil = 0;
}
/** The same ordinary-dodge controls run in authority and local prediction. */
export function dodgeIntent(
  p: Mobility & { dashX: number; dashY: number },
  input: InputFrame,
  now: number,
  skills: readonly string[],
): "start" | "brake" | "hold" {
  const pressed = input.dodge && !p.dodgeInputDown,
    brake = skills.includes("general-brake-step");
  p.dodgeInputDown = input.dodge;
  // Class rushes can use dash movement too; their timing does not admit these controls.
  if (now < p.dashUntil && p.dashUntil === p.dodgeControlUntil) {
    if (brake && pressed) {
      p.dashUntil = now;
      return "brake";
    }
    if (
      skills.includes("general-course-correction") &&
      sprintUnlocked(skills) &&
      input.sprint &&
      !p.dodgeSteered &&
      !p.sprintExhausted &&
      p.sprintStamina >= mobilityRules.courseStaminaCost &&
      Math.hypot(input.moveX, input.moveY) > 0.05
    ) {
      const old = Math.atan2(p.dashY, p.dashX),
        requested = Math.atan2(input.moveY, input.moveX),
        delta = Math.atan2(
          Math.sin(requested - old),
          Math.cos(requested - old),
        );
      if (Math.abs(delta) >= mobilityRules.courseMinimumTurn) {
        const angle =
          old +
          Math.max(
            -mobilityRules.courseMaximumTurn,
            Math.min(mobilityRules.courseMaximumTurn, delta),
          );
        p.dashX = Math.cos(angle);
        p.dashY = Math.sin(angle);
        p.dodgeSteered = true;
        p.sprintStamina = Math.max(
          0,
          p.sprintStamina - mobilityRules.courseStaminaCost,
        );
        p.sprintRecoveryAt = Math.max(
          p.sprintRecoveryAt,
          now + Math.ceil(mobilityRules.sprintRecoveryDelay * HZ),
        );
        if (p.sprintStamina <= 1e-8) p.sprintExhausted = true;
      }
    }
  }
  return input.dodge && (!brake || pressed) ? "start" : "hold";
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
    !input.technique1 &&
    !input.technique2 &&
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
  p.dodgeSteered = false;
  return true;
}
