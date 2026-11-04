import {soldierVolleyMessages}from'./soldier-volley.mjs';
import {soldierReloadMessages}from'./soldier-reload.mjs';
export const soldierSkirmisherMessages = () => ({
  ...soldierReloadMessages(),
  ...soldierVolleyMessages(),
  "branch.soldier-pathways": "Specializations",
  "pathway.soldier-skirmisher-1.name": "Skirmisher",
  "skill.soldier-skirmisher-1.name": "Passing Shot",
  "skill.soldier-skirmisher-advance-1.name": "Crossing Advance",
  "skill.soldier-skirmisher-rear-1.name": "Rear Guard",
  "skill.soldier-skirmisher-1.description":
    "After Precision Burst, use action 1 within 1.2 seconds while holding movement. Commit a legal 90-pixel step over 0.3 seconds, then fire one 15-base-damage piercing round along the aim you committed. The original burst, rally and ultimate remain. One follow-up per burst; 6-second base recovery. No dodge immunity or free ammunition. Obstruction, hostile slow/displacement, dodge or owner loss cancels unfinished work without a refund.",
  "skill.soldier-skirmisher-advance-1.description":
    "Passing Shot becomes a committed forward crossing along your starting aim. Its same follow-up damage is split equally between a departure round and an arrival round. Aim again for the arrival shot while your route stays fixed. No extra total follow-up damage, terrain bypass or immunity. Excludes Rear Guard.",
  "skill.soldier-skirmisher-rear-1.description":
    "Passing Shot becomes a committed backward step from your starting aim. Fire the same follow-up damage halfway through and intercept at most one visible hostile projectile in a 96-pixel forward lane with 12-pixel clearance. Other projectiles, contact, fixed warnings and hazards remain dangerous. Cover blocks interception. Excludes Crossing Advance.",
  "pathway.soldier-skirmisher-1.summary":
    "Burst, choose a legal step, then fire on arrival. Keep the ordinary burst and rally.",
  "pathway.soldier-skirmisher-advance-1.summary":
    "Commit forward; fire on departure, then aim the arrival round again.",
  "pathway.soldier-skirmisher-rear-1.summary":
    "Commit backward; a timed guard shot can intercept one visible projectile.",
  "ui.soldier.fieldManual": "Fire and movement",
  "ui.soldier.manualHelp":
    "A burst opens a brief follow-through. Choose ground you can commit to, then decide how to cross it. Your rally and Last Roll Call keep their familiar jobs.",
  "ui.soldier.kitHelp":
    "Your issued rally, burst and Last Roll Call remain. Passing Shot adds a separate action after a real Precision Burst.",
  "ui.soldier.passingHelp":
    "After Precision Burst, hold a movement direction and use action 1 within 1.2 seconds. The committed step fires on arrival. It grants no dodge immunity.",
  "ui.soldier.advanceHelp":
    "After Precision Burst, use action 1 within 1.2 seconds to commit forward along your aim. Fire on departure, then aim the arrival round again. The route stays fixed.",
  "ui.soldier.rearHelp":
    "After Precision Burst, use action 1 within 1.2 seconds to commit backward from your aim. The halfway guard shot can intercept one visible projectile; it does not make you invulnerable.",
  "ui.soldier.opening": "{seconds}s opening",
});
