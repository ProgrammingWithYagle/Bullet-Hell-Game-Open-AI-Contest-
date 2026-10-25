# Skill trees and expedition interface

Implemented source revision 0.3.0. The current playable subset is Soldier and Medic, Gatehouse and Hollow Constable. Other classes, routes and arenas can be inspected with an explicit In production label; they cannot silently launch a substitute encounter.

The field guide appears on the first visit and supports Skip, Back, Next, Escape and replay. It introduces movement/dodging, combat warnings, rescue/ultimates and shopping. It is an illustrated onboarding guide; a playable training encounter is not implemented yet.

New-run setup has distinct class, route, map, difficulty and confirmation pages. Class pages show survivor art, role, biography, health, speed and ability descriptions/cooldowns. Gatehouse has its painted arena preview; other arenas have layout schematics until their art gate. Menus support all fifteen catalogs and mirror for Arabic/Urdu. Portrait setup and landscape combat are separate layouts.

Each class has three parent branches. Each branch divides into three six-node specializations. The lanes cover D-/C-/B-/A-/S-/SS-, D/C/B/A/S/SS and D+/C+/B+/A+/S+/SS+ respectively, so every branch includes every grade. There are 54 nodes per class, 378 in the catalog and 63 specialization paths. Grades communicate investment and specialization; a plus grade is not a claim that an alternative path strictly dominates another role.

The six ranks in a path cost 1, 2, 3, 4, 5 and 6 SP: 21 in total. A 27-SP final budget leaves six for complementary skills. Mix paths by meeting each path's prerequisites; only one capstone can be active. The authority validates class ownership, prerequisites, budget and capstones. All seven class kits and all 63 specialization paths / 378 skill nodes are implemented. The new requested pass adds ability-changing upgrades for each class and a separate settings-toggle large branching-tree view; those seven revamps and the optional view remain open.

Weapons, skills and upgrades appear as icon buttons. Selecting an icon opens a separate inspector with its name, grade, numerical effects, units, prerequisites, cost and purchase action. Inspection never spends currency. Completed nodes and connections gain an owned treatment. Every icon has an accessible name and focus indicator; text is not baked into art.

The five shop upgrades now use original painted items: Tempered Chamber, Feed Tuning, Reserve Clip, Quick Hands and Lined Coat. Full-size generated PNGs, exact prompts, actual exposed controls, hashes and alpha-preserving runtime normalization are recorded in ui-item-art-provenance.json. The tool did not expose a model identifier or quality selector. Weapon, skill and ability line symbols remain provisional. The final gameplay icon library uses painted items and ability illustrations with clean silhouettes; the asset manifest records that requirement. General navigation may retain simple ink symbols.

Offline saves retain the last compatible lobby or intermission, including build, rewards, votes and RNG state. The client saves after purchases/votes and at phase boundaries. Resuming restarts an unfinished encounter from its prior boundary. These local practice saves never establish an online result. A new content/protocol revision rejects incompatible saves instead of applying an old build to new rules.

Browser checks exercised real skill and upgrade spending, leave/resume, first-guide skipping, class and map availability, and fifteen phone class-menu layouts. Assistant layout and image review does not substitute for native-speaker or human gameplay review. The complete first-loop, rendered capacity and release gates remain in FIRST_PLAYABLE.md and ACCEPTANCE.md.
