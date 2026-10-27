# Grave Accord implementation state

Updated October 26, 2026. [Checkpoint](CHECKPOINT_2026_10_25.md), [single-ledger progress](DEVELOPMENT_PROGRESS.md) and actual Git/CI are the continuation authorities. The game remains unfinished.

| Area | Current source state |
| --- | --- |
| Build/protocol |2026.10.26-crazed-horizon / 21|
| Bosses |66 playable: 65 ordinary, one secret;85 additional ordinary identities remain|
| Forms |All 66 Standard/Brutal/Crazed;fixed grades, separate B/C markers;Insane forces Brutal, Hellish forces Crazed|
| Projectile/extra pressure |2.5x Brutal/7.5x Crazed base-emission budgets, controlled density, pursuit/crosscuts and Crazed weaves;bounded queues/4,000 live cap|
| Phases/HUD/audio |Two half-health entry phases;three/four later;separate name/grade/form/phase/timer;segmented bar, priority phase bell, reduced-motion-aware engraving/banner|
| Classes/skills/weapons |Seven kits, 378 skills/63 paths, 28 weapons;21 purchased ability transformations complete, human acceptance open|
| Optional skill map |Default-off all 54 view with bounded zoom/scroll/keyboard;human/rendered review open|
| Maps/modes |Six layouts, five modes;four spacious maps compacted;Ossuary/Crown retain routes;paint/collision/prediction share transforms|
| Original quality |Constable/Warden passes implemented, 58 others await individual assessment/redesign;human final acceptance zero|
| Early Watch/Small Wakes |Six original integrated encounters, 72 selected poses, six scores, fifteen-locale help|
| Selected motion/music |1,542 poses;66 individual boss themes plus City Wake/67 MP3 deliveries;one new original phase cue|
| Assistance |Baby/Easy/Normal revivals 100%/50%/25%, Hard+ disabled;shield only Baby/Easy Standard, six/three circles, two/three seconds|
| Arenas |Baby+2real props, Hard half, Insane/Hellish no interior cover;Hellish warned lava|
| Endless/continuity |Per-identity cleared form progresses Standard→Brutal→Crazed;bags, repeat protection and build caps retained;known issued local protocol 20 migration, online strict|
| Existing systems |Profiles/mastery/cosmetics/remaps, all five modes, seven base kits and bank-safe consented secret implemented|
| Recovery/rankings |Normal writer disabled; hosted credentials/history paging/departure/storage-owner/ranking gates open|
| Acceptance/release |Human balance/listening, rendered/native-language/device, mixed-progression/WAN/endurance/capacity / coordinated release remain open|
| Governance |Same branch/draft PR #14/protected main;Wiki 18 pages / 34 images;older protocol 4 Site/protocol 13 Windows remain separate|

Local validation passes **497 automated tests**, authored content/fifteen locales, TypeScript and production build. The separate actual-Game audit covers **3,876 phase/form/map combinations**, 100 observed ticks per phase and 387,600 observed ticks total; it checks finite boss positions and the hostile cap around initial casts, not full fights or capacity. The conservative 15,834-row offensive model has zero deadline misses, with declared aim/build assumptions. Dedicated actual two-client rooms replicate Crazed admission, locked extra pressure, one additional sound per actual phase and cleanup. Controlled clock rings emit 24/60/180 unique projectile IDs across Standard/Brutal/Crazed and preserve stop/resume; drone-source destruction still cancels its linked shots.

Local snapshot `a1729f860be4a1790f5bd1238fd156cfc2559a08b23e9895739a53964e821d3e`; runtime source `e48a9909c96b36954cffd1b7a4ae5ecce24b544115d5b3b9d3b4fa12cbb57fd4`; content revision `312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006`. Production is **1,685 files / 721,046,341 bytes**. Exact files, failed attempts, geometry/content audit, current art verifier outputs and original phase-cue PCM reconstruction: `reviews/crazed-horizon-2026-10-26/`. All 66 previous Standard definitions, all 66 previous Brutal definitions, intrinsic grades, classes/skills/weapons/pools and authored maps remain unchanged; current map compaction is an explicit runtime transform. Existing native artwork, music masters/deliveries and all 34 Wiki images are preserved. New phase cue: 1.36 s, 59,976 stereo frames at 44,100 Hz, peak 0.8, RMS 0.15277, DC below 0.00001; listening acceptance remains open.

Exact complete-source CI, preview and Wiki receipts are recorded in the completed checkpoint section below; historical green hashes are not substituted for current evidence. No browser, physical-device, native-language, listening or final balance acceptance is inferred from these software checks.

The latest frozen preview is5186/source6b28eb3, with exact byte/process/HTTP receipts below. The latest received human comparison remains5185/source5f71f73 until a new response arrives. All previous roots/processes remain untouched. Browser control is disabled. New software evidence does not grant human/device/listening acceptance or close any of the85 new-identity / 58 quality/recovery/WAN/release gates. [Current difficulty rules](DIFFICULTY_AND_PHASES.md), [Crazed implementation](CRAZED_HORIZON.md), [class transformations](CLASS_TALENTS.md), [optional tree](OPTIONAL_SKILL_MAP.md).

## Completed Crazed checkpoint evidence

The complete gameplay source is **`6b28eb3ff6af39b4ecbcdb22a014ac9833190685`**, build **2026.10.26-crazed-horizon / protocol 21**. Both exact GitHub checks succeeded: jobs 121962939189 (direct branch source) and 121962988880 (PR merge candidate with unchanged protected main). Both downloaded job logs show **497 tests / 497 pass / 0 fail**, pinned Node 24 / Pillow 12.3.0 and a successful production verification. The earlier 6145931 push omitted the new phase cue; 6b28eb3 adds that exact verified WAV and preserves raw logs. No preview or Wiki publication was frozen from the incomplete push. All Git history remains.

The committed canonical snapshot is `b1e93308b063ce721f8a5cc52e97616d53a8b75cea35a32bfbd0aae95fb849d0`. The local snapshot `a1729f860be4a1790f5bd1238fd156cfc2559a08b23e9895739a53964e821d3e` differs only in the pre-existing CRLF/LF byte of unchanged `pnpm-workspace.yaml` (143 local / 142 committed bytes). Runtime source matches committed bytes exactly: `e48a9909c96b36954cffd1b7a4ae5ecce24b544115d5b3b9d3b4fa12cbb57fd4`. All previous asset blobs, all 66 Standard/previous Brutal definitions and all 34 Wiki image blobs remain unchanged; the sole added asset is the original phase WAV. All 13 raw local logs match committed bytes.

Latest frozen Solo preview: **http://127.0.0.1:5186/**, runtime source 6b28eb3, PID **5196**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-crazed-horizon-6b28eb3`. Every one of **1,685 files /721,046,341 bytes** matches the production receipt. **30 raw HTTP checks** pass, including the new cue, atlases, music, client/worker and selected locale bundles. All eight earlier 5178–5185 roots were fully verified unchanged: **13,340 files /5,512,592,258 bytes**, and all previous index responses still match. Existing listener PIDs were retained; none was stopped,replaced or restarted. Preserve all 5174–5186 roots/processes.

Wiki **18 pages / 34 images** is published from the exact complete source above at **`afe23ae049de49e7f8859c0f65f99d829eb29172`**. All 18 Markdown blobs,34 image blobs and34 public image SHA256 responses match; four anonymous HTML responses pass. Canonical Wiki bytes are unchanged by the later metadata seal. Source pushes do not deploy the older protocol 4 Site or immutable protocol 13 Windows archive. Header rendering, audio listening, native-language/device and final human balance acceptance remain open.

Exact reports live under `reviews/crazed-horizon-2026-10-26/`: runtime,committed-source audit,all-boss geometry,phase-sound reconstruction,local/CI excerpts,Wiki/preview/process/HTTP/guard receipts and preserved failed attempts. The latest actual branch HEAD may be a metadata follow-up; inspect it and its own checks. Runtime inputs and canonical Wiki must stay identical to the complete source 6b28eb3 for this preview/publication evidence to apply.
