# Soldier specializations — Skirmisher development

**Current development:** source **84b6bbad3cc0a759a456cf20af2298c3b4c7a751**, build **2026.11.04-soldier-roving-load**, protocol **56**, passes **1,442 tests** and all jobs/steps in [exact-source push CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41784089595) / [PR CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41784107578). Fresh testing [5340](http://127.0.0.1:5340/)/2716 and public-interface [5341](http://127.0.0.1:5341/)/2717 each bind **2,016 files** and pass four native groups. Soldier adds Cartridge Drill and Roving Chamber to the issued early fork: five techniques within one unfinished Skirmisher region, not three completed routes. Its high-grade culmination, Squad Command and Field Logistics remain in the same single-class focus. Human/rendered/device/native-language/listening/motion/final-balance acceptance stays open; the shop and Campaign remain later.

Soldier is the current single Free Play focus. Five techniques occupy one early and middle Skirmisher region; they are not three completed specializations. Finish its meaningful later culmination and internal alternatives, then develop Squad Command and Field Logistics individually before Heavy. Those future names/mechanics remain proposals. General foundations stay separate; the weapon workshop and Campaign remain later.

## Actual choices

| Technique | Access and cost | What changes |
| --- | --- | --- |
| Passing Shot | D-, 2 SP after issued 1-SP Clean Bore | Real Precision Burst opens 1.2 seconds for action 1. Hold movement to commit a legal 90-pixel step over 0.3 seconds, then fire a separate 15-base-damage piercing round along the committed aim. Base recovery: 6 seconds. |
| Crossing Advance | D, 2 SP, 5 earned SP, after Passing Shot | Commit forward along starting aim. Split the same follow-up damage between departure and arrival, aiming again for the arrival round. Excludes Rear Guard. |
| Rear Guard | D, 2 SP, 5 earned SP, after Passing Shot | Commit backward from starting aim. Fire halfway through and intercept at most one visible hostile projectile in a 96-pixel / radius-12 forward lane. Cover blocks interception. Excludes Crossing Advance. |
| Cartridge Drill | B-, 3 SP, 11 earned SP, after Passing Shot | Earn action 2: load up to four missing rounds individually while walking. Stop when enough rounds are ready and return to firing. Base recovery: 12 seconds. |
| Roving Chamber | A-, 3 SP, 17 earned SP, after Cartridge Drill | Keep the same finite drill running through a fresh burst and any owned step variant. Coordinate three actions while choosing when to stop loading. Round count, loading times and recovery remain the same. |

The shared 27-SP budget and one-capstone limit remain. These options compete with useful General support; adding choices does not enlarge the budget. In the recorded Short run, Drill was legally acquired for the third fight at 15 earned SP and Roving for the fourth at 21. No Campaign promotion or learning event is implied by a Free Play grade gate.

## Finite loading beside ordinary Reload

Action 2 defaults to B and remains remappable. The first round takes 35% of the current weapon's ordinary modified full-reload time; each later round takes 20%. The authority fixes those intervals when starting. At most four missing rounds can be inserted, and the magazine cannot overflow. Ordinary Reload remains the full-magazine operation; it also already permits movement and ability use. Drill's useful distinction is getting a few rounds sooner and stopping with completed work retained.

Held primary fire waits during Drill and resumes when it ends or the player stops it. Pressing action 2 again stops work even during its recovery, with no extra charge or refund. Starting Drill during ordinary Reload forfeits its unfinished work; elapsed full-reload time cannot become instant cartridges. Simultaneous manual Reload and action 2 selects the full reload. Sprint is gated during Drill like ordinary reloading; walking remains real.

A fresh Precision Burst or successful Passing Shot commitment interrupts the base Drill. A rejected step preserves loading. Roving Chamber permits these burst/step combinations without extra rounds, faster timers or immunity. Both versions still stop for dodge, ordinary Reload, positive health loss, weapon/ownership loss, disconnect, downing or phase exit. Fully absorbed shield hits do not erase loading. Actual full-magazine refills, including Last Roll Call, end the work. Completed rounds remain after interruption; unfinished rounds do not restore or refund recovery.

All timers use the shared fixed combat clock. Pause freezes work and discards paused input in Solo. Cleanup now clears unfinished Soldier windows/motion/loading while retaining both acquired actions' spent recovery for rostered disconnected/downed owners. A red regression demonstrates the previous recovery reset; phase cleanup remains explicit. This corrects a real issued Passing Shot edge case as well as protecting the new action.

## Physical commitment and preserved identity

The three step techniques keep their full-body checks against bounds, cover and crossed lava. Invalid ground spends neither opening nor recovery. The real body moves before projectile sweeps. Dodge, new cover, hostile slow/displacement or owner loss cancels unfinished travel without a guaranteed arrival shot. Other projectiles, contact and fixed hazards remain dangerous; Rear Guard removes at most one visible projectile, not a volley or boss field. No step grants dodge immunity, healing, shield, currency, SP or extra dodge charges.

All 54 issued Soldier General nodes, four shared techniques, four weapons and their IDs/investment remain. Mara Rook remains the lead; Soldier remains a shared discipline. Original Q Rally Field, E Precision Burst and Last Roll Call keep their jobs. Breach Cadence still delivers three E rounds at 0 / 0.12 / 0.24 seconds from the moving owner's actual position; Supply Line retains its bounded second magazine refill and 5/7 rally potency; Marching Colors retains its following Q field at 75% radius. The new purchases do not sell those owned operations again.

The catalog preserves all 648 issued class nodes, 36 transformations, 48 weapons, class/story definitions and 25 earlier specialization definitions. Dedicated specialization total: 27, comprising 22 Engineer and five Soldier techniques. A complete late Soldier kit is not claimed.

## Tree, controls, art and local ownership

The authored region extends its early curved fork with a central loading path and later coordination evolution. It retains the General prerequisite, actual exclusion navigation, equivalent reading view, guarded purchase button and 20%–200% zoom/Fit. Inspecting does not buy; no empty proposed routes appear. The initially closed owned-kit guide and HUD reveal action 2 only after purchase, show current keyboard/alternate/gamepad controls, and use authoritative round progress and next-round time. Stop stays available during recovery. Public cues show a restrained timing arc and up to four cartridge pips attached to the actual owner; private weapon/interval bookkeeping is omitted.

Two new painted wallet/breech emblems match the existing leather, walnut, iron and brass finish. All five exact PNGs and prompts are in assets/production/ui/soldier-tree-2026-11-04/provenance.json. The three issued files and their provenance entries remain exact. Built-in image_gen produced genuine alpha; selected source pixels were copied byte-for-byte. Native transparency and small-size diagnostics passed; no portrait or survivor sprite changed. Two finite original loading cues extend the unchanged footwork waveform. Listening remains open. Nine new keys per locale are explicit English pilot copy, alongside the earlier eighteen; this is not completed translation.

Protocol 56 / content 833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd deliberately admits exact issued55/da03a130 local safe boundaries with its 25-technique whitelist before older Builder guards. It cannot invent these two new techniques. Profiles retain twelve class labels, both HUD layouts, controls and historical records; Practice keeps its original protocol/content labels and cannot become online proof. Earlier54/d7aea7 remains at22,53/2bcf8d at14,51/52 at8. Wrong editions, foreign/verified claims and forged ownership remain rejected; server signature/version/ownership stays strict. Unfinished windows, movement and loading do not restore.

The next content change must explicitly admit this issued56/833b5a88 edition with its 27-technique whitelist while keeping earlier editions bounded.

## Verification and limits

Final full-gate02 passes 1,442 tests, TypeScript, content/locales/story, 144 early-Campaign feasibility cases, production build and 71 encounter / 300 survivor / 60 companion atlas contracts. Gate01 also passed; final change-note wording then changed the runtime hash, so gate02 and v2 natural/replay reports bind the final source. Initial staging/type/fixture failures, the real owner-loss regression and all raw attempts remain labeled in reviews/soldier-reload-2026-11-04. No source changed while a gate was running. Analytical witnesses were recomputed without gameplay tuning; their numerical model excludes specialization ability use.

Each fresh audience binds 2,016 files and passes four native groups: source-bound MenuDOM guide with ordinary Raid 12-SP purchases/remapped fifth action/served main, CSS, English facade/body and five emblem hashes; full exact-served optimized Solo worker across four loading cases; actual mixed-class peers with pause, non-host rejection, late observation, owner stop and host exit; base HTTP/transport. The first guide probe selected the English export facade as the message body; following and hashing both chunks corrected the harness without changing game source. Later worker evolution/fork cases use controlled legal endless safe boundaries, separately from natural runs. MenuDOM is a subset fixture, not full browser-main or rendering/layout acceptance.

| Normal / seed2209 / fixed Gatehouse policy | Clears | Seconds | Steps | Loading operations / inserted rounds | SP earned / spent | Matching safe restores |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Ordinary full reload + issued General support | 5 | 130.300 | 13 | 0 / 0 | 27 / 27 | 18 |
| Cartridge Drill + issued General support | 5 | 151.100 | 16 | 9 / 16 | 27 / 27 | 18 |
| Roving Chamber + issued General support | 5 | 158.867 | 18 | 10 / 18 | 27 / 27 | 18 |

These six native runs use actual inputs, damage, rewards, legal purchases and intermission clocks. There is no resource/health injection, forced completion, deadline edit, invulnerability or score upload. Replays match measured actions, timing, purchases, damage and outcome. Full reload is faster under this policy. One map/seed/policy cannot rank choices, prove enjoyment or settle final balance. No human/rendered/device/native-language/listening/motion/final-balance acceptance is claimed. Both current roots/backend and 23 preceding roots retain verified hashes; four current and 36 preceding exact live client/backend identities were checked. No cleanup or private upload occurred.

## Continue this one class

Finish the current late Skirmisher candidate and its verification, then compare the expanded [Soldier route candidates](SOLDIER_ROUTE_CANDIDATES.md): Foot Soldier, Marksman, Sniper, Hunter, Officer/Command, Grenadier and Field Support/Logistics. There is no fixed maximum; keep useful routes distinct and develop one at a time. Marksman versus Sniper is the next proposed comparison. Preserve issued rally/resupply transformations and useful solo/co-op decisions. Compare whole legal Soldier runs and saves before moving to Heavy. Future route names/mechanics remain proposals. Only the user decides when the full game is finished.

Every shop purchase still needs a clear role, with useful statistics supporting handling, actions, utility or commitments and no duplicate owned benefit. The per-weapon workshop, stars, sequential buying and shop redesign remain queued. Campaign remains last, slow learned/proven/prepared, with scarce resources, no SP/mutations and no fast SS+ promotion. Service Yard remains its checked unregistered 4-pass/1-fail WIP outside 1,442 tests. Base-story prose remains 5,741 checked English words toward five million; no complete personal arc exists.
