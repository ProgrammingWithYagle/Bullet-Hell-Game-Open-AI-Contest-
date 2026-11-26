# Map routes and class-selection portraits

Build `2026.10.25-map-and-roster`, protocol 13. Human playtesting found the previous floors readable on Normal against Hollow Constable, but unwanted beds, similar layouts and smaller front-facing Soldier/Medic portraits needed correction.

The original Gatehouse cover/spawns and every painted ground/footprint stay unchanged. Five secondary maps now use different routes through cover and starting axes:

| Map | Route and cover |
| --- | --- |
| Triage Yard | Diagonal rescue promenade, long crate screens, broad open flanks |
| Ossuary Works | Alternating factory chicanes with upper-right/lower-left passages |
| Sunken Chapel | Horizontal encounter axis through an open cruciform nave and shrine piers |
| Bell Foundry | Twin furnace loops with a central cross aisle |
| Crown Crypt | Hooked L-shaped vault monument with offset outer routes |

Secondary maps no longer use bed prop zero. Their cover planner takes the same collision rectangles used by server authority and client prediction, then chooses crates, machinery, altars, shrines, furnaces and tombs. Spawn/reachability checks cover fifty players, the boss and every Accord objective; prediction agrees with authority around cover and on dodges. The first fixture caught a blocked factory formation, which was corrected by reducing that lower barrier and moving the Crypt formation within its bounds. The failed output remains preserved. New scene layout/readability still needs human/rendered review.

Soldier and Medic gain new complete three-quarter resting portraits from two actual built-in edit returns, preserving their cap/hood, outfit, face, palette and equipment. All seven class portraits use a common 480 x 640 transparent delivery canvas, a 576-pixel visible-body target and the same ground anchor. Their measured body heights are 575–577 pixels, a two-pixel spread. The other five identities and poses remain unchanged. One complete proportional scale/translation per portrait preserves hands, weapons, boots and coat tips, without alpha erasure or mirroring. Large selection frames widen slightly; responsive small frames keep the same rules. Gameplay sprites and mechanics are unchanged.

The seven menu textures add 8,601,600 decoded RGBA bytes by dimensions; actual driver/device behavior is separate. Original sources and exact requests stay preserved. `tools/verify-selection-portraits.py` independently reconstructs every delivered pixel and binding. Three new regressions plus the existing map checks join the 349-test complete pipeline. This is software/native/static-reference evidence, with no new rendered menu or gameplay approval.

The issued floor library and old six-map illustration retain their original geometry source and hashes. The successor `reviews/map-layouts-2026-10-25/layout-reference-v2.json` explicitly binds the new geometry while proving all floor rectangles and original Gatehouse cover/spawns unchanged. Ground provenance tests refer to the original 748bb52 source rather than pretending new cover was present in that earlier stage.

Fixed boss ratings with five subtiers and a separate Brutal marker, a >10 secret classification, more demanding distinct boss phases/movement, ability-changing upgrades, an optional branching skill-tree view and expansion toward three bosses in every ordinary subtier remain active development. The previous port-5174 arena playtest stays unchanged.

A fresh Ubuntu CI checkout exposed one provenance-only failure: its shallow Git history did not contain the historical 748bb52 source object. The exact original geometry bytes are now bundled as a hash-checked reference, so this check needs no history beyond the current checkout. The first failing job log and prior passing Windows report are retained; gameplay geometry, artwork and rules are unchanged by this portability correction.
