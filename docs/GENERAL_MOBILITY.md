# General mobility

Build **2026.10.31-general-mobility / protocol 45** adds a shared General section beside the class tree, in both Classic and expanded views. Every class can buy its two independent purchases. The existing 378 class nodes remain; the two shared nodes are separate catalog entries. No class, free SP, permanent power or extra capstone slot is added.

| Purchase | Earned SP | Behavior |
| --- | --- | --- |
| Sprint | 3 | Hold or toggle Sprint while moving for +35% movement speed. It pauses during firing, reloading, abilities, reviving and dashing. |
| Double Dash | 6 | Store two ordinary dodges; recharge one at a time using the current dodge cooldown. A new dodge waits for the current dash to finish. |

Both spend the same run budget as class skills. At the 27-point ceiling, a complete 21-point class path and Double Dash consume the whole budget. Adding Sprint requires another choice. Neither purchase is necessary for an existing boss to remain viable.

Sprint starts each encounter with 100 stamina, drains 30 per second while active, and recovers 25 per second after one second of rest. Exhaustion prevents restarting until at least 35 stamina has recovered. Firing and abilities retain their ordinary behavior while suspending Sprint. Sprint grants no invulnerability, healing, shielding or immunity to terrain slows. It multiplies the normal walking speed; the existing collision geometry and forced movement remain shared. Hellish still forbids personal shields, revival and regeneration according to the existing recovery policy. Stamina recovery is a separate movement resource.

Double Dash uses the existing dodge duration, speed and invulnerability. Spending the second charge does not postpone the first recharge. Charges regenerate sequentially; pressing dodge during an existing dash cannot chain overlapping invulnerability or spend another charge. Mobility resources refill when the next encounter starts. Between-encounter saves retain purchases/economy and rebuild transient movement resources at deployment; they do not restore a mid-combat dodge window.

Sprint defaults to **Left Shift** and **gamepad button 10**. Both are remappable. A hold/toggle preference applies to keyboard, gamepad and the touch button; blur, blocked input, cancellation and changed controls clear the state. The touch control and HUD stamina display appear after purchasing Sprint. Double Dash shows current/maximum charges beside Dodge. Existing class ability resource displays remain separate.

Known old local profiles keep every binding, language, preference and receipt. An exact legacy control shape gains an unused Sprint key and gamepad button; conflicts never overwrite an existing choice. Malformed controls still expose profile recovery. Issued protocol-44 local boundaries migrate only from their exact known revisions. Online clients/checkpoints remain strict about protocol **and** content revision. New inputs must include the Sprint boolean.

`src/shared/mobility.ts` owns shared charge/stamina integration for authority and client prediction. `content/source/general-mobility.mjs` owns purchases and tuning; `locales/source/general-mobility.mjs` owns all fifteen catalogs. Reapply content with `tools/update-general-mobility.mjs`, rebuild locales normally, and use `tools/verify.mjs` for the complete gate. The analytical DPS/rating model still evaluates ordinary combat statistics; it does not certify mobility or survivability balance.

Software coverage includes all seven classes and six maps on Normal/Hellish, slowed movement and prediction, sequential charges, stamina exhaustion, budget rejection, old saves/controls, both skill views, keyboard/gamepad/touch and real peer replication/host pause. Rendered/human class balance, native-language and physical-device acceptance remain open. Public version 4 is a separate older release.
