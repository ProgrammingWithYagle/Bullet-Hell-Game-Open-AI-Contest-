# Bard Misdirection

Buy Mended Strap for 1 SP and False Entrance for 2 SP. Earn two cadence and press Action 3 while facing a clear floor point. Walk 52 pixels of your own movement away from the call to arm it. An eligible ordinary enemy already chasing the Bard can follow the false entrance briefly. It can still collide and attack normally.

The point lasts 4.2 seconds and False Entrance recovers separately in 8.5 seconds. Moving hazards, stationary enemies, scripted targets, rats, other players’ pursuers and bosses keep their original behavior. Dash and forced movement do not count toward arming. Teammates can see where the entrance was set.

- **Wrong Door.** Earn a fresh cadence while a pursuer follows the call. Aim at a new clear point and move the same entrance once. The same pursuer and deadline carry through.
- **Second Entrance.** Let the first pursuer arrive, earn a fresh cadence and ring the same entrance once for a different eligible pursuer.

Each fitting costs 2 SP at 5 earned SP. Choose one fitting per run.

## Short and Standard runs

| Mode | Group | Banked | Owned and unused | False Entrance | Wrong Door | Second Entrance |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Short | Solo | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Short | Two players | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Standard | Solo | 3 / 4 | 3 / 4 | 4 / 4 | 3 / 4 | 1 / 4 |
| Standard | Two players | 3 / 4 | 3 / 4 | 4 / 4 | 4 / 4 | 4 / 4 |

Across 80 runs, the pilots armed 67 entrances, recorded 76 pursuer takes and 58 arrivals. Wrong Door turned 13 calls and Second Entrance rang 19 times. All activations in these schedules occurred in Standard. Both controls matched in sixteen pairs. Twelve complete traces matched on replay. [Run study](../reviews/bard-misdirection-2026-11-21/study-summary.json) · [Replays](../reviews/bard-misdirection-2026-11-21/practice-replays.json).

## Historical protocol 95 review

Source **bc63a14eaa8befd469d298e13d04269db3864e66**, build **2026.11.21-bard-misdirection**, protocol **95**, catalog **122**. The local suite and both GitHub workflows passed 2,870 tests and seven checks. Each frozen audience binds 2,203 files and passed seven checks. The 5434/2810 and 5435/2811 previews served as the rollback during the protocol 96 review. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45073687535) · [PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45073703289) · [Frozen checks](../reviews/bard-misdirection-2026-11-21/frozen-verification.json).

The protocol 94 Bard Lament pair served as the rollback during the protocol 95 review in `output/review-rollback.zip`. All 4,391 restored files match their archived bytes. Archive SHA-256 46e3d815830fe4c4390b55ebc9fc6fe9dbcc07abe6d3e274677b35303132b44c. All 213 original private SQLite-related files match their inventory. [Rotation](../reviews/storage-bard-misdirection-2026-11-21/retention-result.json).

The archive preserves the stale audio-path check and the co-op retries. The passing cases all use the same build files.

## Verification

The 27-SP census purchased 3,647 Bard configurations. 2,557 own False Entrance and 1,166 own all three pathways. All 17,661 prior builds remain legal. All 8,948 issued Lament Practice cases restored, including 1,090 Bard builds. The saved layouts, remaps and fifteen dictionaries passed. [Census](../reviews/bard-misdirection-2026-11-21/build-census.json) · [Save bindings](../tests/fixtures/bard-issued94-bindings.json).

The optimized Solo worker and an ordinary joined Bard each diverted a live Matron pursuer, moved the same pursuer through Wrong Door, and brought two distinct pursuers to Second Entrance. Both fittings were bought at 5 earned SP after an ordinary Standard clear. The local suite passed 2,870 tests and seven checks. [Runtime verification](../reviews/bard-misdirection-2026-11-21/source-verification.json) · [Transport checks](../reviews/bard-misdirection-2026-11-21/staged-transport-bindings.json).
