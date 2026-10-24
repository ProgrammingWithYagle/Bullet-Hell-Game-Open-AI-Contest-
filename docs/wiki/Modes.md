# Modes and maps

| Mode | Current status | Encounters | Source room limit |
| --- | --- | --- | --- |
| Quarantine Run | Playable | 5: four unique regulars and a reserved finale | 8 |
| Midnight Circuit | Playable | 10: nine unique regulars and a reserved finale | 8 |
| Endless Vigil | Playable | No final round; current pool has 59 ordinary identities | 50 |
| Black Bell Pilgrimage | Playable | 16: fifteen unique regulars and a reserved finale | 8 |
| Grand Raid | Playable | 3: two unique regulars and a reserved finale | 16 |

Source room limits are admission rules, not a claim that the current hosted service or physical devices have passed full-capacity acceptance. The older public playtest is capped at eight slots. Final rendered/WAN/endurance and 49+1 scale acceptance remain open.

Quarantine, Midnight, Pilgrimage and Raid use their authored threat and arena sequences and normalized progression budgets. All playable modes support offline solo and public/private rooms. Baby, Easy, Normal and Hard are selectable. Insane and Hellish are locked pending their full Hard-completion unlock/profile implementation.

Grand Raid begins at 12 skill points and 600 nominal coins, reaches 20/1,400 before its second fight and 27/2,400 before its finale. It uses threats 4/7/10 and a 1.25 boss-health multiplier. Its objectives require no particular class.

## Six different playable layouts

| Map | Traversable size | Layout |
| --- | --- | --- |
| Gatehouse | 1600 × 1000 | Original walled courtyard |
| Triage Yard | 1600 × 900 | Wide promenade, staggered bed islands |
| Ossuary Works | 1300 × 1000 | Tall, offset industrial S corridor |
| Sunken Chapel | 1400 × 920 | Central altar, side chapels, clear nave |
| Bell Foundry | 1500 × 850 | Broad forge floor and machine cover |
| Crown Crypt | 1240 × 880 | Compact asymmetric crypt |

All maps share a 1600 × 1000 camera coordinate space; solids outside each footprint restrict actual movement. Cover, spawns, collision and prediction follow the selected layout. Route progression rotates maps. Reachability checks cover fifty player spawn positions, boss access and five Accord pads on every map.

The optional Uncounted extension is playable after a Normal-or-higher campaign clear with at least three successful Accord Breaks and no timeout. Campaign victory is recorded before the offer; all connected eligible survivors must consent. Declining, waiting or losing preserves the campaign clear. Local Practice records retain the clear and optional memorial. A direct rehearsal launch grants no campaign memorial. See [Gauntlets](Gauntlets), [Bosses](Bosses) and [actual arena geometry](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/arena-layouts.ts).
