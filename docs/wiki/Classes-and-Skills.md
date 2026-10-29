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

## Purchased ability transformations

Twenty-one behavior changes now occupy existing utility-path depth-three nodes, costing the same six cumulative SP. Three transformations per class change Q, E and ultimate with explicit tradeoffs. The classic and expanded shops both display localized names/help. All costs, prerequisites and the one-capstone limit remain.

| Class | Ability | Purchased transformation | Behavior and tradeoff |
| --- | --- | --- | --- |
| Soldier | Q | Marching Colors | Q follows you, with 25% less radius. |
| Soldier | E | Breach Cadence | E fires three locked-aim shots 0.12 s apart; total damage stays the same. |
| Soldier | Ultimate | Supply Line | Ultimate refills ammo again halfway through its field; its base damage bonus falls from 35% to 25%. |
| Heavy | Q | Split Suppression | Q divides the same fourteen pellets into two narrow cones with a gap in front. |
| Heavy | E | Shoulder Mantlet | E adds a moving 80-base-health front wall; base brace reduction falls from 45% to 25%. |
| Heavy | Ultimate | Furnace Vents | Ultimate vents eight short-range shots every two seconds after the first second; base fire-rate bonus falls from 70% to 40%. |
| Tank | Q | Cornerstone | Q splits its wall into two angled panels, each with half the original health and length. |
| Tank | E | Wake Guard | Charge leaves an 80-base-health wall for two seconds at departure. |
| Tank | Ultimate | Procession | Ultimate follows you and shields each entrant once for 90 base health instead of 120. |
| Medic | Q | Field Triage | Q follows the most injured nearby ally, with 25% less radius. |
| Medic | E | Serum Relay | E chains heals and cleansing to three distinct allies, within 140 per hop, instead of every nearby ally. |
| Medic | Ultimate | Second Breath | Ultimate trades 40 instant base healing for 24 plus three healing pulses of 6. Difficulty revival rules still apply. |
| Mage | Q | Twin Sigils | Q makes two separated smaller sigils, each dealing half damage. |
| Mage | E | Ward Echo | E splits its 65 base damage into 40 now and 25 at the same ground point after 0.75 s. |
| Mage | Ultimate | Orbit Requiem | Ultimate replaces its large fixed pulse with three smaller orbiting centers, each dealing one third of the pulse damage. |
| Engineer | Q | Crossfire Pair | Q makes two turrets with half health and damage each; the second prefers a farther target. |
| Engineer | E | Return Current | Barricade stores up to 120 absorbed damage; destruction or expiry releases 60% of it nearby. |
| Engineer | Ultimate | Foundry Relay | Siege follows at 160 pixels per second; base health falls from 200 to 160. |
| Assassin | Q | Decoy Veil | Q leaves a 60-health projectile-damageable decoy that attracts aim; base veil duration falls from 6 s to 4 s. |
| Assassin | E | Aftercut | Step deals 60% damage now and 40% along its locked path after 0.45 s. |
| Assassin | Ultimate | Unwritten Traps | Ultimate lasts 3.5 s with one fewer free step; empowered departures leave three damaging pulses. |

[Exact behavior, authority and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLASS_TALENTS.md). Human/rendered/device/native-language review remains open.

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

Medic resurrection, teammate channels, self-recovery and revive kits use the rescuer’s class and difficulty.

Medic revivals restore **full health + a non-stacking 20% maximum-health shield on Baby, 75% on Easy, 45% on Normal, 30% on Hard and exactly 1 HP on Insane**. Hellish forbids every revival, including Medic abilities and items. Other classes use the health values in the table. Medic can spend a self-revival charge in a team as well as Solo; other classes can self-revive only in Solo. The base allowance is one per fight plus purchased extra-charge effects, with a full two-second channel.

Passive health regeneration is reduced for every class: **25% less on Hard, 50% less on Insane, disabled on Hellish**. Deliberate healing abilities/items remain separate. [Complete current revival rules and balance limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MEDIC_RECOVERY.md).

Medic retains its healing, cleansing, nearby damage and existing Solo ultimate shield. Only its ultimate can revive an eliminated teammate; ordinary channels and kits require a nearby downed teammate. Current values are a starting balance policy pending human combat review.


Personal shields now share one combined capacity across starting shields, ability shields and armor plates: Baby/Easy/Normal 100% of maximum health, Hard 75%, Insane 50%, Hellish 0, rounded down. Excess shield cannot absorb damage. Hellish cannot buy or consume shield items; deployed walls remain physical cover. The HUD shows current shield/capacity. Future Tank/Heavy cap upgrades and selective attack blocking are recorded separately and are not implemented.


Base starting shield is recalculated each fight from the difficulty-adjusted capacity: Heavy 50%, Tank 100%, Soldier 15%, all other classes 0. Hellish gives everyone0. Existing starting-shield mutation bonuses can fill remaining capacity, and all sources respect the same cap. This adds no new branch or maximum-shield upgrade.
