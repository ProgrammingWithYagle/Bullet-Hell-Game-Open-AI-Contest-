# Grave Accord implementation state

Current candidate: **2026.10.26-roving-muster / protocol 23**. Read the [checkpoint](CHECKPOINT_2026_10_25.md), [single-ledger progress](DEVELOPMENT_PROGRESS.md) and actual Git/CI. Earlier Return Address state is [archived unchanged](history/IMPLEMENTATION_RETURN_ADDRESS_2026_10_26.md). The full game remains unfinished.

| Area | Current implementation |
| --- | --- |
| Roster | 66 identities: 65 ordinary plus one secret; 85 new ordinary identities remain |
| Individual original quality | Constable, Warden, Courier and Ratcatcher: 4/60; 56 remain; human accepted 0 |
| Ratcatcher | Two phases; late patrol before fresh locked scent lanes; actual-origin spawns; moving swept sack; rat-only cover navigation; one/two advanced warned gapped rings |
| Courier | One/two Standard charges, two/three advanced; actual-stop warnings/trails, recovery and split fan |
| Forms | All 66 Standard/Brutal/Crazed; intrinsic grades and separate B/C; Insane forces Brutal, Hellish forces Crazed |
| Projectiles | 2.5x/7.5x ordinary budgets; controlled cancellation; warned pursuit/crosscut/weave; finite queues and 4,000-hostile cap |
| Phases/HUD/audio | Two entry phases; three/four later; segmented bar, name/grade/form/phase/timer, priority phase bell and reduced-motion-aware entry animation |
| Classes/builds | Seven kits, 378 skills/63 paths, 28 weapons and 21 purchased ability transformations; human acceptance open |
| Optional tree | Default-off all-54 view with bounded zoom, scroll and keyboard controls |
| Maps/modes | Six distinct layouts, five modes; four spacious maps compacted; paint/colliders/spawns agree |
| Assistance | Combat revive Baby 100%/Easy 50%/Normal 25%/Hard+ none; circles only Baby/Easy Standard, six/three and two/three seconds |
| Arena rules | Baby adds two props, Hard half, Insane/Hellish no interior cover; Hellish warned lava |
| Art/music | 1,542 selected poses, 66 individual boss themes plus City Wake, 67 MP3 deliveries; previous asset bytes preserved |
| Continuity | Known protocol 22 local Practice/profile migration preserves form/build history; older bounded migrations remain; online/signed state strict |
| Existing systems | Profiles/mastery/cosmetics/remaps, all five modes, seven class kits and bank-safe consented secret implemented |
| Recovery/rankings | Normal writer disabled; hosted credentials/history paging/departure/storage-owner/ranking gates open |
| Governance | Same branch, draft PR #14, protected main; Wiki 18 pages/34 images; public protocol 4 Site/issued protocol 13 Windows separate |

Ratcatcher retains its fixed 1- grade, original Standard health/damage/deadline, sixteen action/defeat poses and individual score. New walking/whistle art and audio recordings are not supplied by this pass. The intrinsic sack remains earned counterplay on every form/difficulty, separate from phase-circle assistance. Existing rats survive unassisted phase changes while pending geometry/echoes cancel. Every new offensive tell locks before release. [Full implementation](RATCATCHER_MUSTER.md).

Current candidate verification belongs under `reviews/ratcatcher-muster-2026-10-26/`. Record exact passing local/CI/source/preview/Wiki evidence below after completion. Historical 510-test receipts are not current proof. Preserve all 5174–5187 frozen roots/processes; browser control remains disabled. The 5185 human comparison remains latest, and newer review is pending.

The full goal still requires 85 new ordinary bosses, 56 individual quality passes, special/action art, human rendered/native-language/device/listening/final balance acceptance, active mixed-progression/WAN/endurance/capacity, hosted recovery/rankings and coordinated release. [Detailed gates](CHECKPOINT_2026_10_25.md#remaining-goal-and-release-gates).

## Current local software evidence

The candidate passes **526 tests / 526 pass / 0 fail**, authored content/fifteen-locale checks, TypeScript and production build. Sixteen new Ratcatcher regressions cover actual patrol stops, warning locks, intrinsic sack cancellation and relative swept contact, bounded rat navigation, corner safety, advanced emission budgets, phase/exit cleanup, known local migration, casting clocks and real owner/observer replication. A separate actual-Game audit covers **216 map/difficulty/selected-form/phase samples**, 1,000 ticks each (216,000 total), requiring multiple musters. Peak observed counts are twelve rats and 211 hostile projectiles. This is not full-fight, progression-endurance, FPS, WAN or capacity acceptance.

Exact local evidence is under `reviews/ratcatcher-muster-2026-10-26/`. The other 65 complete boss definitions and all other catalog fields remain unchanged. Ratcatcher retains its health, damage, deadline, authored attack definitions and grade. All 2,066 previous asset blobs and 34 Wiki image blobs are preserved; the two predecessor handoffs are archived byte for byte. The declared 15,834-row offensive model still has zero deadline misses. No rendered, device, native-language, listening or final human balance acceptance is inferred.
