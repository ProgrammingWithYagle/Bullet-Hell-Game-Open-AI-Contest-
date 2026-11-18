# Tank Bastion

Gate Signal spends The City Holds recovery to mark a retreat behind a standing Tank. Aim toward danger, use the remapped Action 2, then walk along the arrow across the sill. Any active teammate can claim the guard, including the Tank in Solo. Ordinary Ultimate takes priority if both commands arrive together.

| Technique | Purchase | Decision |
| --- | --- | --- |
| Gate Signal | 2 SP after Broad Guard at 3 earned SP | Leave one reserve at a clear retreat. |
| Split Watch | 2 SP after Gate Signal at 5 earned SP | Each half serves one crossing with half the guard. The center divider separates the approaches. |
| Corner Post | 2 SP after Gate Signal at 5 earned SP | Offer two perpendicular approaches to the same reserve. The first accepted crossing spends it. |

Short awards 9 earned SP at the first fitting shop. Split Watch and Corner Post exclude each other. Mobile Bulwark and Interceptor can combine with either fitting. While carrying a wall, Action 2 uses the purchased wall fitting. After setdown it can plant Gate Signal. The corner requires both complete approaches to fit. The placement and crossing paths must clear terrain, bounds and lava for a real walking body.

The game resolves same-tick claims by crossing time across all stations. Exact ties use player ID, station owner ID and face order. Each player can claim one reserve in that tick. A stronger guard keeps its amount and deadline. Dashes, forced movement, walking outward and entering as a reinforcement leave the reserve available. A claimed guard uses the cast's original deadline and the difficulty shield cap. Unclaimed reserves disappear on expiry, owner loss or encounter exit.

The sill is shared ground feedback. Inward arrows mark open faces, and a spent half dims and loses its arrow. Only the owner receives placement readiness and the planting sound. Only the claimant receives the claim sound. The command guide uses the saved keyboard and controller bindings in either HUD layout. The three painted emblems use unmodified built-in ImageGen output. [Art provenance and prompts](../assets/production/ui/tank-bastion-2026-11-18/provenance.json)

## Verification

- The canonical Game tests exercise synchronized walks, terrain, competing commands, expiry and the Hellish shield cap. The optimized Solo worker earned Split Watch and physically used one half. A real non-host Tank earned Corner Post, shared its physical station with a teammate and granted guard on the perpendicular approach. Both transports exercised pause and discarded paused inputs. The 108 controlled terrain cases exercised all three choices across all six arenas and six difficulties with real walking and a staggered boss. [Terrain cases](../reviews/tank-bastion-2026-11-18/terrain-matrix.json)
- Issued protocol 78 uses content `6472614e137114fdb043bdbdff2952997932aba352e449a70508adfe3f5b4647`, 75 specialization techniques and four General techniques. All 156 original local ownership fixtures, all twelve profile and history classes, both HUD layouts, three remaps and all fifteen issued dictionaries verify against protocol 79. Local migration keeps Practice ownership local. [Fixture binding](../tests/fixtures/tank-bastion-issued78-bindings.json)
- The controlled 27 SP purchase audit verified 3,046 distinct configurations. Tank has 748 configurations, including 192 new plain Gate Signal configurations and 188 for each fitting. All 2,478 prior signatures remain legal. Six controlled hybrids exercised the real carried-wall fitting, setdown and placement while retaining the original wall identity, health, expiry and Q recovery. [Census](../reviews/tank-bastion-2026-11-18/build-census.json) · [Wall hybrids](../reviews/tank-bastion-2026-11-18/wall-hybrids.json)
- All 28 ordinary scripted Short trials reached an outcome. They matched the study outcomes. The reactive policy won 10 of 12 runs with 20 claims. The projectile forecast won all 12 with 16 claims. The ordinary Ultimate control won three of four. In Triage Yard seed 73, the Corner Post forecast used its perpendicular face at tick 2803 and cleared all five encounters. These policy results cover two arenas and two seeds. [Canonical trials](../reviews/tank-bastion-2026-11-18/natural-short.json) · [Original study](TANK_BASTION_STUDY.md)

A controlled 50-actor headless Game planted 25 Gate Signals in one interval. A later simultaneous walk gave each of 25 allies one guard and spent all 25 reserves. [Local party burst](../reviews/tank-bastion-2026-11-18/party-burst.json)

Twenty-eight matched pairs repeated the same seed and policy from a fresh Short run and from a real restored first shop after the fitting purchase. All measured outcomes, buys, casts, claims, damage and clocks matched across the pairs. [Safe-shop replay comparison](../reviews/tank-bastion-2026-11-18/safe-replay-comparison.json)

The protocol 79 catalog projects exactly to the issued protocol 78 catalog when the three Bastion rows are removed. The authored specialization generator reproduces all 78 rows. A full historical generation also emits older differences in rules and boss definitions. [Edition preservation](../reviews/tank-bastion-2026-11-18/edition-preservation.json)

Tank has nine techniques across three routes. Broader solo and co-op balance, human play, rendered and device review, native-language review and listening acceptance remain open.
