# Assassin Infiltrator

Buy Quiet Hem for 1 SP and Slip Route for 2 SP. Stand near a solid cover edge while a hostile can see the entrance. Face the edge and press Action 2 to spend ordinary Invisibility recovery. Walk until that cover breaks an actual enemy line. The exit needs 84 pixels of ground from the entrance and must still have cover. Stop and press Action 2 to leave a damageable echo at the entrance. The trade leaves up to 0.8 seconds of the original veil and an echo lasting up to 1.5 seconds. Existing projectiles, damaging floor and committed attacks still apply.

- **Footstep Relay.** After you leave an echo, stop and press Action 2 during the relay prompt. The same echo follows up to 104 pixels of the route you walked. Actual cover can stop its movement. Its remaining health and expiry carry through the move.
- **Threshold Echo.** Press at the walked exit to arm the entrance for up to 0.9 seconds. A real hostile crossing into the clear 96-pixel threshold deploys the echo. While the route and veil have time, stop within reach and press again to call it early.

Each fitting costs 2 SP, requires five earned points and excludes the other. An existing Decoy Veil decoy moves to the bend with its remaining health and original expiry cap. If it is destroyed, the route cannot recreate it. The owner sees the route and hears eight cues. Teammates see the finite echo and its movement. [Emblems](../assets/production/ui/assassin-infiltrator-2026-11-21/provenance.json) · [Audio checks](../reviews/assassin-infiltrator-2026-11-21/audio-checks.json).

## Run study

The early entry study used 48 Short and Standard runs across four opening arenas. The integrated study compared 80 runs covering banked and purchased-but-unused controls, the entry and both fittings. The sixteen matched controls produced identical measured trajectories. Twelve cases replayed the same inputs, purchases, events and outcomes.

| Mode | Cohort | Banked | Bought and unused | Slip Route | Footstep Relay | Threshold Echo |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Short | Solo | 2 / 4 | 2 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Short | Two players | 2 / 4 | 2 / 4 | 2 / 4 | 2 / 4 | 2 / 4 |
| Standard | Solo | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Standard | Two players | 3 / 4 | 3 / 4 | 2 / 4 | 2 / 4 | 4 / 4 |

The integrated comparison recorded 246 paid marks, 231 echoes, 71 completed relays and 65 watched entrances. It recorded 0 automatic threshold deployments under those policies. In eight focused co-op follow-ups, a teammate guided a hostile toward the entrance and produced 1 automatic deployment. The controlled fight also observed the actual crossing. [Run study](../reviews/assassin-infiltrator-2026-11-21/study-summary.json) · [Replays](../reviews/assassin-infiltrator-2026-11-21/practice-replays.json).

## Verification

The 27-SP census bought 1,090 legal Assassin builds, including 598 with both Duelist and Infiltrator. All 13,167 earlier builds remained legal. All 4,442 Duelist-era Practice fixtures restored, including 243 Duelist builds. Both HUD layouts, all three remaps and all fifteen original dictionaries passed. [Census](../reviews/assassin-infiltrator-2026-11-21/build-census.json) · [Save bindings](../tests/fixtures/assassin-issued90-bindings.json).

All six entry and fitting cases ran through the complete optimized Solo worker and a real joined Assassin. Each fitting was bought after a Short clear at nine earned points. The host saw the same echo while the route timings and action sounds reached the owner. The exact local suite passed 2,813 tests and seven checks. Human play, rendered presentation, physical controls, listening, native-language review and final balance remain open. [Runtime verification](../reviews/assassin-infiltrator-2026-11-21/source-verification.json) · [Transport checks](../reviews/assassin-infiltrator-2026-11-21/staged-transport-bindings.json).
