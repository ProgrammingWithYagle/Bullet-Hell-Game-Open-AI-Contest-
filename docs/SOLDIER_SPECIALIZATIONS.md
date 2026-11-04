# Soldier specializations — first Skirmisher slice

**Current development:** source **ef502f7c291525bcc3f2464aa976e73a0271383b**, build **2026.11.04-soldier-skirmisher-step**, protocol **55**, passes **1,419 tests** and all jobs/steps in [exact-source push CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41777408139) / [PR CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41777425252). New testing [5338](http://127.0.0.1:5338/)/2714 and public-interface [5339](http://127.0.0.1:5339/)/2715 reviews bind **2,014 files** and pass four native groups each. Soldier now has an early Skirmisher action/fork: Passing Shot, Crossing Advance and Rear Guard. These are three techniques within one unfinished specialization, not three completed Soldier pathways. Later Skirmisher actions/evolutions, Squad Command and Field Logistics remain next in the same single-class focus. General/Engineer identities and issued ownership remain; human/rendered/device/native-language/listening/motion/final-balance acceptance stays open.

This continues the Free Play class focus after Engineer's scoped reference review. Soldier is unfinished. Develop this class's later kit and other two routes before Heavy; do not expose empty proposed cards or mass-generate the remaining classes. The shop overhaul and Campaign stay in their later roadmap phases.

## Actual early decisions

| Purchase | Access / cost | New decision |
| --- | --- | --- |
| Passing Shot | D-, 2 SP after issued 1-SP Clean Bore | A real Precision Burst opens 1.2 seconds to use acquired action 1 while holding movement. Commit a legal 90-pixel step over 0.3 seconds, then fire a separate 15-base-damage piercing round along the committed aim. Choose a direction that fits the next firing window. |
| Crossing Advance | D, 2 SP, 5 earned SP, after Passing Shot | Commit forward along your starting aim. Split the same follow-up damage between departure and arrival; aim the arrival shot again while your route stays fixed. Excludes Rear Guard. |
| Rear Guard | D, 2 SP, 5 earned SP, after Passing Shot | Commit backward from starting aim. Fire the same follow-up damage halfway through and intercept at most one visible hostile projectile in the short forward lane. Excludes Crossing Advance. |

Action 1 uses the existing remappable input, default keyboard C. Its base recovery is six seconds. It is separate from the original E burst, Q rally and ultimate; the owned HUD shows the finite opening and the manual shows actual current keyboard/alternate/gamepad controls. No new action appears merely because a player inspects its node.

There is no dodge immunity, shield, healing, currency/SP generation, ammunition refill, extra dodge charge, terrain bypass or automatic target damage. Original E still fires its actual three rounds. The follow-up is an ability projectile, not a magazine refill. Passing Shot retains freer movement direction; the two forks gain a different firing/guard operation while committing forward/backward movement. Neither fork increases total base follow-up damage. The player still chooses whether the commitment is safe.

## Physical commitment and ownership

Authority checks the whole body path against cover, bounds and lava before spending the opening or recovery. Invalid ground and a directionless base request spend nothing. A committed step moves the actual body before the shared projectile/body sweep. Other projectiles, contact, fixed warnings and hazards can still hurt it. Rear Guard's single interception requires line of sight and uses a 96-pixel / radius-12 lane; it does not erase a boss field or an entire volley. The short route and guard lane have restrained public cues; no damage/private motion bookkeeping is broadcast.

Dodge, new obstruction, hostile slow/displacement, downing, disconnect, phase exit or host end cancels unfinished work without refund or an arrival-shot guarantee. Motion never snaps through a new wall or restores health/life/resources. Pause freezes the real commitment; paused input is discarded in the optimized Solo workers. Ordinary movement outside this action keeps its original arithmetic and collision behavior.

## Preserve the issued Soldier and General

All 54 Soldier General nodes remain, along with the four shared techniques. Service Pistol, Watch Carbine, Threefold Rifle and Last Watch retain their issued IDs/investment. Mara Rook remains the lead; Soldier is a shared discipline, and this Free Play slice adds no story event or Campaign proof. No character portrait or survivor sprite was replaced.

Q Rally Field keeps its issued fixed field and recovery; E Precision Burst keeps three actual piercing rounds; Last Roll Call keeps its finite magazine refills/projectile clear/rally. These General transformations retain their original purchases and behavior:

| Issued node / transformation | Preserved behavior |
| --- | --- |
| soldier-command-3 / breach-cadence | Three E rounds at 0 / 0.12 / 0.24 seconds, committed aim, current owner position for each shot. |
| soldier-command-path-1-3 / supply-line | Ultimate rally potency multiplied by 5/7; a second magazine refill halfway through its original fixed field lifetime. |
| soldier-command-path-2-3 / marching-colors | Q rally follows its owner with 75% of its original radius. |

The early fork supplements these operations rather than charging again for them. The 27-SP budget and one-capstone limit remain. The full catalog retains all 648 issued class nodes, 36 transformations, 48 weapons and 22 Engineer techniques; total dedicated specialization techniques are now 25. A complete Soldier late build is not claimed.

## Tree, art and local preservation

The early Soldier region has an authored curved split, its actual General reference, exclusion navigation, matching reading view and 20%–200% Specializations zoom/Fit. Empty proposed pathways are absent. The initially closed owned-kit guide, remapped inspector and guarded purchase button reuse the field manual's paper/ink/brass language. Three original boot/carbine/bracer emblems have exact generated alpha, retained prompts and native/small-size inspection in assets/production/ui/soldier-tree-2026-11-04/provenance.json. Built-in image_gen was used; selected native PNGs were copied byte-for-byte. No pixel edits or character-art replacement. The original finite 0.24-second footwork cue has waveform bounds; listening remains open. Eighteen new keys per locale are explicit English pilot text, not completed translations.

Protocol 55 / content da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6 explicitly admits issued protocol54/contentd7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510 local boundaries before the old-Builder guard, with its exact 22-Engineer whitelist and no invented Soldier techniques. Profiles retain all twelve disciplines, both HUD layouts, controls and local history. Practice records keep their original protocol/content labels and cannot become verified online proof. Wrong revision/protocol pairs, foreign/verified claims and forged new ownership remain rejected. Earlier migration whitelists stay separate.

Next content change must deliberately admit this issued55/da03a130 edition with 25 techniques, before old-Builder guards, while keeping older54/d7aea7 at its issued22 and older53/52/51 at their existing14/8/8. Current checkpoints restore owned skills, not unfinished motion/windows. Server version/signature ownership remains strict.

## Verification and its limits

The final full gate passes 1,419 tests, TypeScript, authored content/locales/story, 144 early-Campaign cases, production build and 71 encounter / 300 survivor / 60 companion atlas contracts. Full-gate01's stale analytical report was recomputed without gameplay tuning. Full-gate02 exposed 32 pinned live-protocol expectations and six obsolete Engineer-only catalog/UI assumptions. Their real historical edition fixtures remain; current expectations now match55 and Engineer tests scope their own nodes. Two new red regressions reproduced the missing issued54 profile/history admission; the corrected affected group passes59. Initial fixture/typecheck errors and all raw attempts are retained and labeled in the scope README. None is represented as an older public-game defect.

Fresh testing5338/2714 and public-interface5339/2715 each bind2,014files and pass four native groups: source-bound MenuDOM/real3SPpurchase/remappedguide with served main/CSS/locale/art hashes; the full exact HTTP-served optimized Solo worker for all three commitments; real mixed-class peers with pause/non-host rejection/late observation/host exit; and base HTTP/transport. The first probe incorrectly expected English text in main JS; the copy is correctly in its hashed locale chunk, and that probe-only assumption was fixed without changing source. MenuDOM is a subset fixture, not full browser-main execution or a renderer/layout engine. Worker fork cases use labeled controlled legal boundaries. Thirty-two preceding exact live client/backend identities and21olderfrozenroots remain; no cleanup or private upload.

| Short / Normal / seed2209 / fixed Gatehouse policy | Natural result | Observed steps | SP earned / spent | Safe restores / measured match |
| --- | --- | ---: | --- | --- |
| Passing Shot + issued General support | 5 clears / victory, 130.300 seconds | 13 | 27 / 27 | 18 / yes |
| Crossing Advance + issued General support | 5 clears / victory, 209.033 seconds | 23 | 27 / 27 | 18 / yes |
| Rear Guard + issued General support | 4 clears / defeat at fifth, 125.600 seconds | 14 | 27 / 27 | 17 / yes |

These six native trials use actual inputs, health/enemy damage, natural rewards/purchases and intermission clocks, with no resource injection, forced completion, deadline edit, invulnerability or score upload. The two wins and one loss remain intact. One policy/map/seed cannot rank the choices, prove fun/fairness or replace human final balance. Each restored counterpart matches measured actions, timing, purchases, damage and outcome. Earlier pre-profile-fix runtime reports stay separate in the chat; current reports are bound to this exact source runtime. See reviews/soldier-skirmisher-2026-11-04/source-verification.json and natural-combat-*.json.

## Continue this one class

1. Develop Skirmisher's next meaningful middle/later capability, with real internal alternatives, another earned action where it earns its input, and a qualitative high-grade culmination. Do not fill grades with renamed percentages or inflate27SP to buy everything.
2. Then implement Squad Command as owned readable rally/orders with useful solo and co-op decisions, preserving Marching Colors and other players' control.
3. Then implement Field Logistics around finite ammunition support, placement/time/stock decisions and useful solo operation, preserving Supply Line. No resource farming, compulsory idle teammates or duplicate paid benefit.
4. Compare whole legal Soldier runs/replays and maintain exact-source network/save evidence before moving to Heavy. Human enjoyment, rendered/device/native-language/listening/motion/final-balance acceptance stays separate.

The other two route names/mechanics are working proposals, not implemented or final. A fourth route is optional only if it adds a distinct decision loop. Campaign stays last and slow learned/proven/prepared, with scarce resources, no SP/mutations or rapidSS+promotion. Service Yard remains its checked unregistered4pass/1failWIP, outside1,419tests. Base-story prose remains5,741checkedEnglishwords toward five million; no complete personal arc exists.

Every shop purchase must have meaning, with useful statistics supporting actions, handling, utility or commitments and no duplicate owned benefit. The per-weapon workshop, stars, sequential buying and shop redesign stay separately queued. Only the user decides when the full game is finished.
