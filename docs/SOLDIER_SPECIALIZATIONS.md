# Soldier specializations — source audit and working brief

This is the next single Free Play class focus after Engineer's scoped implementation/reference review. **No Soldier specialization is implemented or selectable by this document.** The names and mechanics below remain working proposals. Complete Soldier's three distinctive routes individually before Heavy; do not expose empty cards or mass-produce the other ten classes.

## Preserve the actual Soldier

Read-only audit of playable source 233e9143300989f43f986fdd5fe800975c3f88db / build 2026.11.04-engineer-kit-guide / protocol 54. The current 54 Soldier nodes remain in General. Service Pistol, Watch Carbine, Threefold Rifle and Last Watch retain their issued equipment IDs and investments. Mara Rook is the current lead, a recent discipline entrant; other people can practise Soldier. No portrait, sprite, story event or Campaign learning/proof is changed here.

Q Rally Field is a fixed 6-second / 170-radius field on 16-second recovery, with 20% weapon potency and 10% movement. E Precision Burst fires three actual piercing rounds on 9-second recovery; 45 base total damage. Last Roll Call refills nearby magazines, clears nearby hostile projectiles once and creates an 8-second rally on 80-second recovery. Existing shared caps and difficulty rules remain authoritative.

Three issued General transformations already change behavior and keep their actual purchase/ownership:

| Issued node / transformation | Actual behavior that a new route must preserve |
| --- | --- |
| soldier-command-3 / breach-cadence | E fires at 0 / 0.12 / 0.24 seconds, using the committed aim and the owner's current position for each shot. |
| soldier-command-path-1-3 / supply-line | Ultimate rally potency is multiplied by 5/7; a second magazine refill occurs halfway through its original fixed field lifetime. |
| soldier-command-path-2-3 / marching-colors | Q rally follows its owner with 75% of its original radius. |

The machine-readable inventory is reviews/engineer-controls-2026-11-04/soldier-source-audit.json. A delayed burst, moving rally or extra ultimate refill is already owned behavior; give any new related technique an additional purpose, with no duplicate payment. The source audit is not acceptance of balance or of the proposed new designs.

## Three working identities

| Proposed route | Distinct decisions to develop | Qualitative growth to explore | Boundaries |
| --- | --- | --- | --- |
| Skirmisher | Choose a firing opening and a legal movement commitment tied to the burst; decide whether to press or break contact. | A constrained follow-through, an internal commitment fork, then a separately earned action and a late combination of fire/movement. | Preserve every actual E round and the issued committed-aim cadence. Do not resell Sprint/Double Dash, add free invulnerability, cross cover or make it an Assassin teleport. |
| Squad Command | Place a rally, choose when to issue a readable order and commit a bounded coordinated firing window. | Distinct offensive/withdrawal orders, an earned command action, then a deliberate late sequence. | Meaningful solo and co-op; other players retain input/control. Avoid duplicating Marching Colors, stacking permanent rally bonuses, fabricated teammates or hidden boss-script cancellation. |
| Field Logistics | Commit finite ammunition support at a place/time where somebody can actually use it; choose reserve versus delivery. | Closed stock, a work/handling fork, an earned delivery action and a late resupply operation. | No coins/SP/health/shield farming, unlimited stock, duplicate Supply Line purchase or mandatory idle teammates. The existing finite ultimate refill remains useful. |

These are decision briefs, not approved final ability definitions. The first runtime slice must settle exact inputs, geometry, timers, stock and a concrete tradeoff before source admission. Begin with a small real comparison; extend one route at a time rather than build 24 generic numerical nodes. A fourth route is optional only if a distinct loop earns its place.

## Scope of the first functional slice

1. Choose the earliest useful Soldier action change after checking the issued transformations above. Demonstrate the behavioral difference at a legal early budget, including a failed/cancelled commitment; do not require a capstone to make the route work.
2. Keep 54 General nodes/four shared techniques separate. Reuse the authored graph/inspector/reading view, real prerequisite/exclusion navigation, 20–200% Specializations zoom and explicit remapped controls. Show only implemented relationships. Extend the paper/ink/brass equipment language with restrained original emblems once mechanics are stable; do not replace character art during this class slice.
3. Preserve 27 SP, one capstone, existing prices/IDs/equipment/balances and strict server-owned proof. Full routes need real internal alternatives and meaningful opportunity cost, adding acquired actions and qualitative D- through SS+ growth instead of filling every grade with percentages. Exact new prices/gates remain to be selected and tested.
4. Add shared authority/controller behavior before presentation claims. Solo and rooms use the same actual simulation; ownership, visible warnings, full terrain/cover geometry, interruptions, owner loss, phase transitions and paused host exit need checks appropriate to the mechanic. Do not tune the game merely to make an autonomous policy win.
5. Next content migration must admit issued protocol 54 / content d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510 before the early old-Builder guard. Its whitelist includes 22 Engineer / four General techniques and no new Soldier nodes. Preserve older 53 / 52 / 51 edition whitelists separately; imported Practice never becomes online proof.
6. Run focused/full/exact-source CI and fresh matching reviews for an actual runtime change. Record human/rendered/device/native-language/listening/motion/final-balance acceptance separately. Campaign remains slow learned/proven/prepared, no SP or mutations, last in the roadmap. No Soldier Campaign acquisition or new story prose belongs to this first Free Play slice.

Shop purchases follow the user's meaning rule: useful statistics support handling, actions, commitments and utility; do not rename numbers into a specialization. The per-weapon workshop, stars, sequential buying and shop redesign remain separately queued. The full game and human acceptance remain unfinished; only the user decides when it is finished.
