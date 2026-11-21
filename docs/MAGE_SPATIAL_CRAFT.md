# Mage Spatial Craft

Buy Paper Seal for 1 SP and Waymark Return for 2 SP. Stand on clear floor and press Action 2 to set a waymark. Walk a useful route away during its 3.6-second lifetime. The trail needs 94 pixels of actual walking and at least 60 pixels of displacement. Its walking budget is 218 pixels. Stop and press Action 2 again. The Mage checks the trail against the current floor and spends the original Ward Detonation recovery when the return starts.

Follow the walked trail back in short steps for up to 27 combat intervals. Live masonry and lava can stop the return. Ordinary movement, forced displacement and active commitments can break the trace, and damage can still land on the Mage. Ward Detonation remains available while a mark is unpaid and casting it clears that mark.

- **Hold the Trace.** After traveling partway back, press Action 2 to hold the return in place briefly. Take a shot or use Binding Sigil. Press once more within the hold to resume the same paid return. The original deadline applies to both legs.
- **Side Landing.** Near the end, aim across the trail into clear space and press Action 2. The last leg can turn once into a landing at most 52 pixels away. The original clock and remaining distance still apply.

The fittings cost 2 SP at five earned points and exclude each other. The first shop yields five SP in Standard or nine in Short. The Mage sees private readiness, handling prompts and seven action sounds. The floor mark and physical landing remain visible to teammates. [Emblems](../assets/production/ui/mage-spatial-craft-2026-11-20/provenance.json) · [Audio checks](../reviews/mage-spatial-craft-2026-11-20/audio-checks.json).

## Run study

There were 80 paired seeded runs spanning Short and Standard, Solo and two players. The banked and purchased-but-unused inputs matched all 16 trajectories. The active strategies produced 209 paid returns and 197 accepted arrivals, with 57 resumptions and 59 side landings. Twelve selected runs exactly replayed their trajectories and earned purchases. [Study and raw runs](../reviews/mage-spatial-craft-2026-11-20/study-summary.json) · [Replays](../reviews/mage-spatial-craft-2026-11-20/practice-replays.json).

| Mode | Cohort | Banked | Bought and unused | Waymark | Hold the Trace | Side Landing |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Short | Solo | 3 / 4 | 3 / 4 | 2 / 4 | 3 / 4 | 2 / 4 |
| Short | Two players | 2 / 4 | 2 / 4 | 2 / 4 | 3 / 4 | 3 / 4 |
| Standard | Solo | 2 / 4 | 2 / 4 | 3 / 4 | 2 / 4 | 2 / 4 |
| Standard | Two players | 2 / 4 | 2 / 4 | 3 / 4 | 4 / 4 | 4 / 4 |

## Historical protocol 88 review

Source **b69636150e788e83dd2725b38c1b3d42c6ca1ad6**, build **2026.11.20-mage-spatial-craft**, protocol **88**, catalog **101**. The local suite and both GitHub workflows passed 2,766 tests and seven checks. Each frozen audience binds 2,130 files and passed seven checks. The 5420/2796 and 5421/2797 listeners had stopped before promotion. The complete pair served as the rollback during the protocol 89 review. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44849542955) · [PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44849562092) · [Frozen checks](../reviews/mage-spatial-craft-2026-11-20/frozen-verification.json).

The protocol 87 Mage Binding pair served as the rollback during the protocol 88 review in `output/review-rollback.zip`. All 4,243 restored files match their archived bytes. Archive SHA-256 156b5ece7efeb851ba11e96dad14eb66a1d54540a01e336129b08224f591363a. All 213 original private SQLite-related files match their inventory. [Rotation](../reviews/storage-mage-spatial-craft-2026-11-20/retention-result.json).

## Verification

The 27-SP census purchased 1,090 legal Mage configurations, including 598 combining Spatial Craft and Binding. All 9,526 previously enumerated configurations remained legal. A controlled 9-SP hybrid used Pivot Sigil while parked and finished the paid return on its first E clock. All 792 issued Binding-era Practice fixtures, both HUD layouts, all three remaps and all 15 previously issued dictionaries passed. [Census](../reviews/mage-spatial-craft-2026-11-20/build-census.json) · [Save bindings](../tests/fixtures/mage-issued87-bindings.json).

All six operations ran through the complete optimized Solo worker and an actual joined Mage. An ordinary Short clear earned the two fitting purchases. The host received the same physical events and each Mage received private command prompts and sounds. The source Side Landing probe initially compared the endpoint with the earlier client position. The rerun accounts for authoritative movement between snapshots and matches the actual side event to the landing. The local suite passed 2,766 tests and seven checks. Human play, rendered presentation, physical controls, listening, native-language review and final balance remain open. [Runtime verification](../reviews/mage-spatial-craft-2026-11-20/source-verification.json) · [Staged operations](../reviews/mage-spatial-craft-2026-11-20/staged-transport-bindings.json).
