# Grave Accord implementation state

Current build: **2026.10.26-appeal-circuit / protocol 24**. Read the [checkpoint](CHECKPOINT_2026_10_25.md), [single-ledger progress](DEVELOPMENT_PROGRESS.md) and actual Git/CI. Earlier Roving Muster state is [archived unchanged](history/IMPLEMENTATION_ROVING_MUSTER_2026_10_26.md). The full game remains unfinished.

| Area | Current implementation |
| --- | --- |
| Roster | 66 identities: 65 ordinary plus one secret; 85 new ordinary identities remain |
| Individual original quality | Constable, Warden, Courier, Ratcatcher and Clerk: 5/60; 55 remain; human accepted 0 |
| Clerk | Connected arena-relative stamps; late patrol, delayed safe III and distinct advanced appeal with full warnings |
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
| Continuity | Known protocol 23 local Practice/profile migration preserves form/build history; older bounded migrations remain; online/signed state strict |
| Existing systems | Profiles/mastery/cosmetics/remaps, all five modes, seven class kits and bank-safe consented secret implemented |
| Recovery/rankings | Normal writer disabled; hosted credentials/history paging/departure/storage-owner/ranking gates open |
| Governance | Same branch, draft PR #14, protected main; Wiki 18 pages/34 images; public protocol 4 Site/issued protocol 13 Windows separate |

Ratcatcher retains its fixed 1- grade, original Standard health/damage/deadline, sixteen action/defeat poses and individual score. New walking/whistle art and audio recordings are not supplied by this pass. The intrinsic sack remains earned counterplay on every form/difficulty, separate from phase-circle assistance. Existing rats survive unassisted phase changes while pending geometry/echoes cancel. Every new offensive tell locks before release. [Full implementation](RATCATCHER_MUSTER.md).

Current verification is recorded under `reviews/clerk-appeal-2026-10-26/`. Exact passing local/CI/source/preview/Wiki evidence follows below. Historical 526-test receipts are not current proof. Preserve all 5174–5189 frozen roots/processes; browser control remains disabled. The 5185 human comparison remains latest, and newer review is pending.

The full goal still requires 85 new ordinary bosses, 55 individual quality passes, special/action art, human rendered/native-language/device/listening/final balance acceptance, active mixed-progression/WAN/endurance/capacity, hosted recovery/rankings and coordinated release. [Detailed gates](CHECKPOINT_2026_10_25.md#remaining-goal-and-release-gates).

## Clerk Appeal Circuit

Clerk placement now succeeds for all 289 valid target samples that previously produced 61 failed casts. Arena-relative reachable seals avoid cover, boundaries and lava. The late phase patrols before fresh warnings and reopens notched seal III after its own strike; advanced late phases add a fully warned distinct appeal set. Standard combat numbers, grade, existing artwork and music remain. [Full implementation](CLERK_APPEAL.md). Current evidence is separate from the archived 526-test Ratcatcher checkpoint.

## Completed Appeal Circuit checkpoint evidence

Complete source **`85e7a498ceb0138b3b7c59cd479fbc2caf333dd0`**, build **2026.10.26-appeal-circuit / protocol 24**. Local authored content/fifteen locales, TypeScript, **539 tests / 539 pass / 0 fail** and production build pass. Both exact GitHub checks succeeded: [direct job 122001474774](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/40447288457/job/122001474774) and [PR merge job 122001541134](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/40447309029/job/122001541134). Downloaded logs show 539 tests / 539 pass / 0 fail, Node 24, Pillow 12.3.0 and successful production verification. The PR job checks this source against unchanged protected main `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`. Later metadata HEAD must be checked on its own.

Local snapshot `9d2ff7dd7aad38b95978eaeb5221a96023c2bce6fce05eae03ba97ceb0e8f449`; committed snapshot `639d6cc0110018b88d475877b5fba00fd56c404845be5b2826c2e111196e3a46`; runtime source `2db89498c07dded3ee803eaa2ae3b72930cfe26b320e63a81f5367f725b3ae01`; content revision `27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27`. Production has **1,685 files / 721,164,190 bytes**. Only pre-existing unchanged pnpm-workspace.yaml differs by a local CRLF/committed LF byte. All four raw local logs match committed bytes. All 2,066 previous asset blobs, all 34 Wiki images, the other 65 complete boss definitions and all other catalog fields are preserved. Clerk retains Standard health/damage/deadline/attack definitions/grade. The Roving Muster predecessor handoffs are archived byte for byte. The 15,834-row offensive model still has zero deadline misses; this is not final balance acceptance.

The original 289 valid target samples now produce both complete, distinct stamp sets with **zero placement failures**, fixing 61 failures at the preceding source. Thirteen new regressions cover connected placement, warning/order/safety clocks, actual patrol stops, distinct advanced appeals, swept contact, whole-body protection/projectile absorption, auxiliary cadence, cleanup, casting poses, fifteen locales, exact protocol 23 migration and real owner/observer replication. A separate actual-Game audit covers **216 combinations / 216,000 ticks**, with multiple sequences per case, peak six stamps and 143 hostile shots. Its optional Baby/Easy Standard circles are removed only for those sequence samples; actual assistance is separately tested. No full-fight/endurance/FPS/WAN/capacity acceptance is inferred.

Latest frozen Solo preview **http://127.0.0.1:5189/**, source `85e7a498ceb0138b3b7c59cd479fbc2caf333dd0`, PID **42724**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-appeal-circuit-85e7a49`. All **1,685 files / 721,164,190 bytes** match production; **38 raw HTTP artifact checks** pass. All eleven earlier 5178–5188 roots remain unchanged: **18,395 files / 7,675,850,102 bytes**. All twelve listener command lines match their frozen roots; no prior process was stopped, replaced or restarted. Preserve all 5174–5189 roots/processes. Browser control remains disabled.

The existing Wiki is published from exact committed canonical source **`85e7a498ceb0138b3b7c59cd479fbc2caf333dd0`**, at Wiki commit **`d64f69136dde5456919dae67a7349fc0acb6f4eb`**. All 18 Markdown blobs, 34 image blobs, 34 public image SHA256 responses and four anonymous HTML responses pass. Local/in-game/Wiki changelogs and the single progress ledger are synchronized. PR #14 stays open/draft; main stays protected at `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`. No public Site/Windows deployment, main merge or contest submission occurred.

The full goal remains active: **85 new ordinary identities and 55 individual original quality passes remain**, plus special/action art, actual rendered/native-language/device/listening/final human balance, active mixed-progression/WAN/endurance/capacity, hosted credentials/history/recovery/rankings/storage-owner acceptance and coordinated release. Latest human comparison remains 5185; newer previews await review. Automated implementation is separate from human acceptance.
