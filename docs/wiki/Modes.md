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
| Gatehouse | 1600 × 1000 | Original walled courtyard |
| Triage Yard | 1600 × 900 | Wide promenade, staggered bed islands |
| Ossuary Works | 1300 × 1000 | Tall, offset industrial S corridor |
| Sunken Chapel | 1400 × 920 | Central altar, side chapels, clear nave |
| Bell Foundry | 1500 × 850 | Broad forge floor and machine cover |
| Crown Crypt | 1240 × 880 | Compact asymmetric crypt |

All maps share a 1600 × 1000 camera coordinate space; solids outside each footprint restrict actual movement. Cover, spawns, collision and prediction follow the selected layout. Route progression rotates maps. Reachability checks cover fifty player spawn positions, boss access and five Accord pads on every map.

The optional Uncounted extension is playable after a Normal-or-higher campaign clear with at least three successful Accord Breaks and no timeout. Campaign victory is recorded before the offer; each eligible survivor may bank and leave while willing allies enter. Only entrants scale its health and earn its memorial. Declining, waiting or losing preserves the campaign clear. Local Practice records retain the clear and optional memorial. A direct rehearsal launch grants no campaign memorial. See [Gauntlets](Gauntlets), [Bosses](Bosses) and [actual arena geometry](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/arena-layouts.ts).

## Arena ground paintings

![Six different arena floor materials with actual map footprints, collision cover and spawn markers at one scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/arena-ground.jpg)

The original Gatehouse and five new painted materials use the existing six layouts and dimensions. Triage stone, workshop iron, damp chapel slate, warmer foundry plates and darker crypt inlay give the maps distinct surfaces. Cover props and their collision remain separately placed. This is a static artwork/geometry reference; gameplay uses its configured alpha/tint and final rendered/device/human review remains open. [Production and exact reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ARENA_GROUND_ART.md).

## Distinct secondary-map routes

Five secondary layouts now use diagonal crate lanes, factory chicanes, a horizontal chapel nave, furnace loops and a hooked crypt court. Beds are removed from secondary cover art. Footprints and ground paintings stay unchanged; all fifty spawns and Accord centers remain reachable. New-layout rendered/human review is pending.

![Current map route and cover reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/map-routes-v2.jpg)
