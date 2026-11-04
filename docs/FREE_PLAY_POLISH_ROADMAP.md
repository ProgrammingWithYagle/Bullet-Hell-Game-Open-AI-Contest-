# Grave Accord — Free Play polish roadmap

Updated 2026-11-03. This is the active development order requested by the user. It supersedes earlier recommendations to continue Campaign/Service Yard next and any stale priority text in the completion ledger. It records work to do, without awarding completion credit.

Finish one coherent area before opening the next. Use the public-release-era game's clarity and restraint as a quality reference; preserve later useful work while resolving regressions in the area being polished. Do not roll back the checkout or assume the old public deployment proves current behavior.

## Sequence

| Order | Focus | Concrete result needed before the next focus |
| --- | --- | --- |
| 1 — active | Class-tree structure and Engineer reference | Separate General and Specializations; build an honest, readable specialization graph; finish Engineer's three distinct pathways and their internal choices; verify the full build loop. |
| 2 | Remaining classes, individually | Bring each class through the same quality checklist, with at least three distinctive specializations. Do not release eleven sets of placeholder cards at once. |
| 3 | Class balance and Free Play build variety | Compare complete legal builds across classes, weapons, mutations, difficulties, solo and co-op. Resolve dominant combinations, weak support paths and unclear interactions. |
| 4 | Existing bosses, individually | Polish tells, movement, phases, hit rules, arenas, audio and difficulty identities. Work from early encounters toward late and secret encounters; do not start a second boss while the first has known major defects. |
| 5 | The rest of Free Play | Finish the surrounding run loop: menus, objectives, rewards, pacing, readability, controls, networking, saves, performance and presentation. Address shared defects earlier when they block the current class or boss. |
| 6 | Remaining Free Play breadth, one finished unit at a time | Consider additional encounters/objectives only after the existing game is coherent. The larger ordinary-boss target remains scope, rather than a reason to add 85 unfinished encounters now. |
| 7 — last | Campaign and its full ensemble world | Resume multi-chapter history and Service Yard, then sustained main-story development, optional arcs for all twelve leads, human antagonists, civilian lives and story-specific acquisition. Preserve the five-million-English-word base-story ambition and its exclusions. |

There are no invented dates or promises of final balance. Automated checks establish specific contracts; human enjoyment and final acceptance remain separate. A known major defect keeps the current item open. When human/rendered/device/language/listening/motion review is unavailable, record that limit and continue useful work within the current item. Do not claim that the user has accepted it.

## First focus: finish the class system through Engineer

Current playable source **d3de8edfd00375880a4c07eae658a0ea77ac8486**, build **2026.11.03-engineer-builder**, protocol **54**, passes **1,370tests** and exact push/PR CI with every job/step. Testing[5328](http://127.0.0.1:5328/)/2704 and public[5329](http://127.0.0.1:5329/)/2705pass eight native groups each, with2,011hashed files per audience. [ENGINEER_BUILDER.md](ENGINEER_BUILDER.md) records the third route and limits. Engineer has22real specialization techniques across Machinery, Traps and Builder. Whole seeded run/replay assessment and separate human acceptance remain open; other class rosters remain proposals. A controlled12-row entry comparison demonstrates real firing, prepared damage and cooperative cover; natural progression, legal late builds, optimized workers and real peers have separate focused evidence. It is not a completed whole-run human assessment. The historical slices below establish provenance, not current totals.

First runtime slice: [CLASS_TREE_POLISH.md](CLASS_TREE_POLISH.md), build2026.11.02-class-tree-polish/protocol50, implements the General/Specializations separation and fixes the reproduced sentry-aiming fault. Its full local gate passes1,272tests. The newer [Machinery slice](ENGINEER_MACHINERY.md), build2026.11.03-machinery-progression/protocol51, adds its real control fork, earned fourth/fifth actions, late evolutions, painted emblems and an authored field manual. Its final local gate passes1,296tests. At that dated checkpoint Engineer still needed complete Traps/a third route. Current order1 remains active for the whole Engineer run/replay assessment and separate human acceptance.

Engineer now has three mutually exclusive Q entries—Carriage Sentry, Pressure Charges and Field Screen—and22actual techniques. General remains separate. The deliverables below are sequential; steps1–4have scoped implementation evidence, while step5and full human acceptance remain open:

1. **Finish the research and design.** Audit current choices and ownership, study developer examples, specify General/Specializations separation and a genuine graph. See [the research and design](SKILL_TREE_RESEARCH.md). This document and that brief are planning work; they do not change the game.
2. **Separate the screens safely.** General contains the existing numerical class foundations and shared mobility. Specializations gets a dedicated tree and inspector. Retain every issued ID, price, prerequisite and owned effect. Audit the existing functional transformations before moving their presentation; each has one authoritative purchase. Campaign's current training screen remains its own slow-acquisition view.
3. **Polish the existing Engineer comparison.** Check moving aim, relocation, cover, placement, warning visibility, input feedback, timing, targets and existing transformations. Reproduce suspected faults before fixing them. A stationary fixed-aim damage sample cannot establish moving combat quality.
4. **Complete Engineer, one pathway at a time.** Refine Machinery, then Traps, then **Builder**, the user's barrier/construction identity in place of the earlier tentative Field Works name. Build functional internal forks and useful late choices; introduce a cross-path interaction only when its prerequisites and tradeoff work. Test each before adding the next. Exact proposed mechanics remain editable.
5. **Verify the complete Engineer run.** Buy, inspect, fight, earn, choose, combine, pause, restore, finish and replay at the same seed/difficulty. Compare early, middle and late legal builds without raising the 27-SP budget or one-capstone limit to buy everything. Provide a fresh exact-source review build when the slice is ready.

No new Campaign chapter, class roster, boss roster or broad art replacement is part of this focus. Preserve the Service Yard WIP unchanged. This is a change in development order, not abandonment of those goals.

## Class queue and three proposed specializations each

Every row below is a design target, not a claim of implemented content. Three strong pathways are the minimum. A fourth belongs only where it adds a different decision loop; it is not filler to make the table larger. Each path needs internal choices, rather than one new ability card. Later progression must expand the usable kit and qualitatively evolve its abilities; numerical foundations remain in General.

| Queue | Class | Three pathway concepts | Decisions that must differ |
| --- | --- | --- | --- |
| 1 | Engineer | Machinery / Traps / Builder | Three implemented identities: move/commit machines, prepare/coordinate charges, and shape/maintain finite cover. Each has internal choices, acquired actions and late qualitative behavior. Whole run/replay and separate human acceptance remain open. |
| 2 | Soldier | Skirmisher / Squad Command / Field Logistics | Move between firing windows; coordinate owned rally windows that also work solo; choose where and when to commit limited ammunition support. |
| 3 | Heavy | Siege Gunner / Suppressor / Armored Anchor | Commit a firing lane; deny approaches through sustained fire; hold an operating position with a real mobility cost. |
| 4 | Tank | Mobile Bulwark / Interceptor / Bastion | Escort while moving; deliberately intercept legal threats; establish a temporary held position. Fixed boss threats and difficulty restrictions stay authoritative. |
| 5 | Medic | Field Surgery / Rapid Response / Preventive Care | Commit to a treatment window; reach a rescue without ignoring terrain; time limited advance protection. No injury farming or universal cures. |
| 6 | Mage | Binding / Spatial Craft / Volatile Spellwork | Maintain an owned control pattern; plan legal positions and returns; prime and resolve risky spell interactions. Control never silently disables boss scripts. |
| 7 | Assassin | Duelist / Infiltrator / Mark Hunter | Commit to a single-target opening; earn a repositioning opportunity; select and pursue a priority target. Concealment is not passive hazard immunity. |
| 8 | Bard | Conductor / Lament / Misdirection | Choose performance windows; sustain a costly influence; place fragile deception. Useful solo, with no compulsory rhythm test or copied Fool abilities. |
| 9 | Swordsman | Measured Stance / Counterstroke / Flowing Pursuit | Hold a committed stance; answer a limited eligible threat; chain movement and strikes. Distinct from Tank protection and Assassin concealment. |
| 10 | Summoner | Cohort Commander / Bonded Companion / Formation Keeper | Direct several finite units; invest in fewer stronger bonds; arrange a maintained formation. Ownership, loss and cleanup matter. |
| 11 | Ranger | Marksman / Tracker / Field Controller | Plan a patient shot; gather and use target information; maintain stakes and cables. Fieldcraft must differ from Engineer explosives and machinery. |
| 12 | Alchemist | Reactive Mixtures / Prepared Compounds / Restorative Practice | Time owned combinations; commit finite recipe stock in advance; deliver carefully bounded care through physical mixtures. Retain real ingredient costs and landings. |

The order settles a durable reference before the five newer classes. A shared blocker may be fixed where it is found; that does not open a parallel feature stream. No broad generated implementation sketch is a substitute for completing these rows individually.

## What counts as a polished class slice

- **Identity:** each specialization changes positioning, timing, target selection, resource commitment or ability behavior early enough to use during a run. Numerical support belongs in General. Existing useful transformations retain their purpose.
- **Tree:** visible forks represent real alternatives; prerequisite lines match authority; exclusions and legal hybrids are explained before spending; grades D- through SS+ retain meaning without requiring repetitive nodes at every grade.
- **Combat:** solo and co-op usefulness, ordinary objectives and representative early/middle/late bosses; finite effects, terrain, fixed-threat rules, death/disconnect cleanup and owner isolation. No path may require a cooperative exploit to function.
- **Interaction:** readable selection and purchase feedback, consistent HUD names, bounded inputs, keyboard/touch inspection and a usable compact view. Buying is explicit; looking at a node does not buy it.
- **Compatibility:** all648issued class-node IDs, four General IDs and issued Engineer IDs remain deliberate. Old local saves and profiles migrate without invented ownership. Online proof and checkpoints remain server-owned and version checked.
- **Presentation:** portrait, selection art, gameplay silhouette, equipment, VFX and sound communicate the same class. Review them together. Preserve faces, colors and recognizable silhouettes; do not solve inconsistency by batch-regenerating the first seven classes.
- **Evidence:** focused meaningful tests, appropriate full gate, exact-source CI and matching native/network review evidence. Record human/rendered/device/native-language/listening/motion/final-balance limits separately.

## Art direction during class polish

The inspected portraits vary in line weight, anatomy, saturation and rendering. Engineer is cleaner, brighter and more cartoon-like; Bard/Ranger are softer and more painted. Soldier also differs from Engineer within the original seven, so the mismatch is broader than a single seven-versus-five split. This is a visual judgment from inspected local assets, not a claim of player consensus.

The recommended shared direction is the newer classes' grounded painted treatment, retaining readable silhouettes and class colors. Establish scale, outline, light, palette and detail rules on the current class before replacing assets. Any actual replacement needs provenance, animation compatibility and local image inspection. A published style guide and one coherent class are more useful than twelve simultaneous partial redraws. No replacement art is included in this roadmap.

## Campaign remains the final phase

Campaign stays slow learned/proven/prepared progression, with scarce resources, no SP and no mutations. Free Play keeps rapid SP, mutations and customization. Both use shared actual techniques and simulation; acquisition differs. Future class lessons require authored situations and owned demonstrations, rather than dialogue-only promotion. Extra early choices must not accelerate new entrants to SS+ in a few chapters.

Current base-story prose remains 5,741 checked English words; all twelve personal arcs remain unfinished. The five-million-word target excludes optional routes, letters, personal chapters, UI and translations. No transport, repair, transfer, consent or healing is assumed to have occurred. Service Yard/Porch Watch remains the checked restorable patch, originally four passes and one failure, outside active source and the 1,265-test baseline.

## Starting evidence and working constraints

Starting playable source for this roadmap: `ab8e4b37b65c9dee32c95dfb643207009c590674`, build `2026.11.02-engineer-pathways`, protocol 49; 1,265 passing tests and exact-source CI run 41564738365. Metadata HEAD at the research audit: `74163e18c46ef523ee8b174fa0b11e17dac5fbec`, clean checkout and live CI run 41566073872, all jobs/steps successful. The research/planning commit is not a newer playable feature.

Use the same checkout, `feat/first-playable-loop` and draft PR14. Every Git invocation uses `git -c core.bare=false`. Keep older previews/private SQLite files intact. Browser automation and subagents remain disabled. Feature-branch pushes and draft-PR metadata updates are authorized; main merge, production/Windows replacement, capacity purchase and private-database upload are not. The whole game remains unfinished, and only the user decides when it is complete.

## New tree feedback and queued workshop — 2026-11-03

The user found the Engineer specialization tree much better and asked for the same care in General, a shared-abilities subtab beside the class branches, more meaningful shared techniques, wider zoom and removal of odd title backplates. See GENERAL_WORKBOOK.md for the actual current slice and its verification limits. The two original General purchases remain; the new two are behavioral dodge controls rather than numerical filler.

Engineer now has developed Machinery, Traps and Builder routes with22actual techniques. Builder focuses on finite cover geometry, committed repair, folding/repositioning and linked fortification. More meaningful variety remains a design goal, while the current next step is the whole seeded Engineer run/replay assessment. Continue one class at a time, with no empty proposed pathway cards or mass-generated numerical nodes.

The user separately queued the per-weapon workshop/shop overhaul in ARMORY_REWORK_IDEAS.md and explicitly said to do it later while continuing the current work. It includes weapon-specific upgrades, one-to-five stars, sequential fully developed predecessors, a broader D-–SS+ roster and distinctive abilities. Audit overlap between coin upgrades and General before changing their economies. Every shop purchase needs meaning; statistical support is useful, but must not become the whole shop. No weapon work is credited by recording the request. Free Play classes remain the active focus, followed by bosses and remaining Free Play work, with Campaign last.
