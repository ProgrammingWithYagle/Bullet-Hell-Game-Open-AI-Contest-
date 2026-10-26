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

All seven classes now have independently drawn directional runs, idle, primary attack, hurt, dodge and downed clips: 204 selected run poses and 616 action poses. Soldier and Medic keep their four approved north/south frames per direction and gain eight-frame independent east/west runs. Four consistent Engineer north poses remain selected; four failed poses stay excluded. Special-ability and remaining boss action sets, rendered transitions and human/device acceptance remain open.

[Class and map implementation evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLASS_AND_ARENA_RUNTIME.md) · [All numerical skill definitions](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/skills.json)

## Tank action reference

![Tank idle, firearm attack, hurt, dash and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/tank-actions.jpg)

Twenty drawn clips add 88 poses to the Tank's existing runs. The image shows representative frames at one scale; it is not a gameplay capture. Runtime firing, hurt, dodge, downed holds and revival transitions are connected, with reduced-motion choices. Final rendered/human/device review and the remaining characters' full action libraries remain open. [Production and exact verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/TANK_ACTION_MOTION.md).

## Engineer action reference

![Engineer idle, firearm attack, hurt, dash and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/engineer-actions.jpg)

Twenty independent clips add 88 poses alongside the Engineer's existing runs. Representative frames share one world scale. The image is a sprite reference, not a game capture; final rendered/device/human acceptance remains open. [Production and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ENGINEER_ACTION_MOTION.md).

## Mage action reference

![Mage idle, staff cast, hurt, dash and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/mage-actions.jpg)

Twenty complete clips add 88 poses alongside the Mage's existing runs. The left-hand staff and right-hip book retain their identities. Representative frames share one world scale; this is a sprite reference, not a gameplay capture. [Production and exact reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MAGE_ACTION_MOTION.md). Rendered/device/human acceptance remains open.

## Heavy action reference

![Heavy idle, firearm attack, hurt, dodge and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/heavy-actions.jpg)

Twenty clips add 88 poses alongside the existing runs. Representative frames retain one world scale; this is a sprite reference. [Production and independent reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/HEAVY_AND_ASSASSIN_ACTION_MOTION.md). Rendered/device/human acceptance remains open.

## Assassin action reference

![Assassin idle, firearm attack, hurt, dodge and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/assassin-actions.jpg)

Twenty clips add 88 poses alongside the existing runs. Representative frames retain one world scale; this is a sprite reference. [Production and independent reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/HEAVY_AND_ASSASSIN_ACTION_MOTION.md). Rendered/device/human acceptance remains open.

## Soldier action reference

![Soldier idle, primary attack, hurt, dodge and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/soldier-actions.jpg)

Twenty action clips add 88 poses, alongside eight independently drawn side-run poses per direction and the retained north/south originals. Shared scale keeps the body consistent between actions and directions. Representative sprite frames are separate from gameplay captures or rendered acceptance. [Production, provenance and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SOLDIER_MEDIC_ACTION_MOTION.md).

## Medic action reference

![Medic idle, primary attack, hurt, dodge and downed poses in four directions](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/medic-actions.jpg)

Twenty action clips add 88 poses, alongside eight independently drawn side-run poses per direction and the retained north/south originals. Shared scale keeps the body consistent between actions and directions. Representative sprite frames are separate from gameplay captures or rendered acceptance. [Production, provenance and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SOLDIER_MEDIC_ACTION_MOTION.md).

## Consistent class-selection portraits

Soldier and Medic now use three-quarter resting poses. All seven selection portraits share a visible-body-height target and ground anchor, correcting the padded small front-facing seeds. Five existing identities/poses and all gameplay sprites remain unchanged; rendered menu review is pending.

![Seven class portraits at a shared body scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/selection-lineup.jpg)

## Optional expanded skill map

Enable **Expanded skill map** in Settings to see all 54 existing skills for the chosen class: three branches and nine paths. Classic remains the default. Native scrolling, 65–140% zoom, arrow keys and Home/End navigate the map; Enter or click inspects a node. Purchasing still requires the existing Buy control and valid points/prerequisites. The setting survives local profile import/export, including bounded migration from issued settings. All fifteen locales have map/zoom instructions. Rendered, physical-device, native-language and human acceptance remain open.
