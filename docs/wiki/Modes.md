# Modes and maps

| Mode | Current status | Encounters | Source room limit |
| --- | --- | --- | --- |
| Quarantine Run | Playable | 5: four unique regulars and a reserved finale | 8 |
| Midnight Circuit | Playable | 10: nine unique regulars and a reserved finale | 8 |
| Endless Vigil | Playable | No final round; current pool has 59 ordinary identities | 50 |
| Black Bell Pilgrimage | Playable | 16: fifteen unique regulars and a reserved finale | 8 |
| Grand Raid | Playable | 3: two unique regulars and a reserved finale | 16 |

Source room limits are admission rules, not a claim that the current hosted service or physical devices have passed full-capacity acceptance. The older public playtest is capped at eight slots. Final rendered/WAN/endurance and 49+1 scale acceptance remain open.

Quarantine, Midnight, Pilgrimage and Raid use their authored threat and arena sequences and normalized progression budgets. All playable modes support offline solo and public/private rooms. Baby, Easy, Normal and Hard are selectable. Insane and Hellish unlock after a full campaign on Hard, using recorded personal participation. See [Profiles](Profiles).

Grand Raid begins at 12 skill points and 600 nominal coins, reaches 20/1,400 before its second fight and 27/2,400 before its finale. It uses threats 4/7/10 and a 1.25 boss-health multiplier. Its objectives require no particular class. Boss health now includes each authored base duration divided by 120, matching the game bible. Brutal independently doubles HP and multiplies the deadline by 1.5; the extended deadline does not multiply HP a second time.

## Six different playable layouts

![Six maps at the same scale, showing different sizes, cover and spawns](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/maps.jpg)

*Diagram generated from actual runtime collision geometry. Coral marks the boss spawn; mint marks the survivor spawn.*


| Map | Traversable size | Layout |
| --- | --- | --- |
| Gatehouse | 1344 × 840 | Compact walled courtyard |
| Triage Yard | 1376 × 774 | Wide promenade, staggered bed islands |
| Ossuary Works | 1300 × 1000 | Tall, offset industrial S corridor |
| Sunken Chapel | 1260 × 828 | Central altar, side chapels, clear nave |
| Bell Foundry | 1350 × 765 | Broad forge floor and machine cover |
| Crown Crypt | 1240 × 880 | Compact asymmetric crypt |

All maps share a 1600 × 1000 camera coordinate space; solids outside each footprint restrict actual movement. Cover, spawns, collision and prediction follow the selected layout. Route progression rotates maps. Reachability checks cover fifty player spawn positions, boss access and five Accord pads on every map.

The optional Uncounted extension is playable after a Normal-or-higher campaign clear with at least three completed encounters and no timeout. Campaign victory is recorded before the offer; each eligible survivor may bank and leave while willing allies enter. Only entrants scale its health and earn its memorial. Declining, waiting or losing preserves the campaign clear. Local Practice records retain the clear and optional memorial. A direct rehearsal launch grants no campaign memorial. See [Gauntlets](Gauntlets), [Bosses](Bosses) and [actual arena geometry](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/arena-layouts.ts).

## Arena ground paintings

![Six different arena floor materials with actual map footprints, collision cover and spawn markers at one scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/arena-ground.jpg)

The original Gatehouse and five new painted materials use the existing six layouts and dimensions. Triage stone, workshop iron, damp chapel slate, warmer foundry plates and darker crypt inlay give the maps distinct surfaces. Cover props and their collision remain separately placed. This is a static artwork/geometry reference; gameplay uses its configured alpha/tint and final rendered/device/human review remains open. [Production and exact reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ARENA_GROUND_ART.md).

## Distinct secondary-map routes

Five secondary layouts now use diagonal crate lanes, factory chicanes, a horizontal chapel nave, furnace loops and a hooked crypt court. Beds are removed from secondary cover art. Footprints and ground paintings stay unchanged; all fifty spawns and Accord centers remain reachable. New-layout rendered/human review is pending.

![Current map route and cover reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/map-routes-v2.jpg)

Ordinary campaigns now draw fixed-grade candidates from shared regular/finale roles near their intended ladder. Primary route is an affinity, rather than changing a boss's grade to match its encounter. Raid retains its regular/finale reservations; explicit Practice openers can consume a finale and require an uncleared substitute. Endless preserves seeded/exclusive/repeat rules, with an age slot preventing grade-preference starvation. Global difficulty and cycle pressure stay separate from the fixed boss grade.

## Difficulty, revival and cover

| Difficulty | Phase shield-break event | Combat revival | Interior cover | Extra arena / form rule |
| --- | --- | --- | --- | --- |
| Baby | Six circles, 2 s; Standard only | 100% health | Original plus two props | Selected boss form |
| Easy | Three circles, 3 s; Standard only | 50% health | Full | Selected boss form |
| Normal | Off | 25% health | Full | Selected boss form |
| Hard | Off | Disabled | Half, rounded down | Selected boss form |
| Insane | Off | Disabled | None | Selected boss form |
| Hellish | Off | Disabled | None | Marked lava; every boss Crazed |

Brutal and Crazed disable the phase shield event at every difficulty. Revival includes solo, teammates, Medic and supplies; full recovery between encounters remains. Boundary walls and temporary boss mechanics remain. Difficulty cards and final review display these rules in all fifteen locales. Hellish pits have a three-second opening tell and deal 24 contact damage per second in half-second intervals. Hellish effective boss health is 2.4× Normal after its forced Crazed multiplier. [Exact rules and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/DIFFICULTY_AND_PHASES.md).

[Latest Baby/Easy assistance follow-up](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ASSIST_LIMITS.md): Normal revival is 25%; Baby/Easy circles are six/three, channels two/three seconds, and Baby has two extra actual cover props on every map. Source/prediction/prop geometry agree; human/rendered balance review remains open.

## Crazed Horizon follow-up

Insane forces Brutal; Hellish forces purple Crazed with a C threat suffix. Brutal ordinary projectile budgets are 2.5x Standard; Crazed is 7.5x Standard plus additional warned pursuit/crossing pressure. The live cap remains 4,000. Endless advances each actually cleared identity from Standard to Brutal to Crazed, retaining that history at boundaries. Existing bag/repeat protection, builds, profile unlocks and consented secret rules remain.

Four spacious maps have smaller real footprints. Paint, colliders and spawns scale together; player speed, dash distance and hitboxes do not. Ossuary and Crown retain their narrow route geometry. The map diagram below earlier art depicts its issued historical geometry; current dimensions above and actual setup diagrams use compact bounds. Human/rendered/device review remains open.
