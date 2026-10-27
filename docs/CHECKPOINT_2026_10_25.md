# Grave Accord continuation checkpoint

Updated October 26, 2026. The user's full development goal remains active. Read this page, [development progress](DEVELOPMENT_PROGRESS.md) and [implementation state](IMPLEMENTATION_STATE.md) first, then inspect actual Git/status/origin/PR #14 and the exact current receipts.

## Same existing workspace

Use `C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)` on `feat/first-playable-loop`, origin `https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.git`. Preserve all files/history. No clone/worktree/delegation, branch switch to main, paid provisioning, replacement Site, mismatched backend deployment, main merge or contest submission is authorized. Main remains separately protected at c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1; PR #14 must stay open/draft. Use the connector where supported and scoped `tools/github-admin.mjs` for denied/missing capabilities; credentials stay in process memory.

Current build **2026.10.26-crazed-horizon**, protocol **21**. Counts: **66 playable identities =65 ordinary +1 secret**, seven classes, 378 skills/63 paths, 28 weapons, six maps, five modes, 1,542 selected runtime poses, 66 individual boss themes plus City Wake and67 MP3 deliveries. These new forms add no identities and no individual original-roster quality credit.

## Current human feedback and implemented response

Human comparison on frozen 5185 confirmed clearer phase changes, slightly harder late phases and a harder Brutal form. The three Small Wakes bosses remain intentionally weak entry encounters. The user identified excessive retreat space/corner camping and asked for a more atmospheric boss header, Insane forced Brutal, Hellish forced purple Crazed/C, increased projectile budgets, advanced Endless forms and a distinct phase sound. This pass implements those requests; new human comparison remains open.

**Insane forces Brutal; Hellish forces Crazed** across openings, future cards, repeats and the consented secret. Lower-difficulty local Practice offers all three forms. Brutal uses a 2.5× ordinary projectile budget; Crazed 7.5× Standard (3x Brutal), subject to finite queues/live cap and authored cancellation/safety. Extra warned pursuit marks/crosscuts apply to Brutal; Crazed adds faster pressure and delayed perpendicular weaves. Controlled clock/drone shots scale inside their own controller. Crazed inherits every full Brutal signature and retains its 2× health/damage, 1.5× deadline and1.75× bounty; this is a mechanical pressure increase, not another HP multiplier. Purple bodies include independently drawn Choir/Triplet parts; C and six unique marks supplement color. No instant-kill attacks are added.

Endless records highest actually cleared form per identity: Standard then Brutal then Crazed thereafter. Seeded bags, twelve-identity repeat protection, progression caps and actual saved boundaries remain. Protocol 21 migrates only known issued protocol 20 local Practice/profile revision 86ace798..., plus earlier bounded migrations. Current form history survives offline/authoritative restore; unknown revisions and online/signed state stay strict. Legacy form history is conservatively Standard rather than invented.

Four spacious footprints are smaller: Gatehouse 1344×840, Triage 1376×774, Chapel 1260×828, Foundry 1350×765. Ground placement, every collider and spawns transform together. Ossuary 1300×1000 and Crown 1240×880 retain existing routes. Player speed, dash distance, body sizes and source art pixels remain. The boss heading now separates name, grade/form, phase/name and timer. Bar dividers/static entry cues remain; a brief engraving/banner animation respects both reduced-motion settings and retriggers for fast phase changes. An original distinct two-strike phase bell follows effects volume, gets bounded priority and briefly ducks music. Bespoke per-boss transformation animation remains later art work. [Full rules](DIFFICULTY_AND_PHASES.md), [implementation](CRAZED_HORIZON.md).

## Preserved assistance and earlier integrations

One combat-revival policy: **Baby 100%, Easy 50%, Normal 25%, Hard/Insane/Hellish disabled**, including solo, teammate, Medic and kits. Hard+ cannot buy/consume revive kits. Recovery between encounters remains. Phase shield circles are **Baby/Easy Standard only**, disabled in all advanced forms: Baby six circles / two-second hold; Easy three circles/three-second hold, at most three simultaneous occupants for large squads. Baby adds two real cover props/map; Hard half interior cover; Insane/Hellish none. Boundary walls and boss-created structures remain. Hellish keeps warned lava after a three-second opening tell, 24damage/second in half-second hits and clear deployments.

Entry threats 1–2 retain two half-health phases; later bosses three Standard/four advanced phases. Fixed grades --/-/no sign/+/++, separate B/C, secret>10; global difficulty/squad size never rerate identities. Normal health is unchanged. Insane global health is 1.25× before its forced Brutal form, avoiding a conservative Tank opening deadline miss; Hellish stays 1.2× before Crazed. All 66 Standard and previous Brutal definitions remain unchanged.

Early Watch and Small Wakes are integrated, six original encounters with72 selected poses, total six individual scores and fifteen-locale help. Their older art-only records remain historical. Original-roster Constable/Warden quality passes are implemented;58 remain, human final acceptance zero. Warden uses rest-only collision-resolved patrol, locked origins, alternating advanced direction and a fully warned sequential return with one active cone. [Warden](WARDEN_PATROL.md), [Early Watch](EARLY_WATCH_RUNTIME.md), [Small Wakes](SMALL_WAKES_RUNTIME.md).

Seven class revamps/21 ability transformations are implemented at existing utility-path depth three. All 378node IDs, costs/prerequisites, numeric effects and one-capstone rule remain; human/rendered/native-language/device acceptance remains open. The optional all 54 skill map is default-off with zoom.65–1.4, scroll/keyboard. Profiles/mastery/cosmetics/remaps, all five modes, seven base kits and bank-safe consented secret already work. Do not describe them as missing.

## Ledger, remaining work and gates

`docs/development-work-ledger.json` is the count authority; `tools/sync-development-progress.mjs` derives local/Wiki/in-game progress. `src/shared/update-history.json` drives the in-game/local/Wiki changelogs. Keep them synchronized at meaningful checkpoints.

- **85 new ordinary identities** remain toward150 ordinary plus secrets, three per fixed level/subtier. Recolors and advanced forms never count as new identities.
- **58 original quality assessments/redesigns** remain. The other encounters are already playable. A common variant-pressure layer does not complete their individual redesign passes.
- Tune/review the21 implemented class transformations and optional tree; no class implementation pass remains.
- Complete remaining special-ability/boss action art, bespoke transformation animation and actual rendered transitions.
- Complete human final balance/listening, native-language and physical-device acceptance.
- Verify active mixed-progression 8/16/50-player, WAN/full endurance and 49 scripted plus one rendered hostile-load gates. The earlier one-hour 50-client result is frozen-source local continuous combat with zero rendered clients.
- Durable hosted recovery still needs participant credentials, entropy history/paging, departures, storage/owner acceptance and deployed rankings. Normal recovery writing remains disabled.
- A coordinated new Windows/browser release needs a new tag/name and full validation. Public Site remains protocol 4; immutable `dev-windows-20261024-1` remains protocol 13 / source 52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e. No deployment, merge or submission has occurred.

## Frozen previews and control limits

Preserve every root/process 5174–5185. Existing listeners 5178–5185 were observed live during this pass; none was stopped, replaced or rewritten. Inspect actual PID/command lines and port ownership before process actions; non-elevated port enumeration can omit these processes and is not evidence that they stopped.

| Port | Frozen source | Scope |
| --- | --- | --- |
|5178|f1766fe|Constable signals, protocol 14|
|5179|bbf909a|Early Watch, protocol 15;earlier human feedback|
|5180|deb4896|Optional tree, protocol 15|
|5181|3355e92|Earlier difficulty pass, protocol 16|
|5182|fb78b70|Latest revive/circle/Baby-cover rules, protocol 17|
|5183|9bee65b|Class transformations, protocol 18|
|5184|81805fc|Warden patrol, protocol 19|
|5185|5f71f73|Small Wakes, protocol 20;latest human comparison|

The new Crazed preview is frozen at5186 from the complete source6b28eb3; exact receipts follow below. These static previews use Solo; no mismatched permanent backend is deployed. Keep older 5174–5177 roots too. Browser control is disabled: do not retry/bypass it through CUA, CDP or another route. Do not claim rendered, physical-device, native-language, listening or final human balance acceptance.

## Verification and publication

Local validation passes **497 automated tests**, authored content/fifteen locales, TypeScript and production build. The separate actual-Game audit covers **3,876 phase/form/map combinations**, 100 observed ticks per phase and 387,600 observed ticks total; it checks finite boss positions and the hostile cap around initial casts, not full fights or capacity. The conservative 15,834-row offensive model has zero deadline misses, with declared aim/build assumptions. Dedicated actual two-client rooms replicate Crazed admission, locked extra pressure, one additional sound per actual phase and cleanup. Controlled clock rings emit 24/60/180 unique projectile IDs across Standard/Brutal/Crazed and preserve stop/resume; drone-source destruction still cancels its linked shots.

Local snapshot `a1729f860be4a1790f5bd1238fd156cfc2559a08b23e9895739a53964e821d3e`; runtime source `e48a9909c96b36954cffd1b7a4ae5ecce24b544115d5b3b9d3b4fa12cbb57fd4`; content revision `312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006`. Production is **1,685 files / 721,046,341 bytes**. Exact files, failed attempts, geometry/content audit, current art verifier outputs and original phase-cue PCM reconstruction: `reviews/crazed-horizon-2026-10-26/`. All 66 previous Standard definitions, all 66 previous Brutal definitions, intrinsic grades, classes/skills/weapons/pools and authored maps remain unchanged; current map compaction is an explicit runtime transform. Existing native artwork, music masters/deliveries and all 34 Wiki images are preserved. New phase cue: 1.36 s, 59,976 stereo frames at 44,100 Hz, peak 0.8, RMS 0.15277, DC below 0.00001; listening acceptance remains open.

Exact complete-source CI, preview and Wiki receipts are recorded in the completed checkpoint section below; historical green hashes are not substituted for current evidence. No browser, physical-device, native-language, listening or final balance acceptance is inferred from these software checks.

Canonical Wiki remains18 pages / 34 images. Publish exact committed `docs/wiki/` pages/images through the existing `.wiki-checkout`, then verify every Markdown/image blob and all public image SHA256 responses with `node tools/verify-wiki-publication.mjs <sourceSHA>`. Source pushes alone do not publish Wiki. All 34 images remain unchanged in this pass; four compact runtime layouts do not silently rewrite historical gallery art.

Use bundled Node 24 and pnpm 11.25.0. Node is `C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`, fallback pnpm sibling `dependencies\bin\fallback`. Full verification is `pnpm verify`; independent art checks need Python 3 / Pillow 12.3.0 from `tools/art-verification-requirements.txt`. Use `python -X utf8`, `git -c core.bare=false` and reviewed elevated writes/build/network in this existing OneDrive folder. Task outputs belong under the projectless task's `outputs/`; never create a new checkout.

## Completed Crazed checkpoint evidence

The complete gameplay source is **`6b28eb3ff6af39b4ecbcdb22a014ac9833190685`**, build **2026.10.26-crazed-horizon / protocol 21**. Both exact GitHub checks succeeded: jobs 121962939189 (direct branch source) and 121962988880 (PR merge candidate with unchanged protected main). Both downloaded logs show **497 tests / 497 pass / 0 fail**, pinned Node 24 / Pillow 12.3.0 and successful production verification. Runtime inputs remain identical in the later documentation checkpoints. Inspect actual latest HEAD and its own checks; the full goal remains active.

Canonical snapshot `b1e93308b063ce721f8a5cc52e97616d53a8b75cea35a32bfbd0aae95fb849d0`; local snapshot `a1729f860be4a1790f5bd1238fd156cfc2559a08b23e9895739a53964e821d3e`. The difference is only the pre-existing CRLF/LF byte in unchanged `pnpm-workspace.yaml` (143 local / 142 committed bytes). Runtime source matches committed bytes exactly: `e48a9909c96b36954cffd1b7a4ae5ecce24b544115d5b3b9d3b4fa12cbb57fd4`. Content revision 312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006. All previous asset blobs, all 66 Standard/previous Brutal definitions and all 34 Wiki image blobs remain unchanged. The sole new asset is the original phase WAV. All 13 raw local logs match their complete-source blobs. The earlier 6145931 push omitted the WAV and its two CI jobs were cancelled; the following complete commit fixed admission without rewriting history. Only complete source was frozen/published.

Latest frozen Solo preview: **http://127.0.0.1:5186/**, runtime source 6b28eb3, PID **5196**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-crazed-horizon-6b28eb3`. All **1,685 files /721,046,341 bytes** match production and **30 raw HTTP checks** pass. All eight earlier 5178–5185 frozen roots were verified unchanged: **13,340 files /5,512,592,258 bytes**; prior index responses and listener PIDs remain. No previous listener was stopped, replaced or restarted. Preserve all 5174–5186 roots/processes. Browser control remains disabled.

The current Wiki is published from exact committed **documentation source `87f945aeeb2e97233974f33c72266e5df39e9ee0`**, at Wiki commit **`0c206ec9db7904fb6dd9db14520ebb2869571490`**. All 18 Markdown blobs,34 image blobs and34 public image SHA256 responses match, with four anonymous HTML responses passing. This follow-up corrects the current hosting label to protocol 21 and the backlog deficit to 85; it retains the issued Windows archive at protocol 13. Runtime inputs match 6b28eb3; canonical Wiki bytes match 87f945a. Later metadata changes must preserve those respective boundaries. Historical 6b28eb3/afe23ae publication evidence remains in `wiki-publication.json`; the current exact publication is `wiki-publication-final.json`.

Exact local/CI/production/geometry/phase-audio/preservation/preview/process/HTTP/Wiki/guard receipts and failed attempts live under `reviews/crazed-horizon-2026-10-26/`. No public Site or Windows deployment occurred. Rendered, physical-device, native-language, listening and final human balance acceptance remain open; no new roster or individual quality credit is counted. The remaining 85 ordinary identities, 58 individual quality passes and all hosted/recovery/WAN/device/release gates stay active.
