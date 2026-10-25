# Classes and skills

All seven classes are selectable and execute their two abilities and ultimate offline and online. There are 54 skill nodes, nine specialization paths and four weapons per class: **378 nodes, 63 paths and 28 weapons total**.

![The seven survivors: Soldier, Heavy, Tank, Medic, Mage, Engineer and Assassin](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/survivors.jpg)

*Original survivor identity reference. Class mechanics and current production sprites are documented below.*


| Class | Survivor | Q | E | Ultimate |
| --- | --- | --- | --- | --- |
| Soldier | Mara Rook | Rally Field | Precision Burst | Last Roll Call |
| Heavy | Hux Bell | Suppressing Cone | Braced Firing | Foundry Overture |
| Tank | Bram Voss | Protective Wall | Rescue Charge | The City Holds |
| Medic | Iona Vale | Healing Field | Cleansing Serum | Names Returned |
| Mage | Sable Quill | Binding Sigil | Ward Detonation | Silent Twelfth |
| Engineer | Tamsin Reed | Rivet Turret | Deployable Barricade | Impossible Machine |
| Assassin | Vale Ash | Invisibility | Shadow Step | Unwritten Passage |

Soldier provides ranged fire and rally support. Heavy suppresses and braces. Tank protects and charges to rescue. Medic heals, cleanses and revives. Mage binds enemies and detonates wards. Engineer builds turrets and barricades. Assassin uses stealth, mobility and precision. Their constructs, control effects and targeting are actual simulation state, rather than menu-only descriptions.

## Buying a build

Each class has three parent branches with three six-node paths each. A path's depths cost 1, 2, 3, 4, 5 and 6 SP, for 21 total. Prerequisites must be owned in order. Only one capstone may be active. Quarantine, Midnight and Pilgrimage start with 3 SP and reach 27 before the finale. Grand Raid uses 12, 20 and 27 SP before its three fights. Endless reaches the normal build ceiling rather than accumulating unlimited player power.

Weapon purchases are class-compatible. Skills and weapons reset with the run. Ultimate cooldowns advance in combat, start ready and have a maximum 40% cooldown reduction. Local [mastery and cosmetic insignia](Profiles) now persist independently of purchased run power.

The class completion package includes 124 approved run poses and 52 item illustrations. Earlier Heavy/Warden motion is also connected. Full firing, dodge, hurt, downed and defeat libraries for every facing still require production and rendered review. Four consistent Engineer north poses are selected; four failed poses remain excluded and preserved in provenance.

[Class and map implementation evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLASS_AND_ARENA_RUNTIME.md) · [All numerical skill definitions](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/skills.json)

## Tank action reference

![Tank idle, firearm attack, hurt, dash and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/tank-actions.jpg)

Twenty drawn clips add 88 poses to the Tank's existing runs. The image shows representative frames at one scale; it is not a gameplay capture. Runtime firing, hurt, dodge, downed holds and revival transitions are connected, with reduced-motion choices. Final rendered/human/device review and the remaining characters' full action libraries remain open. [Production and exact verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/TANK_ACTION_MOTION.md).
