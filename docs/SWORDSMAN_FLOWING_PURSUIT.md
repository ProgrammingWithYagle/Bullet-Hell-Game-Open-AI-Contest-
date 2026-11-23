# Swordsman Flowing Pursuit

Buy the issued Footwork prerequisite for 1 SP and Passing Cut for 2 SP. Walk 54 pixels along a sustained approach, aim close to that heading and press Action 3 while your footing is fresh. Each cut spends one Breath charge. Passing Cut recovers separately for 216 combat ticks.

Ordinary movement pays only for distance your body actually moved. A wall, dodge, sprint, forced displacement, reload or another ability can break the approach. A cut uses Dara’s blade collision against actual cover, armor, boss parts and ordinary opponents. A damaging Passing Cut immediately shows a fitted continuation to the party.

- **Through Step.** During the 42-tick opening, walk 32 additional pixels along the approach, then press Action 3 for a longer and narrower cut.
- **Crossing Step.** During the same opening, walk 32 pixels across the approach and face along that step for a broader sweep.
The second cut spends another Breath charge. Either fitting costs 2 SP at 5 earned SP, and they exclude each other.

The HUD asks you to face along the step when your aim is wide. If you have enough footing and your blade is still recovering, it shows Recover.

## Short and Standard runs

| Mode | Group | Banked | Owned and unused | Passing Cut | Through Step | Crossing Step |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Short | Solo | 0 / 4 | 0 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Short | Two players | 2 / 4 | 2 / 4 | 2 / 4 | 3 / 4 | 3 / 4 |
| Standard | Solo | 0 / 4 | 0 / 4 | 0 / 4 | 0 / 4 | 0 / 4 |
| Standard | Two players | 2 / 4 | 2 / 4 | 2 / 4 | 2 / 4 | 2 / 4 |

The pilots landed 1008 Passing Cuts, 238 Through Steps and 208 Crossing Steps. Sixteen control pairs matched, and twelve complete cases replayed exactly. All policies lost their four Solo Standard cases in this comparison. Balance remains open. [Run study](../reviews/swordsman-pursuit-2026-11-22/study-summary.json) · [Replays](../reviews/swordsman-pursuit-2026-11-22/practice-replays.json).

## Verification

The controlled 27-SP census includes 3,647 Swordsman builds. Passing Cut appears in 2,557, each fitting in 799, and 1,166 own all three Swordsman routes. All 21,308 tracked prior builds remain legal. The edition restores 12,604 issued Counterstroke Practice cases. [Build census](../reviews/swordsman-pursuit-2026-11-22/build-census.json) · [Save bindings](../tests/fixtures/swordsman-issued97-bindings.json).

The optimized worker and joined Swordsman landed the first cut and both fitted follow-ups against live opponents. Both fittings were earned for 5 SP after an ordinary Standard clear. The other player saw the first cut and continuation while the Swordsman’s input guidance remained private. The source gate passed 2,912 tests and seven checks. [Runtime verification](../reviews/swordsman-pursuit-2026-11-22/source-verification.json) · [Transport checks](../reviews/swordsman-pursuit-2026-11-22/staged-transport-bindings.json).
