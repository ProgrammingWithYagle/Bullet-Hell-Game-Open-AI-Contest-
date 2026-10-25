# Grave Accord - Stage 1 production bible

> Current implementation/production authority: [state](IMPLEMENTATION_STATE.md), [progress](DEVELOPMENT_PROGRESS.md), [fixed threats](FIXED_BOSS_THREATS.md) and [continuation checkpoint](CHECKPOINT_2026_10_25.md). The expanded target is 150 ordinary bosses plus secrets; 60 are currently playable (59 ordinary, one secret). Earlier route tables below retain design history; shared fixed-grade campaign selection supersedes strict primary-route fences and encounter rerating.

Edition 0.2.0 | 2026-10-22 | Expanded 60-boss design | Original cooperative gothic zombie bullet hell

Status: design and preproduction. Balance values are explicit starting hypotheses. Gameplay, performance and human playtesting are not yet verified.

## Product promise

A group joins with a room code or public discovery, chooses distinct survivor roles, dodges readable zombie attacks and votes on shared risks. An offline solo game and a Windows portable build use the same rules. Endless Vigil has no final round. The complete roadmap includes every mode and class below.

## Setting and narrative

### Premise

The city of Lorn was built around twelve bells. Eleven named the work of the living: watch, medicine, burial, trade, water, shelter, memory, law, learning, labor and rest. The twelfth counted people whose names never entered the civic ledger. When a plague emptied the streets, the council rang all twelve together. The dead rose and resumed their duties without remembering whom those duties served.

### The accord

The survivors discover that coordinated living voices can interrupt the bells. An accord is not a spell owned by a hero. It is an action people perform together: holding ground, making a rescue possible, refusing an order to abandon someone. Every class can contribute.

### Quarantine Run

Mara opens a route through the gate, Iona recognizes the bed linen worn by the Cradle Matron, and Sable identifies the final bell beneath the council chamber. The short route preserves the whole narrative arc in five contracts.

### Midnight Circuit

The standard route visits every civic system. Hux confronts the foundry that buried its workers; Tamsin repairs a mechanism designed to keep working after its operators died. Vale follows letters that were never delivered. Boss defeats recover names rather than claiming the dead were merely monsters.

### Black Bell Pilgrimage

The long route revisits districts with additional testimony. Quiet intermission panels show the same places before the quarantine. The repeat visits are meaningful layout and phase variations, not extra grind required for permanent power.

### Campaign ending

Quarantine breaks the evacuation cordon; Midnight restores the infirmary and chapel services; Pilgrimage severs the drowned council command; Raid stops a city-scale catastrophe. Each ending banks its own victory and recovered names before the optional secret extension. A failed secret extension never removes that victory or its mastery.

### The Uncounted

Three successful Accord Breaks leave the forgotten bell audible. After a Normal-or-higher campaign victory without a timeout, players may choose to enter its chamber. The Uncounted is the aggregate memory of people erased by the city. Defeating it completes the ledger and unlocks a cosmetic memorial, not stronger starting statistics.

### Endless Vigil

In endless play the survivors keep the restored gate open. There is no final round, forced ending, or hidden wave cap. Each ten encounters completes a vigil cycle. Opponents gain health and damage while authored projectile budgets remain bounded. Players pursue survival streaks, mastery and cooperation rather than infinite purchased power.

## Modes, routes and pacing

| Mode | Players | Encounters | Target minutes | Purpose |
| --- | --- | --- | --- | --- |
| Quarantine Run | 1-8 | 5 | 10-20 | A five-contract passage from the breached gate to the drowned seat of government. |
| Midnight Circuit | 1-8 | 10 | 25-35 | The full city circuit, balancing build development with a compact evening session. |
| Black Bell Pilgrimage | 1-8 | 16 | 45-60 | A longer rescue pilgrimage through all districts, with champions and additional survivor testimony. |
| Grand Raid | 1-16 | 3 | 10-20 | Three extended encounters with an accelerated starting build and larger cooperative objectives. |
| Endless Vigil | 1-50 | Unlimited | Until defeat | No final round. Survive successive bosses indefinitely, vote on mutations, shop between encounters, and pursue a personal and squad streak. Solo, private and public play. |

Target pacing assumes roughly 110, 120 and 145 seconds of combat per short, standard and long encounter, plus 60 seconds per full intermission. These give approximately 13.2, 29.0 and 53.7 minutes. Faster skilled groups can finish sooner. Raid encounters have extended authored phases. There is no forced waiting to meet a duration claim.

Nominal campaign threat paths: Short 1,3,5,8,10; Standard 1 through 10; Long 1,1,2,2,3,3,4,4,5,6,7,8,9,9,10,10. Boss votes offer three distinct unused identities from the route-specific pool, with concealed identities and visible risk/bounty/build recommendations. Reserve three finale identities for the last vote. Short has six regular plus three finale bosses; Standard eleven plus three; Long seventeen plus three; Raid four plus three. These counts leave at least three unused candidates at every vote without repeating a boss in one timed run. Contract threat scales mechanics and never reveals identity. Never reveal boss ID or illustration in contract cards.

## Controls and combat rules

Mouse and keyboard: WASD move, pointer aim, left button fire, R reload, Space dodge, Q/E abilities, X ultimate, F interact/revive, 1/2/3 supplies, Escape pause or menu. Gamepad: left stick move, right stick aim, right trigger fire, south face dodge, shoulder buttons abilities, west face reload, north face interact, east face ultimate. Touch: left movement stick, right aim/fire stick, independent dodge/Q/E/ultimate/interact buttons. Bindings are remappable.

Manual aiming is the baseline. Aim assist and auto-fire are optional and available on every difficulty. Solo pause stops simulation. Online menus do not pause the room. Reduce friendly effects without hiding hostile hazards. Do not mirror movement, world geometry or aiming in RTL locales.

Player radius 9 px; ordinary hostile projectile radius 5 px; arena 1600 x 1000 world px. Dodge lasts 0.22 s at 800 px/s, grants 0.16 s invulnerability and has a 3.5 s cooldown. Use relative swept collision for fast moving circles and segment/rectangle checks for beams. Friendly fire and player collision are disabled. Friendly structures do not block teammate movement.

At zero health, a player is downed for 20 s. Any living teammate can channel a 2 s revive, returning the target at 50% health; damage interrupts the channel. An eliminated player returns next encounter. Solo has one self-revive per boss. A fully incapacitated party or expired deadline loses the encounter. All living entrants start each boss fully healed and reloaded.

## Classes and abilities

| Class | Survivor | HP | Speed px/s | Role |
| --- | --- | --- | --- | --- |
| Soldier | Mara Rook | 110 | 225 | Reliable ranged damage and squad leadership. |
| Heavy | Hux Bell | 140 | 190 | Sustained fire and suppression. |
| Tank | Bram Voss | 170 | 180 | Protection, interruption and rescue. |
| Medic | Iona Vale | 100 | 225 | Healing, cleansing and rapid recovery. |
| Mage | Sable Quill | 85 | 225 | Area control and magical burst damage. |
| Engineer | Tamsin Reed | 105 | 215 | Deployables, repair and controlled ground. |
| Assassin | Vale Ash | 90 | 255 | Precision, mobility and safe rescue openings. |

### Soldier - Mara Rook

A former night-watch officer who refused the order to bar the infirmary doors. Mara counts everyone before she moves.

Rally Field [Q]: Allies in the field gain 20% weapon damage and 10% movement speed. Cooldown 16 s; duration 6 s; radius/range 170 px; base damage 0 HP.

Precision Burst [E]: Fire three accurate piercing rounds toward the aim point. Cooldown 9 s; duration 0 s; radius/range 0 px; base damage 45 HP.

Ultimate Last Roll Call [X]: Reload allies instantly, clear nearby hostile projectiles once and grant 35% weapon damage in the rally field for 8 seconds. Cooldown 80 s; duration 8 s; range 260 px.

### Heavy - Hux Bell

Hux once kept the foundry running through winter. He now carries its last functioning feed motor into the streets.

Suppressing Cone [Q]: Fire fourteen rounds in a cone and slow ordinary enemies by 40%. Cooldown 12 s; duration 3 s; radius/range 220 px; base damage 45 HP.

Braced Firing [E]: Gain 45% damage resistance and 30% fire rate; move at 60% speed. Cooldown 18 s; duration 5 s; radius/range 0 px; base damage 0 HP.

Ultimate Foundry Overture [X]: Overdrive the weapon for 6 seconds with 70% additional fire rate, two extra pierces and no magazine consumption; movement is reduced. Cooldown 90 s; duration 6 s; range 0 px.

### Tank - Bram Voss

A gate engineer carrying a door that outlived its building. Bram insists a shield is only useful with someone behind it.

Protective Wall [Q]: Place a 150-health bullet-blocking wall that allies can walk through. Cooldown 16 s; duration 5 s; radius/range 150 px; base damage 0 HP.

Rescue Charge [E]: Charge toward the aim point, gain brief invulnerability and damage nearby enemies. Cooldown 10 s; duration 0.3 s; radius/range 180 px; base damage 50 HP.

Ultimate The City Holds [X]: Grant nearby allies 120 shield and 35 percentage points of armor for 8 seconds. Armor respects the global cap; identical fields do not stack. Cooldown 95 s; duration 8 s; range 230 px.

### Medic - Iona Vale

Iona wrote names on bandages when the city ran out of paper. She refuses to let the bells make those names meaningless.

Healing Field [Q]: Restore 8 health per second to allies inside the field. Cooldown 16 s; duration 6 s; radius/range 140 px; base damage 0 HP.

Cleansing Serum [E]: Heal nearby allies for 20 health and remove poison and slow effects. Cooldown 12 s; duration 0 s; radius/range 160 px; base damage 0 HP.

Ultimate Names Returned [X]: After a one-second channel, revive nearby downed or eliminated allies at 60% health, heal living allies for 40, cleanse effects and strike nearby enemies for 35. Solo also gains 40 shield. Cooldown 100 s; duration 1 s; range 240 px.

### Mage - Sable Quill

Sable catalogued forbidden bell harmonics before the quarantine. The cure and the curse now share the same notebook.

Binding Sigil [Q]: Damage enemies and slow ordinary enemies by 55% within a sigil. Cooldown 12 s; duration 4 s; radius/range 120 px; base damage 35 HP.

Ward Detonation [E]: Detonate a ward around the aim point and grant nearby allies a 35-health shield. Cooldown 18 s; duration 6 s; radius/range 145 px; base damage 65 HP.

Ultimate Silent Twelfth [X]: Release three 120-damage pulses over 3 seconds, erase hostile projectiles in range on the first pulse and strongly slow ordinary enemies. Cooldown 90 s; duration 3 s; range 300 px.

### Engineer - Tamsin Reed

Tamsin repairs tools with parts that were never meant to fit. She believes the city can be repaired by the same method.

Rivet Turret [Q]: Deploy an 80-health turret with 25 base damage per second. Cooldown 18 s; duration 12 s; radius/range 0 px; base damage 25 HP.

Deployable Barricade [E]: Deploy a 120-health bullet barrier; teammates can pass through it. Cooldown 16 s; duration 8 s; radius/range 160 px; base damage 0 HP.

Ultimate Impossible Machine [X]: Deploy a 200-health siege construct dealing 90 base damage per second for 14 seconds and overclock owned turrets by 50%. Cooldown 100 s; duration 14 s; range 0 px.

### Assassin - Vale Ash

Vale used to carry letters through streets the watch had abandoned. They still know which alleys lead home.

Invisibility [Q]: Become untargetable by newly aimed attacks. Existing hazards still hurt. Cooldown 16 s; duration 6 s; radius/range 0 px; base damage 0 HP.

Shadow Step [E]: Blink toward the aim point, briefly evade damage and strike nearby enemies. Cooldown 10 s; duration 0.18 s; radius/range 180 px; base damage 50 HP.

Ultimate Unwritten Passage [X]: For 5 seconds gain three free empowered Shadow Steps, 100% critical chance and untargetability to new aimed attacks. Existing hazards remain dangerous outside dodge invulnerability. Cooldown 85 s; duration 5 s; range 180 px.

Ultimates begin ready and advance cooldown only during active combat. Intermissions and solo pause do not recharge them. The utility branch upgrades ultimate cooldown at depths 3 and 5, potency at depth 5, and a unique ultimate mechanic at its capstone. Ultimate cooldown reduction is capped at 40%; Focus Tonic affects Q/E only. Identical ally auras use the strongest magnitude and longest remaining duration rather than multiplying. Keyboard X and gamepad east face button activate the ultimate; a separate labeled touch control displays ready state and remaining cooldown.

## Skill tree and build budget

Every class has three parent branches, each with three six-node specialization paths: 54 nodes per class and 378 overall. Every parent branch covers all eighteen grades from D- through SS+. Grades describe investment bands and specialization complexity; same-cost alternatives provide different benefits rather than strict dominance. Depth costs are 1,2,3,4,5,6 SP; one full specialization costs 21 SP. Paths may be mixed, but prerequisites stay within their path and only one capstone can be active. Start campaigns at 3 SP and award 24 more before the final boss. Before fight j+1 of R fights, cumulative SP = 3 + floor(24*j/(R-1)). All campaigns arrive at 27 SP, allowing a capstone and six complementary points. A free pre-encounter respec is available in the first shop; later respec costs 90 coins and cannot occur during combat.

Grand Raid pre-fight skill budgets are 12,20,27. Endless follows the standard ten-encounter ramp and caps purchased skill power at 27; later rewards are mastery and streak progress. Do not award unspendable infinite skill points.

Effect units: weaponDamage, fireRate, cooldownReduction, ultimateCooldownReduction, abilityPotency, ultimatePotency, armor, criticalChance and named ability modifiers are additive fractions; maxHealth/healOnHit/ultimateShield are HP; regeneration is HP/s; ultimateDuration is seconds; ultimateRadius is pixels; pierce, extraShots, selfRevives, extraTurrets, ultimatePulses and ultimateCharges are integers. Apply modifier limits after combining purchased effects. Armor cannot exceed 65%; weapon cooldown and reload duration remain positive.

| Class | Branch | Specialization | Node | SP | Grade | Effects |
| --- | --- | --- | --- | --- | --- | --- |
| soldier | Ballistics | weaponDamage | Clean Bore | 1 | D- | weaponDamage 0.08; fireRate 0 |
| soldier | Ballistics | weaponDamage | Measured Pair | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| soldier | Ballistics | weaponDamage | Copper Jackets | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| soldier | Ballistics | weaponDamage | Crossfire Drill | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| soldier | Ballistics | weaponDamage | Long Watch | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| soldier | Ballistics | weaponDamage | Last Word | 6 | SS- | weaponDamage 0.35; fireRate 0.16; extraShots 1 |
| soldier | Ballistics | fireRate | Clean Bore · fireRate | 1 | D | fireRate 0.06; reloadReduction 0.02 |
| soldier | Ballistics | fireRate | Measured Pair · fireRate | 2 | C | fireRate 0.07; reloadReduction 0.025 |
| soldier | Ballistics | fireRate | Copper Jackets · fireRate | 3 | B | fireRate 0.08; reloadReduction 0.03 |
| soldier | Ballistics | fireRate | Crossfire Drill · fireRate | 4 | A | fireRate 0.1; reloadReduction 0.035 |
| soldier | Ballistics | fireRate | Long Watch · fireRate | 5 | S | fireRate 0.12; reloadReduction 0.04 |
| soldier | Ballistics | fireRate | Last Word · fireRate | 6 | SS | fireRate 0.16; reloadReduction 0.05; magazine 4 |
| soldier | Ballistics | criticalChance | Clean Bore · criticalChance | 1 | D+ | weaponDamage 0.04; criticalChance 0.02 |
| soldier | Ballistics | criticalChance | Measured Pair · criticalChance | 2 | C+ | weaponDamage 0.05; criticalChance 0.03 |
| soldier | Ballistics | criticalChance | Copper Jackets · criticalChance | 3 | B+ | weaponDamage 0.07; criticalChance 0.04 |
| soldier | Ballistics | criticalChance | Crossfire Drill · criticalChance | 4 | A+ | weaponDamage 0.09; criticalChance 0.05 |
| soldier | Ballistics | criticalChance | Long Watch · criticalChance | 5 | S+ | weaponDamage 0.12; criticalChance 0.06 |
| soldier | Ballistics | criticalChance | Last Word · criticalChance | 6 | SS+ | weaponDamage 0.18; criticalChance 0.1; pierce 2 |
| soldier | Command | abilityPotency | Clear Signal | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| soldier | Command | abilityPotency | Steady Orders | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| soldier | Command | abilityPotency | Shared Bearings | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| soldier | Command | abilityPotency | Fire Discipline | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| soldier | Command | abilityPotency | Unbroken Line | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| soldier | Command | abilityPotency | Citywide Rally | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; rallyRadius 0.5; ultimateShield 30 |
| soldier | Command | Last Roll Call | Clear Signal · Last Roll Call | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| soldier | Command | Last Roll Call | Steady Orders · Last Roll Call | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| soldier | Command | Last Roll Call | Shared Bearings · Last Roll Call | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| soldier | Command | Last Roll Call | Fire Discipline · Last Roll Call | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| soldier | Command | Last Roll Call | Unbroken Line · Last Roll Call | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| soldier | Command | Last Roll Call | Citywide Rally · Last Roll Call | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimateDuration 2 |
| soldier | Command | Rally Field | Clear Signal · Rally Field | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; rallyRadius 0.03 |
| soldier | Command | Rally Field | Steady Orders · Rally Field | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; rallyRadius 0.04 |
| soldier | Command | Rally Field | Shared Bearings · Rally Field | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; rallyRadius 0.05 |
| soldier | Command | Rally Field | Fire Discipline · Rally Field | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; rallyRadius 0.07 |
| soldier | Command | Rally Field | Unbroken Line · Rally Field | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; rallyRadius 0.1 |
| soldier | Command | Rally Field | Citywide Rally · Rally Field | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; rallyRadius 0.16; ultimateShield 30 |
| soldier | Survival | maxHealth | Field Dressing | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| soldier | Survival | maxHealth | Low Profile | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| soldier | Survival | maxHealth | Hardened Coat | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| soldier | Survival | maxHealth | Second Wind | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| soldier | Survival | maxHealth | Hold Fast | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| soldier | Survival | maxHealth | Nobody Left | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| soldier | Survival | dodgeCooldown | Field Dressing · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| soldier | Survival | dodgeCooldown | Low Profile · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| soldier | Survival | dodgeCooldown | Hardened Coat · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| soldier | Survival | dodgeCooldown | Second Wind · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| soldier | Survival | dodgeCooldown | Hold Fast · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| soldier | Survival | dodgeCooldown | Nobody Left · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| soldier | Survival | reviveRate | Field Dressing · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| soldier | Survival | reviveRate | Low Profile · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| soldier | Survival | reviveRate | Hardened Coat · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| soldier | Survival | reviveRate | Second Wind · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| soldier | Survival | reviveRate | Hold Fast · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| soldier | Survival | reviveRate | Nobody Left · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| heavy | Ordnance | weaponDamage | Fresh Belt | 1 | D- | weaponDamage 0.08; fireRate 0 |
| heavy | Ordnance | weaponDamage | Hot Chamber | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| heavy | Ordnance | weaponDamage | Hard Rounds | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| heavy | Ordnance | weaponDamage | Feed Motor | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| heavy | Ordnance | weaponDamage | Iron Torrent | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| heavy | Ordnance | weaponDamage | Foundry Roar | 6 | SS- | weaponDamage 0.35; fireRate 0.16; pierce 2 |
| heavy | Ordnance | magazine | Fresh Belt · magazine | 1 | D | magazine 3; reloadReduction 0.02 |
| heavy | Ordnance | magazine | Hot Chamber · magazine | 2 | C | magazine 4; reloadReduction 0.025 |
| heavy | Ordnance | magazine | Hard Rounds · magazine | 3 | B | magazine 5; reloadReduction 0.03 |
| heavy | Ordnance | magazine | Feed Motor · magazine | 4 | A | magazine 6; reloadReduction 0.035 |
| heavy | Ordnance | magazine | Iron Torrent · magazine | 5 | S | magazine 8; reloadReduction 0.04 |
| heavy | Ordnance | magazine | Foundry Roar · magazine | 6 | SS | magazine 12; reloadReduction 0.05; fireRate 0.2 |
| heavy | Ordnance | pierce | Fresh Belt · pierce | 1 | D+ | weaponDamage 0.04; criticalChance 0.02 |
| heavy | Ordnance | pierce | Hot Chamber · pierce | 2 | C+ | weaponDamage 0.05; criticalChance 0.03 |
| heavy | Ordnance | pierce | Hard Rounds · pierce | 3 | B+ | weaponDamage 0.07; criticalChance 0.04 |
| heavy | Ordnance | pierce | Feed Motor · pierce | 4 | A+ | weaponDamage 0.09; criticalChance 0.05 |
| heavy | Ordnance | pierce | Iron Torrent · pierce | 5 | S+ | weaponDamage 0.12; criticalChance 0.06 |
| heavy | Ordnance | pierce | Foundry Roar · pierce | 6 | SS+ | weaponDamage 0.18; criticalChance 0.1; pierce 3 |
| heavy | Suppression | abilityPotency | Wide Sweep | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| heavy | Suppression | abilityPotency | Pinned Shadows | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| heavy | Suppression | abilityPotency | Heavy Rhythm | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| heavy | Suppression | abilityPotency | Clearing Fire | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| heavy | Suppression | abilityPotency | Wall of Lead | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| heavy | Suppression | abilityPotency | Quiet the Street | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; suppressionDuration 0.5; ultimateDuration 2 |
| heavy | Suppression | Foundry Overture | Wide Sweep · Foundry Overture | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| heavy | Suppression | Foundry Overture | Pinned Shadows · Foundry Overture | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| heavy | Suppression | Foundry Overture | Heavy Rhythm · Foundry Overture | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| heavy | Suppression | Foundry Overture | Clearing Fire · Foundry Overture | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| heavy | Suppression | Foundry Overture | Wall of Lead · Foundry Overture | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| heavy | Suppression | Foundry Overture | Quiet the Street · Foundry Overture | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimateDuration 2 |
| heavy | Suppression | Suppressing Cone | Wide Sweep · Suppressing Cone | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; suppressionDuration 0.03 |
| heavy | Suppression | Suppressing Cone | Pinned Shadows · Suppressing Cone | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; suppressionDuration 0.04 |
| heavy | Suppression | Suppressing Cone | Heavy Rhythm · Suppressing Cone | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; suppressionDuration 0.05 |
| heavy | Suppression | Suppressing Cone | Clearing Fire · Suppressing Cone | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; suppressionDuration 0.07 |
| heavy | Suppression | Suppressing Cone | Wall of Lead · Suppressing Cone | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; suppressionDuration 0.1 |
| heavy | Suppression | Suppressing Cone | Quiet the Street · Suppressing Cone | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; suppressionDuration 0.16; pierce 2 |
| heavy | Endurance | maxHealth | Padded Harness | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| heavy | Endurance | maxHealth | Deep Breath | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| heavy | Endurance | maxHealth | Steel Shoulders | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| heavy | Endurance | maxHealth | Unshaken | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| heavy | Endurance | maxHealth | Long Haul | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| heavy | Endurance | maxHealth | Still Standing | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| heavy | Endurance | dodgeCooldown | Padded Harness · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| heavy | Endurance | dodgeCooldown | Deep Breath · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| heavy | Endurance | dodgeCooldown | Steel Shoulders · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| heavy | Endurance | dodgeCooldown | Unshaken · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| heavy | Endurance | dodgeCooldown | Long Haul · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| heavy | Endurance | dodgeCooldown | Still Standing · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| heavy | Endurance | reviveRate | Padded Harness · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| heavy | Endurance | reviveRate | Deep Breath · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| heavy | Endurance | reviveRate | Steel Shoulders · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| heavy | Endurance | reviveRate | Unshaken · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| heavy | Endurance | reviveRate | Long Haul · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| heavy | Endurance | reviveRate | Still Standing · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| tank | Breaching | weaponDamage | Close Quarters | 1 | D- | weaponDamage 0.08; fireRate 0 |
| tank | Breaching | weaponDamage | Buckshot Proof | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| tank | Breaching | weaponDamage | Door Knocker | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| tank | Breaching | weaponDamage | Breach Pattern | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| tank | Breaching | weaponDamage | Forward Pressure | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| tank | Breaching | weaponDamage | Open the Way | 6 | SS- | weaponDamage 0.35; fireRate 0.16; extraShots 2 |
| tank | Breaching | extraShots | Close Quarters · extraShots | 1 | D | weaponDamage 0.04; reloadReduction 0.02 |
| tank | Breaching | extraShots | Buckshot Proof · extraShots | 2 | C | weaponDamage 0.05; reloadReduction 0.025 |
| tank | Breaching | extraShots | Door Knocker · extraShots | 3 | B | weaponDamage 0.07; reloadReduction 0.03 |
| tank | Breaching | extraShots | Breach Pattern · extraShots | 4 | A | weaponDamage 0.09; reloadReduction 0.035 |
| tank | Breaching | extraShots | Forward Pressure · extraShots | 5 | S | weaponDamage 0.12; reloadReduction 0.04 |
| tank | Breaching | extraShots | Open the Way · extraShots | 6 | SS | weaponDamage 0.18; reloadReduction 0.05; extraShots 2 |
| tank | Breaching | fireRate | Close Quarters · fireRate | 1 | D+ | fireRate 0.06; magazine 0 |
| tank | Breaching | fireRate | Buckshot Proof · fireRate | 2 | C+ | fireRate 0.07; magazine 1 |
| tank | Breaching | fireRate | Door Knocker · fireRate | 3 | B+ | fireRate 0.08; magazine 0 |
| tank | Breaching | fireRate | Breach Pattern · fireRate | 4 | A+ | fireRate 0.1; magazine 1 |
| tank | Breaching | fireRate | Forward Pressure · fireRate | 5 | S+ | fireRate 0.12; magazine 0 |
| tank | Breaching | fireRate | Open the Way · fireRate | 6 | SS+ | fireRate 0.16; magazine 2; pierce 2 |
| tank | Protection | abilityPotency | Broad Guard | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| tank | Protection | abilityPotency | Safe Passage | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| tank | Protection | abilityPotency | Reinforced Face | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| tank | Protection | abilityPotency | Linked Shelter | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| tank | Protection | abilityPotency | Rescue Habit | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| tank | Protection | abilityPotency | The Last Door | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; barrierHealth 0.6; ultimatePotency 0.25 |
| tank | Protection | The City Holds | Broad Guard · The City Holds | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| tank | Protection | The City Holds | Safe Passage · The City Holds | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| tank | Protection | The City Holds | Reinforced Face · The City Holds | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| tank | Protection | The City Holds | Linked Shelter · The City Holds | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| tank | Protection | The City Holds | Rescue Habit · The City Holds | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| tank | Protection | The City Holds | The Last Door · The City Holds | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.25 |
| tank | Protection | Protective Wall | Broad Guard · Protective Wall | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; barrierHealth 0.04 |
| tank | Protection | Protective Wall | Safe Passage · Protective Wall | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; barrierHealth 0.05 |
| tank | Protection | Protective Wall | Reinforced Face · Protective Wall | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; barrierHealth 0.07 |
| tank | Protection | Protective Wall | Linked Shelter · Protective Wall | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; barrierHealth 0.1 |
| tank | Protection | Protective Wall | Rescue Habit · Protective Wall | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; barrierHealth 0.14 |
| tank | Protection | Protective Wall | The Last Door · Protective Wall | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; barrierHealth 0.2; maxHealth 25 |
| tank | Bastion | maxHealth | Riveted Coat | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| tank | Bastion | maxHealth | Grounded Stance | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| tank | Bastion | maxHealth | Impact Bracing | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| tank | Bastion | maxHealth | Deep Reserve | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| tank | Bastion | maxHealth | Stone Resolve | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| tank | Bastion | maxHealth | Unfallen | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| tank | Bastion | dodgeCooldown | Riveted Coat · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| tank | Bastion | dodgeCooldown | Grounded Stance · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| tank | Bastion | dodgeCooldown | Impact Bracing · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| tank | Bastion | dodgeCooldown | Deep Reserve · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| tank | Bastion | dodgeCooldown | Stone Resolve · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| tank | Bastion | dodgeCooldown | Unfallen · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| tank | Bastion | reviveRate | Riveted Coat · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| tank | Bastion | reviveRate | Grounded Stance · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| tank | Bastion | reviveRate | Impact Bracing · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| tank | Bastion | reviveRate | Deep Reserve · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| tank | Bastion | reviveRate | Stone Resolve · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| tank | Bastion | reviveRate | Unfallen · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| medic | Chemistry | weaponDamage | Sharp Dose | 1 | D- | weaponDamage 0.08; fireRate 0 |
| medic | Chemistry | weaponDamage | Pressure Injector | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| medic | Chemistry | weaponDamage | Stable Mixture | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| medic | Chemistry | weaponDamage | Surgical Volley | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| medic | Chemistry | weaponDamage | Last Formula | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| medic | Chemistry | weaponDamage | Mercy with Teeth | 6 | SS- | weaponDamage 0.35; fireRate 0.16; healOnHit 2 |
| medic | Chemistry | healOnHit | Sharp Dose · healOnHit | 1 | D | weaponDamage 0.03; healOnHit 0.1 |
| medic | Chemistry | healOnHit | Pressure Injector · healOnHit | 2 | C | weaponDamage 0.04; healOnHit 0.15 |
| medic | Chemistry | healOnHit | Stable Mixture · healOnHit | 3 | B | weaponDamage 0.05; healOnHit 0.2 |
| medic | Chemistry | healOnHit | Surgical Volley · healOnHit | 4 | A | weaponDamage 0.06; healOnHit 0.25 |
| medic | Chemistry | healOnHit | Last Formula · healOnHit | 5 | S | weaponDamage 0.08; healOnHit 0.3 |
| medic | Chemistry | healOnHit | Mercy with Teeth · healOnHit | 6 | SS | weaponDamage 0.12; healOnHit 1 |
| medic | Chemistry | criticalChance | Sharp Dose · criticalChance | 1 | D+ | weaponDamage 0.04; criticalChance 0.02 |
| medic | Chemistry | criticalChance | Pressure Injector · criticalChance | 2 | C+ | weaponDamage 0.05; criticalChance 0.03 |
| medic | Chemistry | criticalChance | Stable Mixture · criticalChance | 3 | B+ | weaponDamage 0.07; criticalChance 0.04 |
| medic | Chemistry | criticalChance | Surgical Volley · criticalChance | 4 | A+ | weaponDamage 0.09; criticalChance 0.05 |
| medic | Chemistry | criticalChance | Last Formula · criticalChance | 5 | S+ | weaponDamage 0.12; criticalChance 0.06 |
| medic | Chemistry | criticalChance | Mercy with Teeth · criticalChance | 6 | SS+ | weaponDamage 0.18; criticalChance 0.1; fireRate 0.15 |
| medic | Triage | abilityPotency | Clean Hands | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| medic | Triage | abilityPotency | Quick Assessment | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| medic | Triage | abilityPotency | Wide Ward | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| medic | Triage | abilityPotency | Measured Serum | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| medic | Triage | abilityPotency | Rescue Protocol | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| medic | Triage | abilityPotency | Nobody Forgotten | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; reviveRate 0.5; ultimateRadius 80 |
| medic | Triage | Names Returned | Clean Hands · Names Returned | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| medic | Triage | Names Returned | Quick Assessment · Names Returned | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| medic | Triage | Names Returned | Wide Ward · Names Returned | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| medic | Triage | Names Returned | Measured Serum · Names Returned | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| medic | Triage | Names Returned | Rescue Protocol · Names Returned | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| medic | Triage | Names Returned | Nobody Forgotten · Names Returned | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimateRadius 80 |
| medic | Triage | Healing Field | Clean Hands · Healing Field | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; reviveRate 0.04 |
| medic | Triage | Healing Field | Quick Assessment · Healing Field | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; reviveRate 0.06 |
| medic | Triage | Healing Field | Wide Ward · Healing Field | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; reviveRate 0.08 |
| medic | Triage | Healing Field | Measured Serum · Healing Field | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; reviveRate 0.12 |
| medic | Triage | Healing Field | Rescue Protocol · Healing Field | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; reviveRate 0.2 |
| medic | Triage | Healing Field | Nobody Forgotten · Healing Field | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; reviveRate 0.3; healOnHit 1 |
| medic | Recovery | maxHealth | Padded Satchel | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| medic | Recovery | maxHealth | Stubborn Pulse | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| medic | Recovery | maxHealth | Safe Footing | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| medic | Recovery | maxHealth | Fresh Bandage | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| medic | Recovery | maxHealth | Living Memory | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| medic | Recovery | maxHealth | A Name Returned | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| medic | Recovery | dodgeCooldown | Padded Satchel · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| medic | Recovery | dodgeCooldown | Stubborn Pulse · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| medic | Recovery | dodgeCooldown | Safe Footing · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| medic | Recovery | dodgeCooldown | Fresh Bandage · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| medic | Recovery | dodgeCooldown | Living Memory · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| medic | Recovery | dodgeCooldown | A Name Returned · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| medic | Recovery | reviveRate | Padded Satchel · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| medic | Recovery | reviveRate | Stubborn Pulse · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| medic | Recovery | reviveRate | Safe Footing · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| medic | Recovery | reviveRate | Fresh Bandage · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| medic | Recovery | reviveRate | Living Memory · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| medic | Recovery | reviveRate | A Name Returned · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| mage | Hexcraft | weaponDamage | Ash Script | 1 | D- | weaponDamage 0.08; fireRate 0 |
| mage | Hexcraft | weaponDamage | Resonant Ink | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| mage | Hexcraft | weaponDamage | Split Glyph | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| mage | Hexcraft | weaponDamage | Grave Arithmetic | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| mage | Hexcraft | weaponDamage | Forbidden Meter | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| mage | Hexcraft | weaponDamage | The Silent Chord | 6 | SS- | weaponDamage 0.35; fireRate 0.16; pierce 2 |
| mage | Hexcraft | pierce | Ash Script · pierce | 1 | D | weaponDamage 0.04; reloadReduction 0.02 |
| mage | Hexcraft | pierce | Resonant Ink · pierce | 2 | C | weaponDamage 0.05; reloadReduction 0.025 |
| mage | Hexcraft | pierce | Split Glyph · pierce | 3 | B | weaponDamage 0.07; reloadReduction 0.03 |
| mage | Hexcraft | pierce | Grave Arithmetic · pierce | 4 | A | weaponDamage 0.09; reloadReduction 0.035 |
| mage | Hexcraft | pierce | Forbidden Meter · pierce | 5 | S | weaponDamage 0.12; reloadReduction 0.04 |
| mage | Hexcraft | pierce | The Silent Chord · pierce | 6 | SS | weaponDamage 0.18; reloadReduction 0.05; pierce 3 |
| mage | Hexcraft | extraShots | Ash Script · extraShots | 1 | D+ | fireRate 0.06; magazine 0 |
| mage | Hexcraft | extraShots | Resonant Ink · extraShots | 2 | C+ | fireRate 0.07; magazine 1 |
| mage | Hexcraft | extraShots | Split Glyph · extraShots | 3 | B+ | fireRate 0.08; magazine 0 |
| mage | Hexcraft | extraShots | Grave Arithmetic · extraShots | 4 | A+ | fireRate 0.1; magazine 1 |
| mage | Hexcraft | extraShots | Forbidden Meter · extraShots | 5 | S+ | fireRate 0.12; magazine 0 |
| mage | Hexcraft | extraShots | The Silent Chord · extraShots | 6 | SS+ | fireRate 0.16; magazine 2; extraShots 1 |
| mage | Control | abilityPotency | Marked Ground | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| mage | Control | abilityPotency | Patient Circle | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| mage | Control | abilityPotency | Deep Binding | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| mage | Control | abilityPotency | Echoing Ward | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| mage | Control | abilityPotency | Bell Geometry | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| mage | Control | abilityPotency | Name the Storm | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; sigilRadius 0.5; ultimatePulses 1 |
| mage | Control | Silent Twelfth | Marked Ground · Silent Twelfth | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| mage | Control | Silent Twelfth | Patient Circle · Silent Twelfth | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| mage | Control | Silent Twelfth | Deep Binding · Silent Twelfth | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| mage | Control | Silent Twelfth | Echoing Ward · Silent Twelfth | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| mage | Control | Silent Twelfth | Bell Geometry · Silent Twelfth | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| mage | Control | Silent Twelfth | Name the Storm · Silent Twelfth | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimatePulses 1 |
| mage | Control | Binding Sigil | Marked Ground · Binding Sigil | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; sigilRadius 0.03 |
| mage | Control | Binding Sigil | Patient Circle · Binding Sigil | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; sigilRadius 0.04 |
| mage | Control | Binding Sigil | Deep Binding · Binding Sigil | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; sigilRadius 0.05 |
| mage | Control | Binding Sigil | Echoing Ward · Binding Sigil | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; sigilRadius 0.07 |
| mage | Control | Binding Sigil | Bell Geometry · Binding Sigil | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; sigilRadius 0.1 |
| mage | Control | Binding Sigil | Name the Storm · Binding Sigil | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; sigilRadius 0.16; ultimatePulses 1 |
| mage | Warding | maxHealth | Paper Seal | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| mage | Warding | maxHealth | Bone Charm | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| mage | Warding | maxHealth | Quiet Mantle | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| mage | Warding | maxHealth | Stolen Breath | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| mage | Warding | maxHealth | Salted Hem | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| mage | Warding | maxHealth | A Circle Remains | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| mage | Warding | dodgeCooldown | Paper Seal · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| mage | Warding | dodgeCooldown | Bone Charm · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| mage | Warding | dodgeCooldown | Quiet Mantle · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| mage | Warding | dodgeCooldown | Stolen Breath · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| mage | Warding | dodgeCooldown | Salted Hem · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| mage | Warding | dodgeCooldown | A Circle Remains · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| mage | Warding | reviveRate | Paper Seal · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| mage | Warding | reviveRate | Bone Charm · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| mage | Warding | reviveRate | Quiet Mantle · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| mage | Warding | reviveRate | Stolen Breath · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| mage | Warding | reviveRate | Salted Hem · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| mage | Warding | reviveRate | A Circle Remains · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| engineer | Demolitions | weaponDamage | Fine Teeth | 1 | D- | weaponDamage 0.08; fireRate 0 |
| engineer | Demolitions | weaponDamage | Charged Rivets | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| engineer | Demolitions | weaponDamage | Spare Barrel | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| engineer | Demolitions | weaponDamage | Impact Fuse | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| engineer | Demolitions | weaponDamage | Overclock | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| engineer | Demolitions | weaponDamage | Turn the Key | 6 | SS- | weaponDamage 0.35; fireRate 0.16; turretDamage 0.5 |
| engineer | Demolitions | turretDamage | Fine Teeth · turretDamage | 1 | D | weaponDamage 0.03; turretDamage 0.04 |
| engineer | Demolitions | turretDamage | Charged Rivets · turretDamage | 2 | C | weaponDamage 0.04; turretDamage 0.05 |
| engineer | Demolitions | turretDamage | Spare Barrel · turretDamage | 3 | B | weaponDamage 0.05; turretDamage 0.06 |
| engineer | Demolitions | turretDamage | Impact Fuse · turretDamage | 4 | A | weaponDamage 0.06; turretDamage 0.08 |
| engineer | Demolitions | turretDamage | Overclock · turretDamage | 5 | S | weaponDamage 0.08; turretDamage 0.1 |
| engineer | Demolitions | turretDamage | Turn the Key · turretDamage | 6 | SS | weaponDamage 0.12; turretDamage 0.2 |
| engineer | Demolitions | fireRate | Fine Teeth · fireRate | 1 | D+ | fireRate 0.06; magazine 1 |
| engineer | Demolitions | fireRate | Charged Rivets · fireRate | 2 | C+ | fireRate 0.07; magazine 1 |
| engineer | Demolitions | fireRate | Spare Barrel · fireRate | 3 | B+ | fireRate 0.08; magazine 2 |
| engineer | Demolitions | fireRate | Impact Fuse · fireRate | 4 | A+ | fireRate 0.1; magazine 2 |
| engineer | Demolitions | fireRate | Overclock · fireRate | 5 | S+ | fireRate 0.12; magazine 3 |
| engineer | Demolitions | fireRate | Turn the Key · fireRate | 6 | SS+ | fireRate 0.16; magazine 4; extraShots 1 |
| engineer | Constructs | abilityPotency | Level Footing | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| engineer | Constructs | abilityPotency | Fast Assembly | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| engineer | Constructs | abilityPotency | Spare Motor | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| engineer | Constructs | abilityPotency | Linked Repairs | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| engineer | Constructs | abilityPotency | Long Service | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| engineer | Constructs | abilityPotency | Two Hands More | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; extraTurrets 1; ultimateDuration 6 |
| engineer | Constructs | Impossible Machine | Level Footing · Impossible Machine | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| engineer | Constructs | Impossible Machine | Fast Assembly · Impossible Machine | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| engineer | Constructs | Impossible Machine | Spare Motor · Impossible Machine | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| engineer | Constructs | Impossible Machine | Linked Repairs · Impossible Machine | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| engineer | Constructs | Impossible Machine | Long Service · Impossible Machine | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| engineer | Constructs | Impossible Machine | Two Hands More · Impossible Machine | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimateDuration 6 |
| engineer | Constructs | Rivet Turret | Level Footing · Rivet Turret | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; turretDamage 0.04 |
| engineer | Constructs | Rivet Turret | Fast Assembly · Rivet Turret | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; turretDamage 0.05 |
| engineer | Constructs | Rivet Turret | Spare Motor · Rivet Turret | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; turretDamage 0.06 |
| engineer | Constructs | Rivet Turret | Linked Repairs · Rivet Turret | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; turretDamage 0.08 |
| engineer | Constructs | Rivet Turret | Long Service · Rivet Turret | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; turretDamage 0.1 |
| engineer | Constructs | Rivet Turret | Two Hands More · Rivet Turret | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; turretDamage 0.12; extraTurrets 1 |
| engineer | Repair | maxHealth | Work Gloves | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| engineer | Repair | maxHealth | Reinforced Apron | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| engineer | Repair | maxHealth | Patch Plate | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| engineer | Repair | maxHealth | Safe Ground | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| engineer | Repair | maxHealth | Measured Steps | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| engineer | Repair | maxHealth | A Thing Rebuilt | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| engineer | Repair | dodgeCooldown | Work Gloves · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| engineer | Repair | dodgeCooldown | Reinforced Apron · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| engineer | Repair | dodgeCooldown | Patch Plate · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| engineer | Repair | dodgeCooldown | Safe Ground · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| engineer | Repair | dodgeCooldown | Measured Steps · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| engineer | Repair | dodgeCooldown | A Thing Rebuilt · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| engineer | Repair | reviveRate | Work Gloves · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| engineer | Repair | reviveRate | Reinforced Apron · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| engineer | Repair | reviveRate | Patch Plate · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| engineer | Repair | reviveRate | Safe Ground · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| engineer | Repair | reviveRate | Measured Steps · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| engineer | Repair | reviveRate | A Thing Rebuilt · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |
| assassin | Precision | weaponDamage | Fine Needle | 1 | D- | weaponDamage 0.08; fireRate 0 |
| assassin | Precision | weaponDamage | Soft Trigger | 2 | C- | weaponDamage 0.1; fireRate 0.04 |
| assassin | Precision | weaponDamage | True Line | 3 | B- | weaponDamage 0.12; fireRate 0.06 |
| assassin | Precision | weaponDamage | Through the Seam | 4 | A- | weaponDamage 0.15; fireRate 0.08 |
| assassin | Precision | weaponDamage | Last Aperture | 5 | S- | weaponDamage 0.2; fireRate 0.12 |
| assassin | Precision | weaponDamage | A Single Thread | 6 | SS- | weaponDamage 0.35; fireRate 0.16; criticalChance 0.2 |
| assassin | Precision | criticalChance | Fine Needle · criticalChance | 1 | D | weaponDamage 0.04; criticalChance 0.02 |
| assassin | Precision | criticalChance | Soft Trigger · criticalChance | 2 | C | weaponDamage 0.05; criticalChance 0.03 |
| assassin | Precision | criticalChance | True Line · criticalChance | 3 | B | weaponDamage 0.07; criticalChance 0.04 |
| assassin | Precision | criticalChance | Through the Seam · criticalChance | 4 | A | weaponDamage 0.09; criticalChance 0.05 |
| assassin | Precision | criticalChance | Last Aperture · criticalChance | 5 | S | weaponDamage 0.12; criticalChance 0.06 |
| assassin | Precision | criticalChance | A Single Thread · criticalChance | 6 | SS | weaponDamage 0.18; criticalChance 0.15 |
| assassin | Precision | pierce | Fine Needle · pierce | 1 | D+ | fireRate 0.06; reloadReduction 0.02 |
| assassin | Precision | pierce | Soft Trigger · pierce | 2 | C+ | fireRate 0.07; reloadReduction 0.025 |
| assassin | Precision | pierce | True Line · pierce | 3 | B+ | fireRate 0.08; reloadReduction 0.03 |
| assassin | Precision | pierce | Through the Seam · pierce | 4 | A+ | fireRate 0.1; reloadReduction 0.035 |
| assassin | Precision | pierce | Last Aperture · pierce | 5 | S+ | fireRate 0.12; reloadReduction 0.04 |
| assassin | Precision | pierce | A Single Thread · pierce | 6 | SS+ | fireRate 0.16; reloadReduction 0.05; pierce 3 |
| assassin | Ambush | abilityPotency | Quiet Hem | 1 | D- | cooldownReduction 0.025; abilityPotency 0.05 |
| assassin | Ambush | abilityPotency | Hidden Route | 2 | C- | cooldownReduction 0.025; abilityPotency 0.05 |
| assassin | Ambush | abilityPotency | Long Veil | 3 | B- | cooldownReduction 0.04; abilityPotency 0.08; ultimateCooldownReduction 0.1 |
| assassin | Ambush | abilityPotency | Borrowed Shadow | 4 | A- | cooldownReduction 0.05; abilityPotency 0.1 |
| assassin | Ambush | abilityPotency | Safe Return | 5 | S- | cooldownReduction 0.06; abilityPotency 0.12; ultimateCooldownReduction 0.1; ultimatePotency 0.25 |
| assassin | Ambush | abilityPotency | No Witness | 6 | SS- | cooldownReduction 0.1; abilityPotency 0.2; veilDuration 0.5; ultimateCharges 1 |
| assassin | Ambush | Unwritten Passage | Quiet Hem · Unwritten Passage | 1 | D | ultimateCooldownReduction 0.015; ultimatePotency 0.025 |
| assassin | Ambush | Unwritten Passage | Hidden Route · Unwritten Passage | 2 | C | ultimateCooldownReduction 0.02; ultimatePotency 0.03 |
| assassin | Ambush | Unwritten Passage | Long Veil · Unwritten Passage | 3 | B | ultimateCooldownReduction 0.025; ultimatePotency 0.035 |
| assassin | Ambush | Unwritten Passage | Borrowed Shadow · Unwritten Passage | 4 | A | ultimateCooldownReduction 0.03; ultimatePotency 0.04 |
| assassin | Ambush | Unwritten Passage | Safe Return · Unwritten Passage | 5 | S | ultimateCooldownReduction 0.035; ultimatePotency 0.05 |
| assassin | Ambush | Unwritten Passage | No Witness · Unwritten Passage | 6 | SS | ultimateCooldownReduction 0.05; ultimatePotency 0.07; ultimateCharges 1 |
| assassin | Ambush | Invisibility | Quiet Hem · Invisibility | 1 | D+ | abilityPotency 0.04; cooldownReduction 0.015; veilDuration 0.03 |
| assassin | Ambush | Invisibility | Hidden Route · Invisibility | 2 | C+ | abilityPotency 0.06; cooldownReduction 0.02; veilDuration 0.04 |
| assassin | Ambush | Invisibility | Long Veil · Invisibility | 3 | B+ | abilityPotency 0.08; cooldownReduction 0.025; veilDuration 0.05 |
| assassin | Ambush | Invisibility | Borrowed Shadow · Invisibility | 4 | A+ | abilityPotency 0.1; cooldownReduction 0.035; veilDuration 0.07 |
| assassin | Ambush | Invisibility | Safe Return · Invisibility | 5 | S+ | abilityPotency 0.14; cooldownReduction 0.045; veilDuration 0.1 |
| assassin | Ambush | Invisibility | No Witness · Invisibility | 6 | SS+ | abilityPotency 0.2; cooldownReduction 0.06; veilDuration 0.16; ultimateCharges 1 |
| assassin | Evasion | maxHealth | Light Soles | 1 | D- | maxHealth 10; armor 0; regeneration 0 |
| assassin | Evasion | maxHealth | Loose Shoulders | 2 | C- | maxHealth 12; armor 0.03; regeneration 0.1 |
| assassin | Evasion | maxHealth | Narrow Escape | 3 | B- | maxHealth 15; armor 0.04; regeneration 0.15 |
| assassin | Evasion | maxHealth | Steady Pulse | 4 | A- | maxHealth 20; armor 0.05; regeneration 0.2 |
| assassin | Evasion | maxHealth | Afterimage | 5 | S- | maxHealth 25; armor 0.06; regeneration 0.25 |
| assassin | Evasion | maxHealth | Another Way Home | 6 | SS- | maxHealth 30; armor 0.1; regeneration 0.5; selfRevives 1 |
| assassin | Evasion | dodgeCooldown | Light Soles · dodgeCooldown | 1 | D | moveSpeed 0.015; dodgeCooldown -0.02 |
| assassin | Evasion | dodgeCooldown | Loose Shoulders · dodgeCooldown | 2 | C | moveSpeed 0.02; dodgeCooldown -0.025 |
| assassin | Evasion | dodgeCooldown | Narrow Escape · dodgeCooldown | 3 | B | moveSpeed 0.025; dodgeCooldown -0.03 |
| assassin | Evasion | dodgeCooldown | Steady Pulse · dodgeCooldown | 4 | A | moveSpeed 0.03; dodgeCooldown -0.035 |
| assassin | Evasion | dodgeCooldown | Afterimage · dodgeCooldown | 5 | S | moveSpeed 0.04; dodgeCooldown -0.04 |
| assassin | Evasion | dodgeCooldown | Another Way Home · dodgeCooldown | 6 | SS | moveSpeed 0.05; dodgeCooldown -0.05; armor 0.08 |
| assassin | Evasion | reviveRate | Light Soles · reviveRate | 1 | D+ | maxHealth 5; regeneration 0.05; reviveRate 0.02 |
| assassin | Evasion | reviveRate | Loose Shoulders · reviveRate | 2 | C+ | maxHealth 6; regeneration 0.06; reviveRate 0.03 |
| assassin | Evasion | reviveRate | Narrow Escape · reviveRate | 3 | B+ | maxHealth 8; regeneration 0.08; reviveRate 0.04 |
| assassin | Evasion | reviveRate | Steady Pulse · reviveRate | 4 | A+ | maxHealth 10; regeneration 0.1; reviveRate 0.06 |
| assassin | Evasion | reviveRate | Afterimage · reviveRate | 5 | S+ | maxHealth 12; regeneration 0.14; reviveRate 0.08 |
| assassin | Evasion | reviveRate | Another Way Home · reviveRate | 6 | SS+ | maxHealth 18; regeneration 0.22; reviveRate 0.12; selfRevives 1 |

## Weapons and class shops

All classes begin with their tier-zero weapon. Reserve ammunition is infinite; magazines and timed reload/refocus cycles preserve meaningful fire rhythm without hard ammunition soft locks. Pellets are individual projectiles. Spread is total cone width in degrees, speed is world px/s, damage is HP per hit, and pierce is additional targets after the first.

| Class / weapon | Price | Damage x pellets | Rate /s | Magazine | Reload s |
| --- | --- | --- | --- | --- | --- |
| soldier / Service Pistol | 0 | 16 x 1 | 3.3 | 10 | 1.3 |
| soldier / Watch Carbine | 240 | 13 x 1 | 5.5 | 24 | 1.6 |
| soldier / Threefold Rifle | 460 | 12 x 1 | 8 | 24 | 1.8 |
| soldier / Last Watch | 720 | 38 x 1 | 3.2 | 12 | 1.6 |
| heavy / Belt Gun | 0 | 10 x 1 | 7.5 | 45 | 2.4 |
| heavy / Drum Repeater | 240 | 13 x 1 | 8 | 60 | 2.6 |
| heavy / Foundry Rotary | 460 | 10 x 1 | 14 | 90 | 3 |
| heavy / Iron Choir | 720 | 24 x 1 | 8 | 48 | 2.7 |
| tank / Riot Shotgun | 0 | 8 x 5 | 1.7 | 6 | 1.8 |
| tank / Gate Breacher | 240 | 10 x 5 | 2 | 8 | 1.9 |
| tank / Slug Driver | 460 | 38 x 1 | 2.3 | 8 | 1.8 |
| tank / Scatter Bastion | 720 | 12 x 7 | 2.2 | 10 | 2 |
| medic / Injector Carbine | 0 | 14 x 1 | 3.5 | 14 | 1.5 |
| medic / Suture Repeater | 240 | 12 x 1 | 6 | 24 | 1.6 |
| medic / Serum Sprayer | 460 | 7 x 3 | 5 | 30 | 1.8 |
| medic / Lifeline Rifle | 720 | 27 x 1 | 4.5 | 18 | 1.7 |
| mage / Grave Wand | 0 | 24 x 1 | 2.5 | 8 | 1.5 |
| mage / Ash Scepter | 240 | 18 x 1 | 4 | 12 | 1.6 |
| mage / Bell Staff | 460 | 15 x 3 | 3.5 | 12 | 1.8 |
| mage / Ossuary Rod | 720 | 44 x 1 | 3.2 | 10 | 1.7 |
| engineer / Rivet Pistol | 0 | 15 x 1 | 3.5 | 12 | 1.4 |
| engineer / Nail Repeater | 240 | 11 x 1 | 6.5 | 28 | 1.7 |
| engineer / Arc Riveter | 460 | 23 x 1 | 4 | 18 | 1.7 |
| engineer / Siege Tool | 720 | 34 x 1 | 4.5 | 20 | 2 |
| assassin / Needle Launcher | 0 | 19 x 1 | 3.2 | 10 | 1.3 |
| assassin / Whisper Pistol | 240 | 15 x 1 | 5.5 | 18 | 1.4 |
| assassin / Spine Thrower | 460 | 12 x 3 | 4 | 16 | 1.6 |
| assassin / Veil Crossbow | 720 | 46 x 1 | 3 | 12 | 1.5 |

| Upgrade | Effect per level | Maximum | Initial / increase coins |
| --- | --- | --- | --- |
| Tempered Chamber | weaponDamage +0.14 | 5 | 90 / 60 |
| Feed Tuning | fireRate +0.07 | 5 | 80 / 50 |
| Reserve Clip | magazine +2 | 4 | 70 / 45 |
| Quick Hands | reloadReduction +0.08 | 4 | 80 / 55 |
| Lined Coat | maxHealth +10 | 3 | 100 / 70 |

| Supply | Coins | Effect | Cooldown s |
| --- | --- | --- | --- |
| Medkit | 90 | heal 45; duration 0 s | 3 |
| Adrenaline | 100 | moveSpeed 0.25; duration 6 s | 6 |
| Armor Plate | 110 | shield 45; duration 20 s | 5 |
| Antidote | 65 | cleanse 20; duration 0 s | 3 |
| Revive Kit | 140 | revive 0.65; duration 0 s | 8 |
| Barrier Charge | 120 | barrier 100; duration 5 s | 8 |
| Ammo Pouch | 70 | reload 1; duration 0 s | 4 |
| Focus Tonic | 110 | abilityCooldown 0.5; duration 0 s | 8 |

Three supply slots; maximum stack two. Purchases are atomic server transactions and deduct only after class compatibility, currency, quantity and phase checks pass. Coins and equipment reset at run end. No support player loses a completion payout because another player landed the final hit.

## Economy and recommendations

Campaign nominal cumulative coin income before fight j+1 is 120 + floor(2280*j/(R-1)); actual wallet balance subtracts purchases. Contract risk and active bounty mutations alter future rewards. The base route income is normalized so short routes do not become underpowered. Raid cumulative income budgets are 600,1400,2400. Deadlines and discounts never accept client-authored values.

Build rating = 50% normalized sustained offense + 25% normalized survival + 25% normalized support. Normalize each class against its own baseline, not against Soldier damage. Grade capacities increase by factor 1.1 across the 18 D- through SS+ grades. Use the same capacity lookup to generate equivalent squad-count recommendations and validate them; recommendations describe purchased builds, not human skill.

Published capacity formula: O = current weapon sustained DPS / starting weapon sustained DPS (including purchased weapon damage, fire rate, magazine and reload, excluding temporary buffs). V = (maxHP / baseHP) / (1 - permanentArmor), with armor capped at 0.65. S = (1 + purchased abilityPotency) / (1 - purchased Q/E cooldownReduction), with cooldown reduction capped at 0.60. Rating = 0.50*O + 0.25*V + 0.25*S. A baseline class rates 1. Grade g has capacity 1.1^g for g=0..17, D- to SS+. Display the greatest grade capacity no greater than rating, clamped at endpoints. Recommended total squad capacity = bossHP / (class-baseline reference DPS * 0.65 * deadlineSeconds), using the roster-independent HP coefficient and reference DPS equal to the median seven starting-weapon sustained DPS. For any selected grade, equivalent players = ceil(recommendedCapacity / gradeCapacity). The UI can show two equivalent examples generated from this same formula. Ratings inform choices; they do not gate joining or claim that support should outperform damage roles.

## Boss threat, timers and phases

Expanded roster: 60 distinct identities, comprising fifty route-specific bosses (9 Quarantine, 14 Midnight, 20 Pilgrimage, 7 Raid), nine Endless-only bosses and the optional secret Uncounted. The eleven-boss proof sheet is an early style sample, not the complete production roster. Each identity requires its own silhouette, signature mechanic, counterplay and phase presentation; recolors and threat variants do not increase the boss count. Full reference-sheet and animation production follows the first playable and 50-player feasibility gate.

Threat labels: 1 Normal; 2 Aberrant; 3 Predator; 4 Brute; 5 Scourge; 6 Dread; 7 Disaster; 8 Catastrophe; 9 Cataclysm; 10 Calamity; 11 The Uncounted (secret classification above ten). Threat and selected difficulty are independent.

Current fixed-grade health starts with 1800 * 1.22^(min(level,10)-1) * (1 + 0.08*subtier) * (timer/120) * archetypeHealthFactor, then applies party, difficulty, mutation and mode/form/cycle modifiers. Use the shared runtime helper and [fixed-threat specification](FIXED_BOSS_THREATS.md) for exact rules. Secret uses threat 10 health growth plus its authored health factor. Raid multiplies health by 1.25. This couples health to the encounter time budget without making longer timers synonymous with greater threat. Check all role builds against actual damage uptime before accepting the tuning.

The editable uptime-model.csv is an analytical feasibility check across every campaign/class/difficulty/fight/legal boss combination. It assumes 65% movement-and-aim uptime, 70% pellet hits for multi-pellet weapons, worst-phase armor duty cycle and affordable legal offensive builds. It excludes Q/E damage, ultimates, mutations and Accord Break bonuses. Passing this model is a preproduction calculation, not observed combat balance; measured attack uptime and human pacing remain gameplay gates.

Phases begin at 100%, 75% and 40% health. Phase transitions trigger optional Accord Breaks at 75% and 40%. Bosses telegraph before release; difficulty cannot reduce a telegraph below 0.45 s. Ordinary slow effects do not hard-stun bosses; accumulated control can create one 2 s stagger followed by 10 s resistance. Never permit an indefinite stun lock.

### Hollow Constable

A dead watch captain remembers every order except whom it was meant to protect. Home route short; minimum threat 1; deadline 120 s; health coefficient 1; radius 58 px; estimated attackable fraction 1. Signature: Lock aimed volleys at the warned target position and stamp arrest zones that slow survivors before expiring. Counterplay: Move after the volley locks, cross between the fan shots and leave outlined arrest zones before they activate. Mechanics: arrestZoneSlow=0.35; zoneDuration=3. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 7 | 160 | 12 | 3.2 / 0.85 |
| 1 / 1 | zone | 2 | 0 | 10 | 7 / 1.2 |
| 2 / 0.75 | fan | 9 | 173 | 12 | 2.88 / 0.85 |
| 2 / 0.75 | zone | 4 | 0 | 10 | 6.3 / 1.2 |
| 2 / 0.75 | lanes | 7 | 150 | 10 | 8.5 / 1.1 |
| 3 / 0.4 | fan | 11 | 186 | 12 | 2.56 / 0.85 |
| 3 / 0.4 | zone | 6 | 0 | 10 | 5.6 / 1.2 |
| 3 / 0.4 | ring | 18 | 130 | 10 | 8.2 / 1.25 |

### Carrion Courier

A messenger runs the same route after the streets and their names have disappeared. Home route short; minimum threat 1; deadline 90 s; health coefficient 0.75; radius 58 px; estimated attackable fraction 1. Signature: Charge through a locked straight lane, leaving a short damaging trail while crossing volleys divide the escape ground. Counterplay: Step perpendicular to the marked charge and cross its trail only after its visible timer expires. Mechanics: chargeTrailWidth=32; chargeTrailDuration=3; chargeTrailDamagePerSecond=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 420 | 18 | 5 / 1 |
| 1 / 1 | cross | 20 | 160 | 11 | 4 / 0.9 |
| 2 / 0.75 | charge | 1 | 454 | 18 | 4.5 / 1 |
| 2 / 0.75 | cross | 22 | 173 | 11 | 3.6 / 0.9 |
| 3 / 0.4 | charge | 1 | 487 | 18 | 4 / 1 |
| 3 / 0.4 | cross | 24 | 186 | 11 | 3.2 / 0.9 |

### Pallbearer

The coffin is empty. Its bearer keeps making room. Home route long; minimum threat 1; deadline 150 s; health coefficient 1.05; radius 58 px; estimated attackable fraction 1. Signature: Advance behind a resistant coffin front and moving cover, then commit to a long straight charge. Counterplay: Flank the coffin, use the moving cover against volleys and attack during the charge recovery. Mechanics: movingCoverHealth=180; movingCoverSpeed=75; coffinFrontResistance=0.5. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 330 | 22 | 7 / 1.1 |
| 1 / 1 | fan | 9 | 140 | 13 | 4.5 / 1 |
| 1 / 1 | armor | 1 | 0 | 0 | 13 / 1 |
| 2 / 0.75 | charge | 1 | 356 | 22 | 6.3 / 1.1 |
| 2 / 0.75 | fan | 11 | 151 | 13 | 4.05 / 1 |
| 2 / 0.75 | armor | 1 | 0 | 0 | 11.7 / 1 |
| 3 / 0.4 | charge | 1 | 383 | 22 | 5.6 / 1.1 |
| 3 / 0.4 | fan | 13 | 162 | 13 | 3.6 / 1 |
| 3 / 0.4 | armor | 1 | 0 | 0 | 10.4 / 1 |

### Cradle Matron

An infirmary keeper shelters the dead beneath a dress sewn from bed linen. Home route standard; minimum threat 1; deadline 150 s; health coefficient 1; radius 58 px; estimated attackable fraction 1. Signature: Build destructible nests that continuously summon bounded packs while slow expanding rings divide the arena. Counterplay: Destroy nests to control new arrivals, clear a path through the packs and cross each ring at its visible gap. Mechanics: nestHealth=100; nestSpawnInterval=6; nestMaximum=3; minionsPerNest=2. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | summon | 4 | 80 | 9 | 8 / 1.2 |
| 1 / 1 | ring | 20 | 120 | 11 | 6 / 1 |
| 2 / 0.75 | summon | 6 | 86 | 9 | 7.2 / 1.2 |
| 2 / 0.75 | ring | 22 | 130 | 11 | 5.4 / 1 |
| 3 / 0.4 | summon | 8 | 93 | 9 | 6.4 / 1.2 |
| 3 / 0.4 | ring | 24 | 139 | 11 | 4.8 / 1 |

### Mold Alchemist

A municipal chemist carries a garden that learned to grow without sunlight. Home route standard; minimum threat 1; deadline 150 s; health coefficient 0.95; radius 58 px; estimated attackable fraction 1. Signature: Place warned mold pools on changing ground while aimed fans limit the route between safe patches. Counterplay: Leave each landing circle before its safe window ends, and reserve a clear route to the next unmarked patch. Mechanics: poolSafeWindow=1.3; poolDuration=5. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pool | 3 | 0 | 10 | 6 / 1.3 |
| 1 / 1 | fan | 11 | 145 | 12 | 4 / 0.9 |
| 2 / 0.75 | pool | 5 | 0 | 10 | 5.4 / 1.3 |
| 2 / 0.75 | fan | 13 | 157 | 12 | 3.6 / 0.9 |
| 3 / 0.4 | pool | 7 | 0 | 10 | 4.8 / 1.3 |
| 3 / 0.4 | fan | 15 | 168 | 12 | 3.2 / 0.9 |

### Bellringer

Every note is a warning delivered too late. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.9; radius 58 px; estimated attackable fraction 1. Signature: Release expanding rings with a rotating timed gap while a slower spiral punishes standing still. Counterplay: Follow the hollow gap marker as it rotates and cross each ring rather than trying to outrun it. Mechanics: ringGapDegrees=35; gapRotationDegreesPerAttack=30. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 24 | 130 | 14 | 5.5 / 1.1 |
| 1 / 1 | spiral | 12 | 150 | 11 | 4 / 0.8 |
| 2 / 0.75 | pulse | 26 | 140 | 14 | 4.95 / 1.1 |
| 2 / 0.75 | spiral | 14 | 162 | 11 | 3.6 / 0.8 |
| 3 / 0.4 | pulse | 28 | 151 | 14 | 4.4 / 1.1 |
| 3 / 0.4 | spiral | 16 | 174 | 11 | 3.2 / 0.8 |

### Stitchwright

A surgeon of uniforms now mends the people who wore them. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.9; radius 58 px; estimated attackable fraction 1. Signature: Catch survivors with destructible rescue tethers while hooks and crossing lanes pressure their teammates. Counterplay: Shoot the outlined tether or channel its short rescue interaction; the bound survivor can still dodge and contribute. Mechanics: tetherHealth=45; tetherDuration=4; tetherRange=350; rescueChannelSeconds=1. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | hook | 3 | 230 | 15 | 5 / 1 |
| 1 / 1 | lanes | 18 | 170 | 13 | 6 / 1.1 |
| 2 / 0.75 | hook | 5 | 248 | 15 | 4.5 / 1 |
| 2 / 0.75 | lanes | 20 | 184 | 13 | 5.4 / 1.1 |
| 3 / 0.4 | hook | 7 | 267 | 15 | 4 / 1 |
| 3 / 0.4 | lanes | 22 | 197 | 13 | 4.8 / 1.1 |

### Grave Choir

The singers are separate corpses. The voice beneath them is singular. Home route standard; minimum threat 1; deadline 150 s; health coefficient 1; radius 58 px; estimated attackable fraction 1. Signature: Three coordinated casters offset their beam casts, leaving a readable sequence between the individual releases. Counterplay: Track the three numbered caster tells and move between locked beam directions; attacks remain visible without sound. Mechanics: casterCount=3; casterRadius=24; casterHealthFraction=0.34; beamOffsetSeconds=0.45. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 20 | 6 / 1.3 |
| 1 / 1 | spiral | 20 | 145 | 13 | 4 / 0.9 |
| 2 / 0.75 | beam | 5 | 0 | 20 | 5.4 / 1.3 |
| 2 / 0.75 | spiral | 22 | 157 | 13 | 3.6 / 0.9 |
| 3 / 0.4 | beam | 7 | 0 | 20 | 4.8 / 1.3 |
| 3 / 0.4 | spiral | 24 | 168 | 13 | 3.2 / 0.9 |

### Mortuary Engine

A foundry foreman is buried inside the machine that will not let him clock out. Home route long; minimum threat 1; deadline 180 s; health coefficient 1.15; radius 76 px; estimated attackable fraction 1. Signature: Alternate armored firing cycles with an exposed weak point while ordered lanes and broad fans cover the floor. Counterplay: Aim at the outlined weak point, use the firing gaps and save burst damage for the exposed cycle. Mechanics: weakPointRadius=26; weakPointDamageMultiplier=1.6; armorSeconds=4; armorResistance=0.6. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | armor | 1 | 0 | 0 | 15 / 1 |
| 1 / 1 | lanes | 26 | 170 | 15 | 6 / 1.2 |
| 1 / 1 | fan | 13 | 170 | 14 | 4.5 / 1 |
| 2 / 0.75 | armor | 1 | 0 | 0 | 13.5 / 1 |
| 2 / 0.75 | lanes | 28 | 184 | 15 | 5.4 / 1.2 |
| 2 / 0.75 | fan | 15 | 184 | 14 | 4.05 / 1 |
| 3 / 0.4 | armor | 1 | 0 | 0 | 12 / 1 |
| 3 / 0.4 | lanes | 30 | 197 | 15 | 4.8 / 1.2 |
| 3 / 0.4 | fan | 17 | 197 | 14 | 3.6 / 1 |

### Drowned Regent

The mayor opens the floodgates for a city that no longer breathes. Home route long; minimum threat 1; deadline 180 s; health coefficient 1.1; radius 58 px; estimated attackable fraction 1. Signature: Shift flooded ground and relocate among harmless decoys before announcing the true ring and pool attacks. Counterplay: Follow the solid true-body marker, use dry paths and wait for the relocation tell before committing a dodge. Mechanics: waterShiftInterval=12; waterSlow=0.2; decoyDuration=2; decoyMaximum=2. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | warp | 1 | 0 | 0 | 10 / 1.3 |
| 1 / 1 | ring | 30 | 150 | 16 | 5 / 1.1 |
| 1 / 1 | pool | 4 | 0 | 12 | 7 / 1.4 |
| 2 / 0.75 | warp | 1 | 0 | 0 | 9 / 1.3 |
| 2 / 0.75 | ring | 32 | 162 | 16 | 4.5 / 1.1 |
| 2 / 0.75 | pool | 6 | 0 | 12 | 6.3 / 1.4 |
| 3 / 0.4 | warp | 1 | 0 | 0 | 8 / 1.3 |
| 3 / 0.4 | ring | 34 | 174 | 16 | 4 / 1.1 |
| 3 / 0.4 | pool | 8 | 0 | 12 | 5.6 / 1.4 |

### The Uncounted

The bells remember the names the city refused to record. Home route secret; minimum threat 11; deadline 210 s; health coefficient 1.2; radius 58 px; estimated attackable fraction 1. Signature: Combine ledger echoes, announced relocations, offset beams and bounded summons after the campaign victory is banked. Counterplay: Use the persistent echo warnings and wide final ring gap, clear nearby summons and treat the extension as a separate challenge. Mechanics: ledgerEchoInterval=10; echoMaximum=4; finalRingGapDegrees=40. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | spiral | 28 | 165 | 17 | 4 / 1 |
| 1 / 1 | beam | 4 | 0 | 22 | 7 / 1.4 |
| 1 / 1 | warp | 1 | 0 | 0 | 12 / 1.3 |
| 1 / 1 | summon | 5 | 90 | 10 | 10 / 1.3 |
| 2 / 0.75 | spiral | 30 | 178 | 17 | 3.6 / 1 |
| 2 / 0.75 | beam | 6 | 0 | 22 | 6.3 / 1.4 |
| 2 / 0.75 | warp | 1 | 0 | 0 | 10.8 / 1.3 |
| 2 / 0.75 | summon | 7 | 97 | 10 | 9 / 1.3 |
| 3 / 0.4 | spiral | 32 | 191 | 17 | 3.2 / 1 |
| 3 / 0.4 | beam | 8 | 0 | 22 | 5.6 / 1.4 |
| 3 / 0.4 | warp | 1 | 0 | 0 | 9.6 / 1.3 |
| 3 / 0.4 | summon | 9 | 104 | 10 | 8 / 1.3 |

### The Tollkeeper

A corpse toll collector crouched behind one enormous coin wheel. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 105 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Roll a coin wheel down a marked lane; it banks off one wall and returns along the reflected path. Counterplay: Follow the two-segment floor arrow and cross after the wheel passes. Mechanics: wheelRadiusPx=42; wheelSpeedPxPerSecond=260; bounces=1; warningSeconds=1.2; cycleSeconds=7. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 12 | 155 | 11 | 5 / 1.2 |
| 1 / 1 | ring | 14 | 125 | 10 | 7 / 1 |
| 2 / 0.75 | lanes | 14 | 167 | 11 | 4.5 / 1.2 |
| 2 / 0.75 | ring | 16 | 135 | 10 | 6.3 / 1 |
| 3 / 0.4 | lanes | 16 | 180 | 11 | 4 / 1.2 |
| 3 / 0.4 | ring | 18 | 145 | 10 | 5.6 / 1 |

### Lantern Warden

A tall dead lamplighter with one caged lantern and a clean triangular coat. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Rotate a narrow cone of falling sparks around the lantern, with a clear trailing safe wedge. Counterplay: Move behind the marked cone; its ground boundary remains visible with reduced effects. Mechanics: coneDegrees=55; rotationDegreesPerSecond=24; warningSeconds=1.2; activeSeconds=4; restSeconds=4. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 7 | 145 | 11 | 4 / 1 |
| 1 / 1 | zone | 2 | 0 | 9 | 8 / 1.2 |
| 2 / 0.75 | fan | 9 | 157 | 11 | 3.6 / 1 |
| 2 / 0.75 | zone | 4 | 0 | 9 | 7.2 / 1.2 |
| 3 / 0.4 | fan | 11 | 168 | 11 | 3.2 / 1 |
| 3 / 0.4 | zone | 6 | 0 | 9 | 6.4 / 1.2 |

### Ratcatcher

A hunched pest-control corpse with a large sack and hooked walking stick. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Send three rat packs along visible scent lanes; striking the sack interrupts the next pack. Counterplay: Break the outlined sack weak point or cross between the three trails. Mechanics: packs=3; ratsPerPack=4; ratHealthHP=12; packSpeedPxPerSecond=125; sackHealthHP=65; spawnIntervalSeconds=7. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | summon | 3 | 100 | 8 | 8 / 1.2 |
| 1 / 1 | cross | 12 | 135 | 10 | 6 / 1 |
| 2 / 0.75 | summon | 5 | 108 | 8 | 7.2 / 1.2 |
| 2 / 0.75 | cross | 14 | 146 | 10 | 5.4 / 1 |
| 3 / 0.4 | summon | 7 | 116 | 8 | 6.4 / 1.2 |
| 3 / 0.4 | cross | 16 | 157 | 10 | 4.8 / 1 |

### Quarantine Clerk

A thin undead clerk carrying a broad folded ledger and red sealing stamp. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Stamp three ground zones in sequence, then reopen the first zone as the guaranteed safe space. Counterplay: Read the numbered outline sequence and move into the erased first stamp. Mechanics: zones=3; zoneRadiusPx=82; spacingSeconds=0.65; warningSeconds=1.3; activeSeconds=2.5; safeZoneIndex=0. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | zone | 3 | 0 | 10 | 7 / 1.3 |
| 1 / 1 | fan | 9 | 150 | 11 | 5 / 1 |
| 2 / 0.75 | zone | 5 | 0 | 10 | 6.3 / 1.3 |
| 2 / 0.75 | fan | 11 | 162 | 11 | 4.5 / 1 |
| 3 / 0.4 | zone | 7 | 0 | 10 | 5.6 / 1.3 |
| 3 / 0.4 | fan | 13 | 174 | 11 | 4 / 1 |

### Chain Marshal

A dead gate marshal in a rectangular iron coat carrying two heavy chains. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Anchor two chains to wall sockets and sweep the marked sectors once before the anchors break. Counterplay: Stand in either unswept quadrant or destroy an anchor to widen the gap. Mechanics: anchors=2; anchorHealthHP=90; chainWidthPx=18; sweepDegrees=80; sweepSeconds=2.5; warningSeconds=1.4; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | hook | 2 | 190 | 14 | 6 / 1.2 |
| 1 / 1 | fan | 13 | 155 | 12 | 5 / 1 |
| 2 / 0.75 | hook | 4 | 205 | 14 | 5.4 / 1.2 |
| 2 / 0.75 | fan | 15 | 167 | 12 | 4.5 / 1 |
| 3 / 0.4 | hook | 6 | 220 | 14 | 4.8 / 1.2 |
| 3 / 0.4 | fan | 17 | 180 | 12 | 4 / 1 |

### Gate Widow

A mourning corpse whose veil is a single large gate-shaped iron frame. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Close two portcullis lanes while raising the third; rotate the open lane after each cast. Counterplay: Use the plainly outlined open lane and wait for the next audible latch cue. Mechanics: lanes=3; openLanes=1; gateWidthPx=150; warningSeconds=1.5; closedSeconds=3.5; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 18 | 145 | 13 | 6 / 1.4 |
| 1 / 1 | pulse | 22 | 125 | 12 | 7 / 1.2 |
| 2 / 0.75 | lanes | 20 | 157 | 13 | 5.4 / 1.4 |
| 2 / 0.75 | pulse | 24 | 135 | 12 | 6.3 / 1.2 |
| 3 / 0.4 | lanes | 22 | 168 | 13 | 4.8 / 1.4 |
| 3 / 0.4 | pulse | 26 | 145 | 12 | 5.6 / 1.2 |

### Black Ambulance

A horse-shaped mortuary ambulance fused to its skeletal driver and one bell. The quarantine left its work unfinished. Home route short; minimum threat 1; deadline 150 s; health coefficient 0.748; radius 58 px; estimated attackable fraction 0.85. Signature: Circle the perimeter, stop at a marked station, then charge a straight rescue lane. Counterplay: Avoid the telegraphed destination; the stationary recovery exposes the driver. Mechanics: perimeterSpeedPxPerSecond=140; chargeSpeedPxPerSecond=380; chargeWarningSeconds=1.4; recoverySeconds=3; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 380 | 18 | 10 / 1.4 |
| 1 / 1 | cross | 16 | 145 | 11 | 6 / 1 |
| 2 / 0.75 | charge | 1 | 410 | 18 | 9 / 1.4 |
| 2 / 0.75 | cross | 18 | 157 | 11 | 5.4 / 1 |
| 3 / 0.4 | charge | 1 | 441 | 18 | 8 / 1.4 |
| 3 / 0.4 | cross | 20 | 168 | 11 | 4.8 / 1 |

### Glass Surgeon

A slender corpse surgeon with one transparent glass arm and an ivory apron. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Place four glass needles that connect into a temporary polygon with one deliberately missing edge. Counterplay: Leave through the missing edge before the outlined polygon activates. Mechanics: needles=4; needleHealthHP=35; beamWidthPx=14; warningSeconds=1.4; activeSeconds=2.5; missingEdges=1; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 13 | 8 / 1.4 |
| 1 / 1 | fan | 9 | 155 | 11 | 5 / 1 |
| 2 / 0.75 | beam | 5 | 0 | 13 | 7.2 / 1.4 |
| 2 / 0.75 | fan | 11 | 167 | 11 | 4.5 / 1 |
| 3 / 0.4 | beam | 7 | 0 | 13 | 6.4 / 1.4 |
| 3 / 0.4 | fan | 13 | 180 | 11 | 4 / 1 |

### Ash Baker

A broad dead baker with a shovel and a single round brick-oven torso. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Eject slow loaves that split once into two clearly announced crumbs after landing. Counterplay: Step away from the landing circles and the two marked split directions. Mechanics: loaves=3; loafSpeedPxPerSecond=100; splitAfterSeconds=1.5; crumbsPerLoaf=2; crumbSpeedPxPerSecond=165; warningSeconds=1.2. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pool | 3 | 0 | 9 | 7 / 1.2 |
| 1 / 1 | fan | 6 | 145 | 11 | 5 / 1 |
| 2 / 0.75 | pool | 5 | 0 | 9 | 6.3 / 1.2 |
| 2 / 0.75 | fan | 8 | 157 | 11 | 4.5 / 1 |
| 3 / 0.4 | pool | 7 | 0 | 9 | 5.6 / 1.2 |
| 3 / 0.4 | fan | 10 | 168 | 11 | 4 / 1 |

### Sluice Keeper

A drowned municipal worker hauling one circular floodgate on his back. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Open alternating channels that push players sideways without dealing damage; bullets still require dodging. Counterplay: Use the dry elevated strips or steer against the announced current. Mechanics: currentForcePxPerSecond=65; currentWidthPx=190; currentSeconds=4; warningSeconds=1.5; channels=3; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 16 | 135 | 11 | 6 / 1.2 |
| 1 / 1 | ring | 18 | 120 | 10 | 7 / 1 |
| 2 / 0.75 | lanes | 18 | 146 | 11 | 5.4 / 1.2 |
| 2 / 0.75 | ring | 20 | 130 | 10 | 6.3 / 1 |
| 3 / 0.4 | lanes | 20 | 157 | 11 | 4.8 / 1.2 |
| 3 / 0.4 | ring | 22 | 139 | 10 | 5.6 / 1 |

### Last Stationmaster

A rigid dead conductor with a huge ticket punch and broad signal flags. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Alternate two rail lanes; a red signal closes one and a white signal opens its partner. Counterplay: Follow the distinct cross and arrow symbols rather than signal color alone. Mechanics: railWidthPx=125; rails=2; trainSpeedPxPerSecond=300; warningSeconds=1.5; cycleSeconds=7. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 300 | 17 | 7 / 1.5 |
| 1 / 1 | cross | 16 | 145 | 11 | 5 / 1 |
| 2 / 0.75 | charge | 1 | 324 | 17 | 6.3 / 1.5 |
| 2 / 0.75 | cross | 18 | 157 | 11 | 4.5 / 1 |
| 3 / 0.4 | charge | 1 | 348 | 17 | 5.6 / 1.5 |
| 3 / 0.4 | cross | 20 | 168 | 11 | 4 / 1 |

### The Lamplighter

A long-limbed corpse carrying a three-pronged civic candle ladder. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Ignite three large candles whose shadows mark the only three safe pockets during the next pulse. Counterplay: Stand in an outlined shadow pocket; hazard boundaries remain visible in every display setting. Mechanics: candles=3; safeRadiusPx=95; pulseWarningSeconds=1.5; pulseSeconds=1.2; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 24 | 125 | 12 | 8 / 1.5 |
| 1 / 1 | fan | 8 | 150 | 10 | 5 / 1 |
| 2 / 0.75 | pulse | 26 | 135 | 12 | 7.2 / 1.5 |
| 2 / 0.75 | fan | 10 | 162 | 10 | 4.5 / 1 |
| 3 / 0.4 | pulse | 28 | 145 | 12 | 6.4 / 1.5 |
| 3 / 0.4 | fan | 12 | 174 | 10 | 4 / 1 |

### The Anatomist

A corpse lecturer with a clean bone torso chart and oversized calipers. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Mark two players for a delayed caliper snap, preserving their last marked positions. Counterplay: Leave the fixed marked circles; warning icons show the target lock has ended. Mechanics: markedPlayersMaximum=2; markRadiusPx=70; lockSeconds=0.7; warningSeconds=1.6; snapDamageHP=16; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | zone | 2 | 0 | 12 | 8 / 1.6 |
| 1 / 1 | fan | 11 | 145 | 11 | 5 / 1 |
| 2 / 0.75 | zone | 4 | 0 | 12 | 7.2 / 1.6 |
| 2 / 0.75 | fan | 13 | 157 | 11 | 4.5 / 1 |
| 3 / 0.4 | zone | 6 | 0 | 12 | 6.4 / 1.6 |
| 3 / 0.4 | fan | 15 | 168 | 11 | 4 / 1 |

### Plague Gardener

A corpse gardener under a broad wilted leaf cape carrying one pruning hook. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Grow vines along four marked radial strips, then cut one strip into a restorative path. Counterplay: Use the cut strip; destroying a root shortens the growth phase. Mechanics: roots=4; rootHealthHP=70; vineWidthPx=35; growthSeconds=3; cutPathHealHP=10; warningSeconds=1.4; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | zone | 4 | 0 | 9 | 9 / 1.4 |
| 1 / 1 | spiral | 14 | 130 | 10 | 6 / 1 |
| 2 / 0.75 | zone | 6 | 0 | 9 | 8.1 / 1.4 |
| 2 / 0.75 | spiral | 16 | 140 | 10 | 5.4 / 1 |
| 3 / 0.4 | zone | 8 | 0 | 9 | 7.2 / 1.4 |
| 3 / 0.4 | spiral | 18 | 151 | 10 | 4.8 / 1 |

### Red Abbess

An undead abbess with one broad red stole and an iron hymn book. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Move two sanctuaries around the arena before a slow outside-in judgment wave. Counterplay: Reach either sanctuary; any survivor can hold its neutralizing pad. Mechanics: sanctuaries=2; safeRadiusPx=100; padHoldSeconds=1.2; warningSeconds=1.6; waveSpeedPxPerSecond=90; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 26 | 120 | 13 | 8 / 1.6 |
| 1 / 1 | beam | 2 | 0 | 15 | 9 / 1.4 |
| 2 / 0.75 | pulse | 28 | 130 | 13 | 7.2 / 1.6 |
| 2 / 0.75 | beam | 4 | 0 | 15 | 8.1 / 1.4 |
| 3 / 0.4 | pulse | 30 | 139 | 13 | 6.4 / 1.6 |
| 3 / 0.4 | beam | 6 | 0 | 15 | 7.2 / 1.4 |

### Vesper Judge

A dead magistrate with a massive split gavel and simple half-white cloak. The quarantine left its work unfinished. Home route standard; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Present a left or right floor verdict, then strike that half while the other half stays open. Counterplay: Move across the central boundary during the long verdict tell; no class-specific interaction is needed. Mechanics: verdictHalfWidthPx=800; warningSeconds=1.7; strikeSeconds=0.6; recoverySeconds=2.8; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 22 | 145 | 13 | 7 / 1.5 |
| 1 / 1 | fan | 15 | 155 | 12 | 5 / 1.1 |
| 2 / 0.75 | lanes | 24 | 157 | 13 | 6.3 / 1.5 |
| 2 / 0.75 | fan | 17 | 167 | 12 | 4.5 / 1.1 |
| 3 / 0.4 | lanes | 26 | 168 | 13 | 5.6 / 1.5 |
| 3 / 0.4 | fan | 19 | 180 | 12 | 4 / 1.1 |

### Cinder Foreman

A blocky corpse foreman with a broad coal shovel and one furnace eye. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Assign three marked work zones; the last occupied zone cools while the other two vent. Counterplay: Touch the reachable neutral cooling switch or use the naturally safe third sector. Mechanics: zones=3; ventRadiusPx=105; coolHoldSeconds=1.2; warningSeconds=1.5; ventSeconds=3; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | zone | 3 | 0 | 11 | 8 / 1.5 |
| 1 / 1 | fan | 10 | 150 | 12 | 5 / 1 |
| 2 / 0.75 | zone | 5 | 0 | 11 | 7.2 / 1.5 |
| 2 / 0.75 | fan | 12 | 162 | 12 | 4.5 / 1 |
| 3 / 0.4 | zone | 7 | 0 | 11 | 6.4 / 1.5 |
| 3 / 0.4 | fan | 14 | 174 | 12 | 4 / 1 |

### Canal Diver

A drowned diver in a cracked spherical brass helmet with a short anchor. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 120 s; health coefficient 0.704; radius 58 px; estimated attackable fraction 0.8. Signature: Dive into one of three visible puddles and emerge from the one that starts bubbling first. Counterplay: Read the expanding ring and move clear; the full resurfacing recovery is attackable. Mechanics: puddles=3; puddleRadiusPx=65; diveSeconds=1.8; resurfaceWarningSeconds=1.5; recoverySeconds=4; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | warp | 1 | 0 | 0 | 9 / 1.5 |
| 1 / 1 | ring | 22 | 130 | 11 | 6 / 1 |
| 2 / 0.75 | warp | 1 | 0 | 0 | 8.1 / 1.5 |
| 2 / 0.75 | ring | 24 | 140 | 11 | 5.4 / 1 |
| 3 / 0.4 | warp | 1 | 0 | 0 | 7.2 / 1.5 |
| 3 / 0.4 | ring | 26 | 151 | 11 | 4.8 / 1 |

### Clockmender

A dead clockmaker with one huge exposed clock face and two winding keys. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Stop a ring of slow bullets visibly, then restart it in the same direction after a counted warning. Counterplay: Cross the stationary ring before the three-beat restart cue ends. Mechanics: stopAfterSeconds=1.4; stationarySeconds=2; restartWarningSeconds=1.2; ringBullets=24; bulletSpeedPxPerSecond=125; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | ring | 24 | 125 | 11 | 8 / 1.2 |
| 1 / 1 | fan | 9 | 150 | 11 | 5 / 1 |
| 2 / 0.75 | ring | 26 | 135 | 11 | 7.2 / 1.2 |
| 2 / 0.75 | fan | 11 | 162 | 11 | 4.5 / 1 |
| 3 / 0.4 | ring | 28 | 145 | 11 | 6.4 / 1.2 |
| 3 / 0.4 | fan | 13 | 174 | 11 | 4 / 1 |

### Seamstress of Wires

An undead seamstress with a smooth iron hoop skirt and two wire spools. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Sew a visible zigzag fence between three anchors, leaving one 170-pixel doorway. Counterplay: Use the stable doorway or break an anchor to remove its adjoining wire. Mechanics: anchors=3; anchorHealthHP=80; wireWidthPx=14; doorwayWidthPx=170; warningSeconds=1.5; activeSeconds=4; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 13 | 9 / 1.5 |
| 1 / 1 | hook | 2 | 180 | 12 | 6 / 1.2 |
| 2 / 0.75 | beam | 5 | 0 | 13 | 8.1 / 1.5 |
| 2 / 0.75 | hook | 4 | 194 | 12 | 5.4 / 1.2 |
| 3 / 0.4 | beam | 7 | 0 | 13 | 7.2 / 1.5 |
| 3 / 0.4 | hook | 6 | 209 | 12 | 4.8 / 1.2 |

### Gravedigger

A hunched burial worker with an enormous flat spade and one plain grave marker. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Lift a moving ridge of earth that blocks hostile bullets and then collapses into marked pits. Counterplay: Use the ridge as cover briefly, then step off the outlined collapse path. Mechanics: ridgeWidthPx=220; ridgeHealthHP=150; ridgeSpeedPxPerSecond=65; collapseWarningSeconds=1.5; pitSeconds=3; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 260 | 17 | 8 / 1.5 |
| 1 / 1 | zone | 3 | 0 | 10 | 9 / 1.4 |
| 2 / 0.75 | charge | 1 | 281 | 17 | 7.2 / 1.5 |
| 2 / 0.75 | zone | 5 | 0 | 10 | 8.1 / 1.4 |
| 3 / 0.4 | charge | 1 | 302 | 17 | 6.4 / 1.5 |
| 3 / 0.4 | zone | 7 | 0 | 10 | 7.2 / 1.4 |

### Ink Notary

A narrow dead notary with a single oversized quill and an ink-black paper cloak. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Draw an incomplete spiral of ink on the ground, leaving its mouth visibly open before activation. Counterplay: Exit through the opening rather than crossing the ink stroke after it hardens. Mechanics: strokeWidthPx=26; openingDegrees=65; drawSeconds=2; warningSeconds=1.4; inkSeconds=3; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | spiral | 18 | 130 | 11 | 6 / 1.2 |
| 1 / 1 | pool | 2 | 0 | 10 | 8 / 1.4 |
| 2 / 0.75 | spiral | 20 | 140 | 11 | 5.4 / 1.2 |
| 2 / 0.75 | pool | 4 | 0 | 10 | 7.2 / 1.4 |
| 3 / 0.4 | spiral | 22 | 151 | 11 | 4.8 / 1.2 |
| 3 / 0.4 | pool | 6 | 0 | 10 | 6.4 / 1.4 |

### Spore Beekeeper

A dead beekeeper with one large honeycomb fungus cage and a quiet canvas veil. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Send three hive drones to fixed posts; destroying a drone opens a whole wedge in the next swarm. Counterplay: Focus one outlined drone or use the permanently open fallback wedge. Mechanics: drones=3; droneHealthHP=55; swarmBullets=24; fallbackGapDegrees=45; warningSeconds=1.5; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | summon | 3 | 85 | 8 | 10 / 1.5 |
| 1 / 1 | pulse | 24 | 120 | 11 | 8 / 1.4 |
| 2 / 0.75 | summon | 5 | 92 | 8 | 9 / 1.5 |
| 2 / 0.75 | pulse | 26 | 130 | 11 | 7.2 / 1.4 |
| 3 / 0.4 | summon | 7 | 99 | 8 | 8 / 1.5 |
| 3 / 0.4 | pulse | 28 | 139 | 11 | 6.4 / 1.4 |

### Ice Custodian

A corpse icehouse keeper in a pale square coat carrying a large cold-iron tongs. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Freeze three marked floor strips, creating bounded sideways sliding only while players choose to stand there. Counterplay: Use the dry strips; dodge remains responsive and never adds uncontrolled momentum. Mechanics: strips=3; stripWidthPx=120; slideAccelerationPxPerSecondSquared=80; maximumSlidePxPerSecond=45; warningSeconds=1.5; frozenSeconds=4; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 18 | 135 | 11 | 6 / 1.2 |
| 1 / 1 | fan | 9 | 145 | 10 | 5 / 1 |
| 2 / 0.75 | lanes | 20 | 146 | 11 | 5.4 / 1.2 |
| 2 / 0.75 | fan | 11 | 157 | 10 | 4.5 / 1 |
| 3 / 0.4 | lanes | 22 | 157 | 11 | 4.8 / 1.2 |
| 3 / 0.4 | fan | 13 | 168 | 10 | 4 / 1 |

### Bridge Ferryman

A drowned ferryman carrying a broad ferry pole and folded wooden footbridge. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Place two temporary bridges across explicitly marked dangerous water bands, then alternate which bridge remains open. Counterplay: Follow the open bridge arrow; all ground stays traversable with a safe outer bypass. Mechanics: bridges=2; bridgeWidthPx=180; outerBypassWidthPx=190; waterDamageHPPerSecond=8; warningSeconds=1.6; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pool | 3 | 0 | 8 | 9 / 1.6 |
| 1 / 1 | cross | 16 | 140 | 11 | 6 / 1.1 |
| 2 / 0.75 | pool | 5 | 0 | 8 | 8.1 / 1.6 |
| 2 / 0.75 | cross | 18 | 151 | 11 | 5.4 / 1.1 |
| 3 / 0.4 | pool | 7 | 0 | 8 | 7.2 / 1.6 |
| 3 / 0.4 | cross | 20 | 162 | 11 | 4.8 / 1.1 |

### Porcelain Mourner

A dead mourner under one large cracked porcelain mask and smooth ivory funeral cloth. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Shed four large mask fragments that act as moving cover; each fragment cracks before becoming a radial hazard. Counterplay: Use cover during its intact state and move away from the clearly cracking fragment. Mechanics: fragments=4; coverHealthHP=65; fragmentSpeedPxPerSecond=55; crackWarningSeconds=1.5; shardsPerFragment=6; shardSpeedPxPerSecond=140; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | ring | 16 | 125 | 11 | 7 / 1.1 |
| 1 / 1 | fan | 9 | 150 | 11 | 5 / 1 |
| 2 / 0.75 | ring | 18 | 135 | 11 | 6.3 / 1.1 |
| 2 / 0.75 | fan | 11 | 162 | 11 | 4.5 / 1 |
| 3 / 0.4 | ring | 20 | 145 | 11 | 5.6 / 1.1 |
| 3 / 0.4 | fan | 13 | 174 | 11 | 4 / 1 |

### Boiler Tender

A broad dead stoker with one oval pressure tank and a short valve wrench. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Charge pressure through three visible valves; turning any valve vents a safe wedge. Counterplay: Hold one neutral valve briefly, or take the always-available marked outer gap. Mechanics: valves=3; valveHoldSeconds=1.2; pressureSeconds=5; warningSeconds=1.6; safeWedgeDegrees=70; fallbackGapDegrees=45; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 26 | 130 | 12 | 9 / 1.6 |
| 1 / 1 | beam | 2 | 0 | 14 | 8 / 1.3 |
| 2 / 0.75 | pulse | 28 | 140 | 12 | 8.1 / 1.6 |
| 2 / 0.75 | beam | 4 | 0 | 14 | 7.2 / 1.3 |
| 3 / 0.4 | pulse | 30 | 151 | 12 | 7.2 / 1.6 |
| 3 / 0.4 | beam | 6 | 0 | 14 | 6.4 / 1.3 |

### Mirror Undertaker

A tall funeral corpse carrying a single oval silvered coffin lid. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Show one non-damaging reflection that copies a previous boss position; the real body retains its black foot marker. Counterplay: Use the persistent body marker and distinct hollow reflection outline; no invisible collision or surprise damage. Mechanics: reflections=1; positionDelaySeconds=1.5; reflectionSeconds=4; reflectionOpacity=0.35; warningSeconds=1.2; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | warp | 1 | 0 | 0 | 9 / 1.2 |
| 1 / 1 | fan | 12 | 150 | 12 | 5 / 1 |
| 2 / 0.75 | warp | 1 | 0 | 0 | 8.1 / 1.2 |
| 2 / 0.75 | fan | 14 | 162 | 12 | 4.5 / 1 |
| 3 / 0.4 | warp | 1 | 0 | 0 | 7.2 / 1.2 |
| 3 / 0.4 | fan | 16 | 174 | 12 | 4 / 1 |

### Chalk Magistrate

An undead survey judge with a broad black slate and one oversized chalk hand. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Draw a rectangle around a marked region, then erase one wall before the other three flash. Counterplay: Cross the erased wall during the long warning; no player is trapped by solid collision. Mechanics: walls=4; erasedWalls=1; wallWidthPx=22; rectangleWidthPx=420; rectangleHeightPx=280; warningSeconds=1.6; activeSeconds=1; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 14 | 8 / 1.6 |
| 1 / 1 | cross | 16 | 140 | 11 | 6 / 1 |
| 2 / 0.75 | beam | 5 | 0 | 14 | 7.2 / 1.6 |
| 2 / 0.75 | cross | 18 | 151 | 11 | 5.4 / 1 |
| 3 / 0.4 | beam | 7 | 0 | 14 | 6.4 / 1.6 |
| 3 / 0.4 | cross | 20 | 162 | 11 | 4.8 / 1 |

### Wire Harpist

A corpse musician carrying one triangular street-wire harp with wide empty gaps. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Pluck parallel strings in a fixed low-middle-high sequence, showing the next string with a thick dashed outline. Counterplay: Move between the numbered lanes; audio has a matching visual countdown. Mechanics: strings=3; stringWidthPx=18; sequence=[0,1,2]; spacingSeconds=0.8; warningSeconds=1.4; activeSeconds=0.45; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 13 | 8 / 1.4 |
| 1 / 1 | fan | 7 | 150 | 10 | 5 / 1 |
| 2 / 0.75 | beam | 5 | 0 | 13 | 7.2 / 1.4 |
| 2 / 0.75 | fan | 9 | 162 | 10 | 4.5 / 1 |
| 3 / 0.4 | beam | 7 | 0 | 13 | 6.4 / 1.4 |
| 3 / 0.4 | fan | 11 | 174 | 10 | 4 / 1 |

### Crow Shepherd

A dead shepherd in a broad black felt cape carrying one curved rook staff. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 120 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Call three geometric bird flocks along crossing trails; the flocks have discrete silhouettes rather than particle swarms. Counterplay: Read the three dashed paths and cross after their leading bird passes. Mechanics: flocks=3; birdsPerFlock=5; flockSpeedPxPerSecond=150; trailWidthPx=40; warningSeconds=1.5; cycleSeconds=8. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | cross | 15 | 150 | 10 | 8 / 1.5 |
| 1 / 1 | fan | 9 | 140 | 10 | 5 / 1 |
| 2 / 0.75 | cross | 17 | 162 | 10 | 7.2 / 1.5 |
| 2 / 0.75 | fan | 11 | 151 | 10 | 4.5 / 1 |
| 3 / 0.4 | cross | 19 | 174 | 10 | 6.4 / 1.5 |
| 3 / 0.4 | fan | 13 | 162 | 10 | 4 / 1 |

### Ledger Leech

A pale folded-book corpse with a thick black spine and one sealing ribbon. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Attach a visible paper seal to a player; walking through a neutral cleansing circle removes its slow before expiration. Counterplay: Use either cleansing circle or let the bounded slow expire; there is no stolen permanent currency or unavoidable damage. Mechanics: sealsMaximum=2; slowFraction=0.2; sealSeconds=4; cleansingCircles=2; cleanseRadiusPx=90; warningSeconds=1.4; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | hook | 2 | 180 | 10 | 9 / 1.4 |
| 1 / 1 | ring | 20 | 125 | 11 | 6 / 1 |
| 2 / 0.75 | hook | 4 | 194 | 10 | 8.1 / 1.4 |
| 2 / 0.75 | ring | 22 | 135 | 11 | 5.4 / 1 |
| 3 / 0.4 | hook | 6 | 209 | 10 | 7.2 / 1.4 |
| 3 / 0.4 | ring | 24 | 145 | 11 | 4.8 / 1 |

### Salt Patriarch

An immense funeral patriarch with a broad salt-white mantle and one black censer. The quarantine left its work unfinished. Home route long; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Move a salt boundary inward in three visible steps while opening two broad gates through the boundary. Counterplay: Pass through either gate and use an Accord pad to hold the next step briefly. Mechanics: steps=3; gateCount=2; gateWidthPx=200; stepWarningSeconds=1.6; boundaryWidthPx=25; holdSeconds=2; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 30 | 135 | 14 | 8 / 1.5 |
| 1 / 1 | spiral | 20 | 145 | 12 | 6 / 1.2 |
| 2 / 0.75 | pulse | 32 | 146 | 14 | 7.2 / 1.5 |
| 2 / 0.75 | spiral | 22 | 157 | 12 | 5.4 / 1.2 |
| 3 / 0.4 | pulse | 34 | 157 | 14 | 6.4 / 1.5 |
| 3 / 0.4 | spiral | 24 | 168 | 12 | 4.8 / 1.2 |

### Chain Colossus

A giant corpse assembled around one heavy anchor chain and a square iron rib cage. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 210 s; health coefficient 0.748; radius 58 px; estimated attackable fraction 0.85. Signature: Anchor to three pylons and pull a marked floor section; breaking one pylon creates a shared damage opening. Counterplay: Destroy any pylon or use the unobstructed outer lane; pylon health scales with roster. Mechanics: pylons=3; pylonHealthHP=110; pullSpeedPxPerSecond=45; pullSeconds=3; openingSeconds=4; warningSeconds=1.6; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | hook | 3 | 180 | 14 | 8 / 1.5 |
| 1 / 1 | lanes | 24 | 145 | 13 | 7 / 1.4 |
| 2 / 0.75 | hook | 5 | 194 | 14 | 7.2 / 1.5 |
| 2 / 0.75 | lanes | 26 | 157 | 13 | 6.3 / 1.4 |
| 3 / 0.4 | hook | 7 | 209 | 14 | 6.4 / 1.5 |
| 3 / 0.4 | lanes | 28 | 168 | 13 | 5.6 / 1.4 |

### Ossuary Leviathan

A long skeletal burial beast with three large readable ribs and one casket head. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 210 s; health coefficient 0.704; radius 58 px; estimated attackable fraction 0.8. Signature: Expose three rib weak points sequentially while the body moves along a predictable wide curve. Counterplay: Attack the numbered exposed rib and stay outside the thick body outline. Mechanics: ribs=3; weakPointRadiusPx=28; weakPointDamageMultiplier=1.5; exposureSeconds=3; bodySpeedPxPerSecond=70; warningSeconds=1.6; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 250 | 20 | 10 / 1.6 |
| 1 / 1 | fan | 18 | 145 | 13 | 6 / 1.2 |
| 2 / 0.75 | charge | 1 | 270 | 20 | 9 / 1.6 |
| 2 / 0.75 | fan | 20 | 157 | 13 | 5.4 / 1.2 |
| 3 / 0.4 | charge | 1 | 290 | 20 | 8 / 1.6 |
| 3 / 0.4 | fan | 22 | 168 | 13 | 4.8 / 1.2 |

### Bell Triplets

Three dead bronze bell keepers sharing one broad shoulder yoke. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 210 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Three keepers take turns casting; striking the highlighted keeper interrupts one crossing beam. Counterplay: Track the single highlighted caster; a fixed safe gap remains even without an interrupt. Mechanics: keepers=3; activeCasters=1; interruptHealthHP=95; beamDelaySeconds=0.65; safeGapPx=185; warningSeconds=1.5; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | beam | 3 | 0 | 16 | 9 / 1.5 |
| 1 / 1 | pulse | 28 | 130 | 13 | 8 / 1.4 |
| 2 / 0.75 | beam | 5 | 0 | 16 | 8.1 / 1.5 |
| 2 / 0.75 | pulse | 30 | 140 | 13 | 7.2 / 1.4 |
| 3 / 0.4 | beam | 7 | 0 | 16 | 7.2 / 1.5 |
| 3 / 0.4 | pulse | 32 | 151 | 13 | 6.4 / 1.4 |

### Quarantine Heart

A suspended municipal plague pump in a corpse chest with four broad ivory hoses. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 210 s; health coefficient 0.748; radius 58 px; estimated attackable fraction 0.85. Signature: Pump four streams toward the walls; any survivor can turn one valve to reverse a stream into the core. Counterplay: Use a neutral valve or maintain damage from the guaranteed open side; no particular class is required. Mechanics: hoses=4; valveHoldSeconds=1.5; reverseDamageHP=120; coreOpeningSeconds=4; streamWidthPx=28; warningSeconds=1.6; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 28 | 140 | 13 | 8 / 1.6 |
| 1 / 1 | pool | 3 | 0 | 10 | 10 / 1.5 |
| 2 / 0.75 | lanes | 30 | 151 | 13 | 7.2 / 1.6 |
| 2 / 0.75 | pool | 5 | 0 | 10 | 9 / 1.5 |
| 3 / 0.4 | lanes | 32 | 162 | 13 | 6.4 / 1.6 |
| 3 / 0.4 | pool | 7 | 0 | 10 | 8 / 1.5 |

### Crown Procession

A dead civic ruler borne on a large simple palanquin by four skeletal attendants. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 240 s; health coefficient 0.704; radius 58 px; estimated attackable fraction 0.8. Signature: Four attendants carry the throne along visible waypoints; defeating one lowers the throne for an opening. Counterplay: Focus any attendant or use the next scheduled throne rest; damage is never locked behind group participation. Mechanics: attendants=4; attendantHealthHP=90; routeSpeedPxPerSecond=65; scheduledRestSeconds=4; openingSeconds=5; warningSeconds=1.7; cycleSeconds=14. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 20 | 145 | 14 | 7 / 1.4 |
| 1 / 1 | ring | 30 | 125 | 13 | 9 / 1.4 |
| 2 / 0.75 | fan | 22 | 157 | 14 | 6.3 / 1.4 |
| 2 / 0.75 | ring | 32 | 135 | 13 | 8.1 / 1.4 |
| 3 / 0.4 | fan | 24 | 168 | 14 | 5.6 / 1.4 |
| 3 / 0.4 | ring | 34 | 145 | 13 | 7.2 / 1.4 |

### City Eater

An enormous hollow corpse whose clean rectangular jaw resembles a civic arch. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 240 s; health coefficient 0.704; radius 58 px; estimated attackable fraction 0.8. Signature: Mark two bite lanes and leave one broad escape corridor; destroyed temporary walls expose the core. Counterplay: Use the unmarked corridor and the long recovery; static arena exits never disappear. Mechanics: biteLanes=2; escapeWidthPx=240; biteWarningSeconds=1.8; recoverySeconds=4; temporaryWalls=2; wallHealthHP=120; cycleSeconds=13. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 260 | 22 | 12 / 1.8 |
| 1 / 1 | pulse | 32 | 130 | 14 | 9 / 1.5 |
| 2 / 0.75 | charge | 1 | 281 | 22 | 10.8 / 1.8 |
| 2 / 0.75 | pulse | 34 | 140 | 14 | 8.1 / 1.5 |
| 3 / 0.4 | charge | 1 | 302 | 22 | 9.6 / 1.8 |
| 3 / 0.4 | pulse | 36 | 151 | 14 | 7.2 / 1.5 |

### Saint of the Last Breath

A towering dead hospital saint under one pale sail-shaped shroud with an iron respirator. The quarantine left its work unfinished. Home route raid; minimum threat 1; deadline 240 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Alternate inhalation that gently pulls and exhalation that sends slow rings; two shelter pads cancel the pull. Counterplay: Use either shelter or steer outward; solo needs only one pad and normal dodge remains available. Mechanics: pullSpeedPxPerSecond=45; inhaleSeconds=3; exhaleRings=3; shelterPads=2; shelterRadiusPx=100; warningSeconds=1.8; cycleSeconds=14. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 30 | 115 | 14 | 9 / 1.8 |
| 1 / 1 | beam | 2 | 0 | 16 | 10 / 1.5 |
| 2 / 0.75 | pulse | 32 | 124 | 14 | 8.1 / 1.8 |
| 2 / 0.75 | beam | 4 | 0 | 16 | 9 / 1.5 |
| 3 / 0.4 | pulse | 34 | 133 | 14 | 7.2 / 1.8 |
| 3 / 0.4 | beam | 6 | 0 | 16 | 8 / 1.5 |

### Hourglass Widow

A narrow veiled corpse holding one oversized sandglass against a smooth black dress. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Record one slow bullet fan and replay its same path once after a visible countdown; never rewind players or health. Counterplay: Remember the dashed replay paths or use the persistent safe flank. Mechanics: replayDelaySeconds=2.5; replays=1; fanBullets=11; warningSeconds=1.5; cycleSeconds=9. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 11 | 140 | 12 | 6 / 1.5 |
| 1 / 1 | ring | 20 | 120 | 11 | 8 / 1.2 |
| 2 / 0.75 | fan | 13 | 151 | 12 | 5.4 / 1.5 |
| 2 / 0.75 | ring | 22 | 130 | 11 | 7.2 / 1.2 |
| 3 / 0.4 | fan | 15 | 162 | 12 | 4.8 / 1.5 |
| 3 / 0.4 | ring | 24 | 139 | 11 | 6.4 / 1.2 |

### Unlit Astronomer

A dead astronomer beneath one dark circular star chart with a short brass telescope. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Move two large orbiting hazard markers around the core while a third harmless marker outlines a safe orbit. Counterplay: Follow the clear hollow safe marker; visual paths remain readable without glow. Mechanics: hazardOrbits=2; orbitRadiusPx=[180,300]; orbitSpeedDegreesPerSecond=22; safeOrbitRadiusPx=240; markerRadiusPx=32; warningSeconds=1.5; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | spiral | 24 | 135 | 12 | 7 / 1.3 |
| 1 / 1 | beam | 2 | 0 | 15 | 9 / 1.5 |
| 2 / 0.75 | spiral | 26 | 146 | 12 | 6.3 / 1.3 |
| 2 / 0.75 | beam | 4 | 0 | 15 | 8.1 / 1.5 |
| 3 / 0.4 | spiral | 28 | 157 | 12 | 5.6 / 1.3 |
| 3 / 0.4 | beam | 6 | 0 | 15 | 7.2 / 1.5 |

### Folded Man

An angular corpse folded into one large paper-coat silhouette with a black seam. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Fold a visible line across the floor; bullets cross the line at a mirrored angle after a long warning. Counterplay: Use the permanently unreflected side; predicted paths show both entry and exit directions. Mechanics: foldLines=1; foldLengthPx=520; warningSeconds=1.6; activeSeconds=3; maximumReflectionsPerBullet=1; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 13 | 135 | 12 | 6 / 1.4 |
| 1 / 1 | cross | 20 | 130 | 11 | 8 / 1.2 |
| 2 / 0.75 | fan | 15 | 146 | 12 | 5.4 / 1.4 |
| 2 / 0.75 | cross | 22 | 140 | 11 | 7.2 / 1.2 |
| 3 / 0.4 | fan | 17 | 157 | 12 | 4.8 / 1.4 |
| 3 / 0.4 | cross | 24 | 151 | 11 | 6.4 / 1.2 |

### Red Comet

A dead meteor courier wrapped in one broad red scarf and a long tapered brass shell. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 120 s; health coefficient 0.748; radius 58 px; estimated attackable fraction 0.85. Signature: Dash through three fixed waypoints, leaving trails that go harmless in the order they were created. Counterplay: Follow the numbered path and cross the oldest faded trail. Mechanics: waypoints=3; dashSpeedPxPerSecond=360; trailWidthPx=30; trailSeconds=2.5; waypointWarningSeconds=1.3; recoverySeconds=3; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | charge | 1 | 360 | 17 | 10 / 1.3 |
| 1 / 1 | cross | 18 | 150 | 12 | 6 / 1.1 |
| 2 / 0.75 | charge | 1 | 389 | 17 | 9 / 1.3 |
| 2 / 0.75 | cross | 20 | 162 | 12 | 5.4 / 1.1 |
| 3 / 0.4 | charge | 1 | 418 | 17 | 8 / 1.3 |
| 3 / 0.4 | cross | 22 | 174 | 12 | 4.8 / 1.1 |

### Memory Taxer

A blind corpse assessor carrying one large empty portrait frame and a square ledger bag. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Show three large safe-pad symbols, then request the first shown symbol before a bounded outside pulse. Counterplay: Use the numbered visual history that stays on the HUD; memorization is optional and accessible. Mechanics: symbols=3; pads=3; padRadiusPx=105; displaySeconds=2; answerWarningSeconds=2; cycleSeconds=12. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | pulse | 28 | 120 | 12 | 10 / 1.5 |
| 1 / 1 | zone | 2 | 0 | 10 | 8 / 1.4 |
| 2 / 0.75 | pulse | 30 | 130 | 12 | 9 / 1.5 |
| 2 / 0.75 | zone | 4 | 0 | 10 | 7.2 / 1.4 |
| 3 / 0.4 | pulse | 32 | 139 | 12 | 8 / 1.5 |
| 3 / 0.4 | zone | 6 | 0 | 10 | 6.4 / 1.4 |

### Choir of Moths

A silent corpse singer in one wide moth-wing shawl with three large ivory eye shapes. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 150 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Release three cohesive moth ribbons along curved paths; one ribbon visibly breaks to create a crossing. Counterplay: Cross at the broken ribbon and ignore decorative wing dust, which is not generated. Mechanics: ribbons=3; mothsPerRibbon=6; ribbonSpeedPxPerSecond=130; gapWidthPx=180; warningSeconds=1.5; cycleSeconds=10. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | spiral | 18 | 130 | 11 | 7 / 1.3 |
| 1 / 1 | beam | 2 | 0 | 14 | 9 / 1.5 |
| 2 / 0.75 | spiral | 20 | 140 | 11 | 6.3 / 1.3 |
| 2 / 0.75 | beam | 4 | 0 | 14 | 8.1 / 1.5 |
| 3 / 0.4 | spiral | 22 | 151 | 11 | 5.6 / 1.3 |
| 3 / 0.4 | beam | 6 | 0 | 14 | 7.2 / 1.5 |

### Zero-Hour Conductor

A dead conductor with a broad metronome torso and one long baton. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Count four visible beats and release one alternating lane pattern on each beat with a fixed safe syncopation. Counterplay: Read the persistent beat pips and safe lane marker; audio rhythm is never required. Mechanics: beats=4; beatSeconds=0.9; lanes=4; safeLanes=1; warningSeconds=1.8; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 24 | 145 | 12 | 8 / 1.8 |
| 1 / 1 | pulse | 26 | 125 | 12 | 9 / 1.4 |
| 2 / 0.75 | lanes | 26 | 157 | 12 | 7.2 / 1.8 |
| 2 / 0.75 | pulse | 28 | 135 | 12 | 8.1 / 1.4 |
| 3 / 0.4 | lanes | 28 | 168 | 12 | 6.4 / 1.8 |
| 3 / 0.4 | pulse | 30 | 145 | 12 | 7.2 / 1.4 |

### Walking District

A monumental corpse bent around three broad civic roof shapes and one central bell. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 210 s; health coefficient 0.748; radius 58 px; estimated attackable fraction 0.85. Signature: Lift two temporary building blocks and shift them along outlined lanes, exposing one large central weak point. Counterplay: Use the broad outer bypass or the cleared central path after the blocks settle. Mechanics: blocks=2; blockWidthPx=150; blockHeightPx=130; blockSpeedPxPerSecond=55; outerBypassWidthPx=200; weakPointSeconds=4; warningSeconds=1.8; cycleSeconds=13. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | lanes | 28 | 135 | 13 | 9 / 1.6 |
| 1 / 1 | ring | 30 | 120 | 12 | 10 / 1.4 |
| 2 / 0.75 | lanes | 30 | 146 | 13 | 8.1 / 1.6 |
| 2 / 0.75 | ring | 32 | 130 | 12 | 9 / 1.4 |
| 3 / 0.4 | lanes | 32 | 157 | 13 | 7.2 / 1.6 |
| 3 / 0.4 | ring | 34 | 139 | 12 | 8 / 1.4 |

### The Last Knocker

A faceless corpse carrying one immense upright front door and a single brass knocker. The quarantine left its work unfinished. Home route endless; minimum threat 1; deadline 180 s; health coefficient 0.88; radius 58 px; estimated attackable fraction 1. Signature: Knock three times before the door swings through a marked sector; the opposite sector remains open. Counterplay: Follow the three visible knocks and move behind the hinge; attack during the open-door recovery. Mechanics: knocks=3; knockSpacingSeconds=0.65; swingDegrees=100; swingSeconds=1.4; warningSeconds=1.8; recoverySeconds=3.5; cycleSeconds=11. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.

| Phase / HP threshold | Attack | Count | Speed px/s | Damage HP | Interval / telegraph s |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | fan | 16 | 145 | 12 | 7 / 1.4 |
| 1 / 1 | beam | 2 | 0 | 15 | 9 / 1.8 |
| 2 / 0.75 | fan | 18 | 157 | 12 | 6.3 / 1.4 |
| 2 / 0.75 | beam | 4 | 0 | 15 | 8.1 / 1.8 |
| 3 / 0.4 | fan | 20 | 168 | 12 | 5.6 / 1.4 |
| 3 / 0.4 | beam | 6 | 0 | 15 | 7.2 / 1.8 |

## Accord Break

At a marked phase transition, create one pad for solo, two for 2-8 players, three for 9-16 players and up to five for larger groups. Give 8 s to activate pads by occupying them for 2 s; simultaneous activation is required for multiplayer. Pads spawn in reachable visible ground. Success staggers the boss for 4 s, increases received damage by 25% during that opening and grants a recovery pulse of 15 HP. Failure resumes the normal phase without an unavoidable punishment attack. All classes qualify. Track successful breaks for the secret ending.

## Mutations and two votes

Each mutation lasts three upcoming encounters. Expire old mutations before offering the next three cards; never offer an already active or incompatible mutation. At most three remain active. Every eligible connected participant has one vote, including downed teammates. Disconnected players abstain; tied counts use a seeded tie-break. Solo can confirm immediately. Multiplayer can finish early only after all eligible voters submit.

| Mutation | Effect | Excludes |
| --- | --- | --- |
| Glass Pact | Half maximum health; triple weapon damage. | salt-circle |
| Borrowed Day | Boss health +30%; bounty doubled. | None |
| Rationed Mercy | Healing -40%; bounty +40%. | lifeline |
| Hot Iron | Weapon damage +35%; reloads take 30% longer. | None |
| Open Veins | Maximum health -25%; fire rate +25%. | None |
| Heavy Oath | Move speed -18%; gain 22 percentage points of armor. | None |
| Dead Calm | Hostile projectiles are 20% slower; weapon fire rate -15%. | mercury-hour |
| Quick Blood | Move speed +20%; maximum health -20%. | None |
| Storm Tax | Boss bullet counts +30%; bounty +60%. | None |
| Long Night | Boss deadlines 10% shorter; bounty +40%. | None |
| Lifeline | Healing +50%; weapon damage -20%. | rationed-mercy |
| Thin Walls | Barrier health -40%; weapon fire rate +20%. | None |
| Steady Hands | Weapon spread -35%; move speed -10%. | None |
| Deep Pockets | Magazine capacity +40%; reloads take 25% longer. | None |
| Panic Drill | Dodge cooldown -35%; hostile projectiles 10% faster. | None |
| Iron Rain | One additional weapon projectile; weapon damage -30%. | None |
| Salt Circle | Gain 15 percentage points of armor; maximum health -20%. | glass-pact |
| Grave Interest | Bounty +75%; boss damage +20%. | None |
| Bitter Medicine | Healing -25%; weapon damage +25%. | None |
| Brass Halo | Start each boss with 30 shield; hostile projectiles 10% faster. | None |
| Last Rites | Revive channel time -30%; boss health +15%. | None |
| Mercury Hour | Fire rate +25%; reloads take 15% longer. | dead-calm |
| Spare Parts | Ability potency +25%; weapon fire rate -10%. | None |
| Ash Tithe | Bounty +30% and weapon damage +10%; maximum health -20%. | None |

## Difficulties

| Difficulty | Boss HP | Damage | Speed | Extra patterns | Coins / healing |
| --- | --- | --- | --- | --- | --- |
| Baby | 0.6 | 0.45 | 0.72 | 0 | 1.25 / 1.4 |
| Easy | 0.8 | 0.7 | 0.86 | 0 | 1.1 / 1.2 |
| Normal | 1 | 1 | 1 | 0 | 1 / 1 |
| Hard | 1.15 | 1.25 | 1.1 | 1 | 0.95 / 0.95 |
| Insane | 1.3 | 1.5 | 1.18 | 2 | 0.9 / 0.9 |
| Hellish | 1.45 | 1.8 | 1.25 | 3 | 0.85 / 0.85 |

All six use the complete skill-point budget. Insane and Hellish unlock after any full campaign route completed on Hard. Profile unlocks do not grant online combat power. Font size, color alternatives, aiming assistance and reduced effects never alter unlock eligibility.

## Endless Vigil

Endless Vigil has no terminal encounter or finite campaign completion screen. Threat ramps from one to ten and remains at ten while vigil cycles add 15% health and 12% damage per ten encounters. Speed grows 2.5% per cycle, capped at +50%; hostile projectile counts remain bounded by authored pattern budgets. Keep mutation votes, boss votes, shops and revives after every victory. Save the last completed intermission. Bank completed-encounter mastery even when the next boss defeats the party. Voluntary extraction banks the personal streak while remaining players continue.

New public entrants join the next encounter with the same nominal skill/coin budget appropriate to the run stage; permanent profiles never supply trusted power values. Departures trigger a roster update at phase boundaries after their reconnect window expires, preserving remaining health fraction. New players cannot join at reward time to farm an already completed fight.

Endless draws from all fifty route bosses plus nine exclusive identities. From encounter four, every fourth encounter offers three exclusive candidates so every voting outcome produces an exclusive boss; the others use a seeded fifty-boss shuffle bag. Do not repeat an identity within twelve completed encounters. The Uncounted remains a consent-based campaign extension rather than an unannounced random Endless encounter. A new vigil cycle changes bounded pattern variations; these variants are never counted as extra bosses.

## Team leaderboards

One completed team run occupies one row and one rank, with an expandable roster containing every combat participant. The four timed experiences score at most 1,000,000: 500,000 for a clear, up to 250,000 for speed against accumulated combat deadlines, 150,000 for the final surviving fraction, and 100,000 for avoiding actual HP damage. Menus, shops and loading never count as combat time. Departures remain in the eligible roster and cannot improve the survival fraction. Endless ranks completed bosses first, then combat time through the last completed clear, then normalized damage; total active survival is prominently shown but stalling cannot improve rank. Separate mode, difficulty, peak squad-size band and content/rules season. Public ranked is on by default; private ranked requires an explicit lobby choice. Offline and LAN records are local practice.

The durable global store is a Sites D1 HTTP service, while Colyseus owns realtime combat on Render. Only authenticated authoritative servers register/finalize run metrics. Stable run IDs, sequence numbers, exact integer scoring, idempotence, terminal state and single-owner restore claims prevent duplicate or stale-checkpoint ranking. Registration interruption latches a run unverified while gameplay continues. Full schemas, indexed storage and race/score fixtures are in docs/LEADERBOARDS.md and content/leaderboards.json.

## Arenas

| Arena | Layout and mood | Readability |
| --- | --- | --- |
| Gatehouse | Broken civic gates and an empty fountain. | Fountain cover; Outer-wall lanes |
| Triage Yard | Abandoned hospital canvas and quiet rows of cots. | Central triage island; Wide rescue paths |
| Ossuary Works | Mortuary machinery, bone crates and dry industrial channels. | Two machine islands; Diagonal fire corridors |
| Sunken Chapel | A flooded chapel with exposed stone walks and a cracked altar. | Altar cover; Clearly marked water margins |
| Bell Foundry | Cold brass bells and immense foundry molds. | Mold islands; Four broad exits |
| Crown Crypt | The drowned council chamber under a hollow crown of bells. | Council dais; Open outer ring |

Use obstacle geometry from the content definitions. Static obstacles block movement and shots; friendly deployed structures block hostile shots while allowing teammates through. Maintain at least 170 px clear routes and readable spawn/escape ground. Group cosmetic pings into squad cells in 50-player games without changing shared boss state.

## Player interface flows

| Flow | Behavior |
| --- | --- |
| Launch | Language choice and accessibility are available immediately. Start offline solo, browse public games, create private room, join by code, open codex or view changes. No account is required. |
| Create | Choose mode, route when applicable, difficulty, public/private, nickname and class. Explain locked difficulties and public capacity before starting. |
| Lobby | Show connected party, classes, readiness, mode, difficulty and room code where appropriate. Public listing data excludes private codes and recovery tokens. |
| Combat | Top: boss health, phase and timer. Bottom: own health, ammo, dodge and abilities. Side: concise party state and pings. Accord Break prompts have clear progress and deadline. |
| Intermission | Personal rewards, three mutation cards, three anonymous boss contracts, then class shop and skill tree. Timers are server-owned. Solo can confirm early; multiplayer advances early only when every eligible participant has confirmed. |
| Defeat | Show the reason, completed contracts, personal and squad streaks, and next actions. Preserve earned mastery. Offer retry, return to lobby or exit. |
| Victory | Bank rewards, show chapter ending and unlocked content, then offer the optional secret encounter if eligible. Other players may extract while willing players continue. |
| Recovery | Show reconnecting status without freezing the whole room. After a restart, restore an unexpired signed intermission checkpoint with compatible protocol and content revision. |

## Localization and accessibility

Launch catalogs: en, zh-Hans, zh-Hant, ja, es, fr, de, pt-BR, ru, hi, ar, bn, id, ur, ko. Arabic and Urdu use RTL menus; never mirror gameplay. Chinese script variants are independent catalogs. Localize all UI, errors, mechanics, descriptions, tutorials, endings and release highlights. Keep runtime words out of artwork. Persist selection, match browser locale on first launch, use Intl number/plural formatting, validate placeholders and retain 40% text expansion space. Bundle licensed font subsets for offline play. Translation coverage is distinct from native-speaker review.

Provide remapping, hold/toggle options, optional aim assistance and auto-fire, independent music/effects volume, reduced motion/flashes, high-contrast hostile shapes, readable text scaling, subtitles for nonverbal warning meaning, and touch safe areas. Color is never the only danger cue.

## Architecture and interfaces

Stack: TypeScript, Phaser, Vite, Colyseus, Electron. Share a headless fixed-step simulation between Node online server and offline client worker. Simulate at 30 Hz, patch at 20 Hz, render independently. Predict local movement and reconcile acknowledgements. The server owns collision, damage, timers, votes, inventory and economy.

| Interface | Contract |
| --- | --- |
| RoomSettings | mode, difficulty, visibility, seed, contentRevision, protocolVersion. Route is represented by the selected campaign mode. |
| PublicRoomSummary | public room ID, name, mode, difficulty, connected players, maximum players, phase and capacity state. Never a private code, checkpoint signature or reconnect token. |
| InputFrame | sequence, client tick, normalized movement, aim angle, fire, reload, dodge, Q/E, ultimate and interact actions. Reject non-finite, oversized, stale and rate-exceeding inputs. |
| ContentCatalog | Versioned definitions for classes, abilities, weapons, upgrades, supplies, skills, bosses, attacks, difficulties, mutations, modes and arenas. |
| ProfileV1 | Locale, controls, display/audio/accessibility settings, mastery, cosmetics, lore, difficulty unlocks and local best streaks. No purchased online power. |
| CheckpointV1 | Room ID, intermission sequence, seed, mode, difficulty, roster/builds, earned rewards, mutation lifetimes, recovery credentials, issue/expiry times, protocol/content revisions and HMAC signature. Never broadcast the signing key. |

Use pattern/spawn messages plus periodic corrections instead of continuous full bullet-state broadcasts. Pool projectiles, use spatial collision searches, quantize player position updates and encode shared patches once where feasible. Enforce per-room and instance-wide capacity separately. Queue additional games rather than oversubscribe the free instance.

Desktop renderer: local bundled files, nodeIntegration false, contextIsolation true, sandbox true and minimal validated preload IPC. Start an embedded local server only for explicit LAN hosting. Offline solo uses the shared simulation without network access. Never ship signing secrets, access tokens or credentials in the application.

## Persistence and recovery

Persist versioned ProfileV1 locally with safe replacement and import validation. Store solo checkpoints only between encounters. Online checkpoints are server-signed, expire after 24 h and are distributed to participants; recovery restores the last completed intermission rather than trusting client-authored damage. Reconnect slots last 60 s. Preserve compatible signed checkpoints across free-host restart using a stable server-only environment signing key. Reject incompatible protocol/content and explain recovery choices.

## Art, animation and audio

Use dry ink outlines and matte gouache with original survivor and undead silhouettes. Keep floors quiet, effects restrained and enemy bullets highly legible. Detail is concentrated in faces, hands and one signature prop; use broad low-contrast clothing surfaces and three major value masses, without dense all-over cracks or filigree. No copied reference-game sprites. Existing proofs establish identity and palette; the updated clean-detail art contract is the finish authority for production. Preserve generated originals, prompts and hashes; do not claim an unreported model.

| Proof | File | Acceptance |
| --- | --- | --- |
| Cover | assets/proofs/cover-v1.png | Wide finished original illustration with the Grave Accord wordmark. |
| Survivors | assets/proofs/survivors-v3.png | Seven distinct full-body survivors, stable class identity and equipment, cleaner broad matte coat panels with focal face/hand/prop detail. |
| Bosses | assets/proofs/bosses-v1.png | Eleven original boss identities with clear silhouettes and scale language. |
| Arena | assets/proofs/arena-v1.png | Top-down Gatehouse composition with quiet floor and readable paths. |
| Desktop HUD | assets/proofs/hud-desktop-v1.png | Illustrated UI composition with clear health, timer, ammo and ability hierarchy. |
| Phone HUD | assets/proofs/hud-phone-v1.png | Landscape touch HUD with clear controls and safe areas. |
| Survivor animation | assets/proofs/soldier-run-v1.png | Fixed-grid, same-facing eight-frame locomotion proof; inspect frame pivots and cycle in motion. |
| Boss animation | assets/proofs/boss-attack-v1.png | Fixed-grid, same-facing eight-frame constable attack proof with anticipation, release and recovery. |

Survivor source cells are 256 px, displayed about 56 px high, foot origin (0.5,0.86). Four drawn facings; idle 4 frames at 5 fps, run 8 at 10 fps, attack 4 at 12 fps, hurt 2 at 8 fps, dash 6 at 20 fps, downed 6 at 6 fps. Boss source cells are 512 px, displayed about 150 px high with origin (0.5,0.84); idle 4 at 5 fps, attack 8 at 10 fps, hurt 3 at 10 fps, defeat 8 at 8 fps. Atlas metadata defines every cell and pivot. Reject identity drift, moving baselines and broken loops.

Audio proofs: City Wake (78 BPM, eight bars, quiet hub loop) and Vigil Engine (104 BPM, eight bars, combat loop). Use original synthesized modal bells, warm bass and restrained percussion. Deliver 44.1 kHz PCM WAV masters, synthesis source, timing metadata, peak/RMS and seam measurements. SFX distinguish shots, impacts, dodge, warning, revive, Accord success and UI confirmation. Bundle all audio; no service API is needed during play.

The delivered proof bank includes seven weapon families and seven unique ultimate cues, with 25 SFX total and eight summable stems. docs/AUDIO_BIBLE.md defines the complete ten-track score, six ambient beds, warning priorities, gain/ducking rules and future production. Signal verification is distinct from human listening and runtime mix approval.

## Repository, changelog and delivery

Preserve MIT licensing and include third-party notices. Branch changes through pull requests. One GitHub Project uses Stage 1, Stage 2, Stage 2.5 and Stage 3 milestones, subsystem, priority, status and evidence fields. Canonical Wiki content lives under docs/wiki and is published to the repository Wiki. CHANGELOG.md records implemented changes; in-game localized release highlights summarize released changes.

Main ruleset: require PR, successful verify check, up-to-date branch, resolved conversations, linear history; block force pushes and deletion; zero reviewer approvals and no bypass actors. Register a successful verify before making it required. Stage 1 verify checks content and artifacts; add game checks as implementation appears. Publish Windows binaries and portable archives through GitHub Releases, not as committed executables.

Free hosting starts with a Render gameplay service and a static browser client. Inspect shared usage and bandwidth before tests or deployment. Free services sleep, can restart, and have shared allowances. No paid provisioning or overage exposure without a concrete approved proposal. Keep cold-start connection progress understandable. Do not present free hosting as an always-on production guarantee.

## Gates and evidence

| Gate | Required evidence |
| --- | --- |
| Stage 1 | Complete definitions; 378 specialization skills, 28 weapons, 24 mutations, 6 arenas, 60 bosses; eight visually reviewed art proof sets; animation previews; measured audio proofs; rendered PDF; verified packet and hashes. |
| First playable | Soldier/Medic, one arena/boss, combat/revive, both votes, shops, offline and public/private networking; 49 active scripted clients plus one rendered client; 4000-hostile-projectile stress case. |
| Performance | 99th percentile server tick below 25 ms; documented desktop target 60 FPS, phone target 30 FPS; memory and encoded traffic measured; free-host capacity verified separately. |
| Full implementation | All specified content, routes, difficulties, endless loop, localization and recovery implemented; no roadmap items silently presented as released features. |
| Stage 2.5 | 126 class/route/difficulty combinations; legal mutation combinations; invalid inputs and purchase races; 8/16/50-player active matches; 60-minute endurance; clearly separated human playtesting. |
| Release | Fresh extraction and normal copy hashes; Windows offline/online/occupied-port startup; public browser and locale layout checks; version identity; Wiki/Project/main ruleset; matching GitHub release and source. |
| Contest | Title, cover, description, playable URL, controls, credits and verification evidence. Actual Handshake entry status recorded separately from artifact/GitHub completion. |

## Research and provenance

- Handshake multiplayer game mission: https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/ - Public URL, room codes, account-free phone and laptop play.

- Official multiplayer contest rules: https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0 - October 30, 2026, 11:59 PM Pacific deadline; four equally weighted rubric categories; title, cover, description and URL.

- Colyseus current room API: https://docs.colyseus.io/room - Fixed simulation timestep, room lifecycle and reconnection primitives.

- Colyseus state optimization: https://docs.colyseus.io/state/optimization - Delta encoding, quantized values and patch-rate tradeoffs.

- Phaser overview: https://docs.phaser.io/phaser/getting-started/what-is-phaser - TypeScript-capable 2D browser rendering.

- Render free services: https://render.com/docs/free - Idle sleep, shared allowances, ephemeral disks and free-service limits.

- Electron security: https://www.electronjs.org/docs/latest/tutorial/security - Local trusted content, isolated renderer and narrow IPC.

- OpenAI Sunburst model documentation: https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst - Published quality-first model reference; built-in tool does not expose its backend identifier.

- Google Popcorn Doodle: https://doodles.google/doodle/celebrating-popcorn/ - Accessible survival-game onboarding reference only. No copied assets.

- Bloody Hell official store page: https://store.steampowered.com/app/2056220/Bloody_Hell/ - Readable action and expressive gothic bullet-hell reference only. No copied assets.

The supplied current official rules are an external requirement source. They do not authorize accepting terms or making eligibility declarations. The approved human plan authorizes the game, repository, Wiki, Project and branch protection. Art generation uses the available built-in OpenAI tool; backend names are recorded only if reported. Audio is authored by deterministic local synthesis with no sampled third-party material.

Current runtime classification/offer rules are specified in [Fixed boss threats](FIXED_BOSS_THREATS.md). They supersede encounter-scaled boss ratings and strict primary-route fences for the three ordinary campaigns, while retaining finale roles. Fixed grade is separate from global difficulty and Brutal.
