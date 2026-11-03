# Engineer pathways — playable pilot

Build 2026.11.02-engineer-pathways / protocol 49. This is a two-choice Free Play pilot. It does not complete Engineer's later grades, the other eleven specialization designs, any personal arc or the larger game.

**Current development order:** [FREE_PLAY_POLISH_ROADMAP.md](FREE_PLAY_POLISH_ROADMAP.md) makes Engineer the first polished reference before the other classes, bosses and eventually Campaign. [SKILL_TREE_RESEARCH.md](SKILL_TREE_RESEARCH.md) proposes the dedicated graph and third Field Works pathway. These are not yet implemented; the instructions below describe the current two-choice pilot.

In Free Play, open the class tree, buy **Level Footing** for 1 SP and inspect the new **Specializations** section. Buy either D- technique for 2 SP. Both classic and expanded views use the same controls and authoritative nodes. The existing three-SP start, 27-SP cap and one-capstone rule remain. Selecting neither retains Rivet Turret. A choice lasts this run; start another run to compare.

| Choice | Decisions and cost |
| --- | --- |
| Machinery / Carriage Sentry | Q deploys a finite 80-health machine for 12 seconds. It follows its owner at 150 pixels/second, then needs 0.5 seconds without movement to brace. It fires at visible enemies within 420 pixels for 30 base damage/second. Movement stops fire and banks no shots. Existing ability potency/turret bonuses, Crossfire Pair, extra-turret capacity and siege overclock apply. Paired carriages retain distinct offsets and near/far preferences. |
| Traps / Pressure Charges | Q places one charge 120 pixels ahead. It arms for 1 second; a real ordinary or boss body within 44 pixels commits a visible 0.5-second fuse. The 100-pixel blast deals 150 base damage and slows ordinary enemies 50% for 2 seconds. Boss attacks are never slowed. Up to two owned charges last 36 seconds. Actual cover blocks placement paths, triggering and blasts. Bounds/lava reject invalid whole bodies. Full capacity/invalid ground spends no cooldown. |

Both keep Q's 18-second base cooldown, modified by existing foundations. Charges replace Q turrets and explicitly conflict with Crossfire Pair and extra-turret capstones; the inspector, authority and restore validator share this rule. Barricade, Return Current and Impossible Machine remain available. The pathways exclude each other. No new combat resource or hotbar is added.

The HUD names the purchased Q variant and shows live charge capacity. Pending, armed, fuse and spent charge states are authoritative cues; the renderer adds finite circles, a device mark and timing. Carriages show their brace state around existing turret art. This has native DOM/source/build verification; rendered readability, movement feel, listening, device and final balance acceptance remain open. The pilot copy is English in all catalogs, marked lang=en; twelve catalog entries are explicitly exempted from translation acceptance and need future translations.

Campaign keeps its current one D- preparation, zero SP and no mutations. These shared techniques are **not yet available** there: an authored teacher/work situation, owned demonstration and preparation admission still need development. No reading or purchase grants Campaign knowledge/proof. No Kesa/Tamsin scene, repair, transport, healing or personal-arc completion was invented.

Existing 648 class nodes and two General purchases retain their IDs, prerequisites and prices. Two additive nodes live in content/specializationSkills.json. An exact protocol 48/content 1dd878… local boundary migrates identity, equipment and knowledge unchanged. Other recognized historical local migrations remain supported; none may contain the new node IDs. Current restores reject dual/conflicting pathways, overspending and Story injection. Historical profile/clear records retain their issued identity; online authoritative checkpoints remain exact-version only.

Reproduce the comparison in Free Play with Quarantine Run and customization seed 2209; use the same difficulty and target (Constable or Ward Approach) for each fresh build. The command node --import tsx tools/measure-engineer-pathways.mts records twelve controlled Game samples: baseline/machinery/traps × ordinary/boss × held/relocated positions. Those samples disable boss attacks and primary fire and make the player invulnerable to isolate owned kit output. They are mechanics comparisons, not human clears or final tuning. Full logs and receipts live in reviews/engineer-pathways-2026-11-02.

Service Yard / Porch Watch remains its untouched checked WIP patch, not active/selectable source. Main-story prose remains 5,741 English words; all 12 personal arcs and the five-million-word main-story ambition remain unfinished.
