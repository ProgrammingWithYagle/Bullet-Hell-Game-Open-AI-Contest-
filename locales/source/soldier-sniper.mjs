import{soldierSniperBoreMessages}from'./soldier-sniper-bore.mjs';
import{soldierSniperHandlingMessages}from'./soldier-sniper-handling.mjs';
export const soldierSniperMessages=()=>({
  ...soldierSniperBoreMessages(),
  ...soldierSniperHandlingMessages(),
  "pathway.soldier-sniper-1.name": "Sniper",
  "pathway.soldier-sniper-1.summary": "Settled Shot: Plant, settle and deliberately release one actual round.",
  "skill.soldier-sniper-1.name": "Settled Shot",
  "skill.soldier-sniper-1.description": "Action 1 reserves one actual magazine round and starts ten-second base recovery. Stand still for 0.7 seconds, then press action 1 again to fire a manually aimed, direct 110-base-damage physical shot. Preparation lasts at most three seconds and never fires automatically. Turning more than twelve degrees from the settled bearing recenters the sight and restarts settling within the original deadline. Movement, a new primary press, Reload, dodge, health loss, burst or overdrive cancels the paid preparation without refund. A held primary stays blocked through preparation; release and press it again to cancel. Let an already committed burst finish before preparing. Cover, bodies, travel and source armor apply; no bank, piercing, targeting or immunity. Choose this discipline instead of Skirmisher, Marksman or Grenadier.",
  "ui.sniper.help": "Action 1 reserves one actual round and starts recovery. Stand still while the sight settles, then press again when you choose to fire. Turning more than twelve degrees from the settled bearing recenters the sight and restarts settling within the original three-second preparation. Movement, Reload, dodge, health loss, burst or overdrive abandons the paid round. A held primary stays blocked; release and press it again to cancel. Let an already committed burst finish before preparing. Your rally, burst and Last Roll Call keep their own effects.",
  "ui.sniper.settling": "settle · {seconds}s",
  "ui.sniper.release": "fire · {seconds}s left",
  "ui.sniper.prepare": "prepare one round"
});
