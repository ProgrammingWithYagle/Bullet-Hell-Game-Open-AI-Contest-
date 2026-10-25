from pathlib import Path
import hashlib,json,shutil

R=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
H=R/'docs/history/2026-10-25-checkpoint-cleanup'
assert not H.exists(),'This guarded cleanup already ran; inspect partial state before resuming.'
H.mkdir(parents=True)
records=[]
def edit(path,text,reason):
    p=R/path
    if p.exists():
        old=p.read_bytes();archive=H/path;archive.parent.mkdir(parents=True,exist_ok=True);archive.write_bytes(old)
        records.append({'path':path,'archive':archive.relative_to(R).as_posix(),'bytes':len(old),'sha256':hashlib.sha256(old).hexdigest(),'reason':reason})
    p.write_text(text,encoding='utf-8',newline='\n')
def read(path):return (R/path).read_text(encoding='utf-8')
def dump(j):return json.dumps(j,ensure_ascii=False,indent=2)+'\n'

checkpoint="""# Grave Accord continuation checkpoint — October 25, 2026

This is a requested handoff checkpoint, not a completed-game release. The user asked to finish the current work, save it locally and on GitHub, clean stale instructions and continue in a new chat. Resume only when the user starts that continuation. Use this file and the structured progress ledger before older subsystem records.

## Exact workspace and source

- Existing project: `C:\\Users\\yigal\\OneDrive\\Documents\\ChatGPT\\OpenAI Multiplayer Game Contest (Bullet Hell)`.
- Repository: [ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-).
- Branch: `feat/first-playable-loop`; [PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14) stays draft.
- Last gameplay commit before this art/documentation checkpoint: `f1766fe9c41184df44c15902533aff0e2fd7ef2c`. Inspect actual `git status --short`, HEAD and origin before editing; this document is committed with the successor checkpoint.
- Build: `2026.10.25-brutal-signals`; protocol **14**; content revision `43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb`.
- Protected main stays `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`. No merge, paid provisioning, contest submission or replacement Site is authorized by this handoff.

## Current implementation and remaining scope

The playable source has **60 bosses: 59 ordinary and one secret**, seven classes, 378 skills/63 specialization paths, 28 weapons, eight supplies, 24 mutations, six maps and five modes. Each of the sixty bosses has an original theme; City Wake is the additional ambient track. All seven basic survivor motion sets are drawn. There are **1,466 selected runtime motion poses** across the complete installed scope; the twelve new Toad candidates below are separate.

| Requested pass | Implemented | Remaining | Acceptance |
| --- | --- | --- | --- |
| Ordinary bosses, three per fifty subtiers | 59 / 150 | **91 new identities** | New art concepts do not count |
| Existing-boss phase/mobility/Brutal quality | 1 / 60 | **59 assessments/redesigns** | Latest Constable pass awaits human review |
| Ability-changing class-upgrade revamps | 0 / 7 | **7** | Existing seven kits and 378 skills are playable |
| Optional large branching skill-tree view | 0 / 1 | **1** | Preserve the classic view and add a settings toggle |
| Secondary-map topology revamps | 5 / 5 | **0 implementation** | Five detailed human layout reviews remain open |
| Ground-art deliveries | 6 / 6 | **0 installation** | Limited Normal/Constable readability feedback only |
| Early Watch art-only motion candidate sets | 1 / 3 | **2** | Toad technical review only; no engine/human acceptance |

[Development progress](DEVELOPMENT_PROGRESS.md) and `docs/development-work-ledger.json` are the count authority. `tools/sync-development-progress.mjs` generates the local page, canonical Wiki page and shared in-game JSON. Update the ledger at meaningful checkpoints; run `--check` before publication. `src/shared/update-history.json` similarly drives the journal and both changelogs through `tools/sync-changelog.mjs`.

## Latest feedback and completed response

The human tested the earlier frozen **5177** build. Constable was slightly harder but appropriately easy; phase changes and Brutal still felt too similar. Music could be a little more intense. This is feedback on the predecessor, not approval of the later pass.

The completed f1766fe response adds a Brutal Patrol pincer, Cordon ring follow-up, triple Lockdown rings and Curfew rings plus pincer. Normal Cordon moves laterally. Attacks lock warnings and preserve recovery; phase changes clear outgoing attacks. Four-second static phase-entry HUD edges and persistent response hints cover fifteen languages. Living Brutal main sprites have a warm red tint and broken red ground arcs; Normal/death clears them. Separate multipart actors have not all received an additional part-by-part treatment.

A quiet original synthesized tom/rim layer follows the existing sixty scores' BPM/meter, adds phase/Brutal accents and respects volume, warning ducking, visibility, voice bounds and stop cleanup. Original music bytes remain unchanged. Adopted policy: fixed boss identity and extra mechanics in the explicit Brutal form; global difficulty mainly scales stats, projectile pressure and resources while retaining recognizable tells. [Exact implementation](PHASE_AND_BRUTAL_FEEDBACK.md).

## Art checkpoint — resume here

Three original concepts are preserved: **Ashen Usher 1--**, **Brass Toad 1-**, **Ragpicker's Kite 1**. None is a playable encounter yet. The proposed mechanics are in `assets/production/generated/early-watch-motion-2026-10-25/design.issued.json`.

**Brass Toad:** four generated sheets are preserved. Hop v1 was rejected for insufficient padding/overlapping extents; actual clipping was not established. Hop v2, idle v2 and defeat v1 provide twelve complete technically normalized candidate poses. All alpha-bearing RGBA, connected figure ownership and final atlas packing are independently reconstructed. Uniform scale per native clip calibrates the initial upright body, then a shared readable bottom-center anchor retains faint surrounding pixels. Wider 768-pixel candidate cells are art-only and are not loaded by the game. Partial packing attempts remain in dated review history.

**Ashen Usher and Kite:** six full-sheet requests are prepared but have never been executed. A separate old Toad idle request was superseded before execution. The eleven prepared request files therefore include only four actual executions. Exact issued bytes and absolute paths are immutable; the provenance file provides repository-relative bindings. Start a new versioned request when adapting paths or layout, and view local references before image editing.

- [Motion provenance and portable bindings](early-watch-motion-checkpoint-2026-10-25.json).
- `assets/production/generated/early-watch-motion-2026-10-25/`: four natives, eleven requests, nine prepared reference canvases/seeds, issued preparation records and normalized candidates.
- `reviews/early-watch-motion-2026-10-25/`: original helpers, all partial packing history, independent verification and current full-suite evidence.
- `python -X utf8 tools/verify-early-watch-checkpoint.py`: Pillow/NumPy whole-pose and source/atlas reconstruction. It does not certify timing, root lift, browser rendering or gameplay.
- The three concept natives/requests remain under `assets/production/generated/early-watch-concepts-2026-10-25/` with their existing provenance.

![Brass Toad art-only motion candidates](wiki/images/brass-toad-motion-checkpoint.jpg)

Next: finish Usher/Kite whole-sheet motion with stable scale and complete poses, then implement three distinct shared-authority encounters with obvious phases, movement/arena pressure, warned counterplay and additional Brutal behavior. Add individual original themes, all fifteen locale names/help, canonical ratings and real tests. Only then increase the roster to **63**, ordinary to **62** and reduce the deficit to **88**. Continue other encounter quality, ability-changing upgrades and the optional tree afterwards.

Integration checklist: `BossId`/implemented IDs, content source and generated catalog/revision, fixed threat profiles, shared directors/cues/weak points, schema/session/view, client art/pose metadata, offline Practice migration bounded to issued revisions, route/Endless reachability, score/MP3 delivery, localization, progress/changelog and Wiki. Generic defeat assumes eight frames in some paths: the new four-frame candidate must have explicit range/timing metadata. Preserve the old loading-v3 reference bytes when creating a successor delivery version. Wind must share bounded force logic between authority and prediction. Do not count a recolor or stronger form as a new identity.

## Preview and verification

Latest preserved manual preview: **http://127.0.0.1:5178/**, frozen at f1766fe, build `2026.10.25-brutal-signals`, protocol 14. Its 1,651 copied files/656,484,789 bytes match production byte-for-byte; seventeen HTTP checks passed. This art/journal checkpoint does not replace that frozen runtime. The latest art progress is visible in the saved contact and updated source journal, not as a new in-game boss in that preview.

Compare New Run → Soldier → Quarantine Run → Gatehouse → Normal difficulty → review Hollow Constable, Solo, Boss form **Standard form** or **Brutal** → Play. Any class/map is valid; keep choices equal for comparison. No human verdict on f1766fe is recorded yet.

Hidden preview PID **34336**, root `C:\\Users\\yigal\\Documents\\Codex\\2026-10-23\\can-you-continue-with-the-development\\work\\playtest-brutal-signals-f1766fe`. Preserve older frozen ports 5174–5177 too. PIDs are historical identifiers: verify command line and occupancy before stopping any process. Mutable dev 5173 and server 2567 may not share the current protocol; never restart occupied rooms casually.

The predecessor's **382 tests**, content/fifteen locales, TypeScript and production build passed locally; both exact-head GitHub checks passed. Its source snapshot was `30b61b5240015871a61551286acf4dc5e1465784abecca5fb3c1e4d1a5014a1b`. The successor checkpoint's current full-suite evidence is saved as `reviews/early-watch-motion-2026-10-25/runtime.json` and `full-current.log`; check those exact source/artifact hashes. The final publication receipt is also saved in the previous chat's outputs directory.

Browser control is disabled in Work settings. The human explicitly asked to stop troubleshooting it. Do not retry, bypass with CDP or substitute browser-like evidence for actual rendered review. Continue source/headless/HTTP/art work and keep browser/device/audio/native-language gates open.

## Publication and remaining release work

Canonical Wiki: `docs/wiki/`; native checkout: `.wiki-checkout`; public [Development Progress](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Development-Progress). This checkpoint has **18 pages and 27 images**. Publish from a concrete committed source, verify remote Wiki is unchanged/clean, copy exact committed pages/images and run `node tools/verify-wiki-publication.mjs <source SHA>`. That verifies Git blobs, all public image hashes and four anonymous HTML responses, not rendered Wiki acceptance. A source PR push alone does not publish the Wiki.

The GitHub connector handles read metadata. Its PR-mutation access previously returned 403; the repository-scoped `node tools/github-admin.mjs update-pr` fallback uses configured credentials in process memory. Never print credentials. `checks <SHA>` reads exact checks. Keep PR draft and protected main unchanged.

The public Site remains the old protocol-4 two-class/one-boss build under another account. Do not create a replacement Site or pair a new backend with its old frontend. The issued [Windows development ZIP](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) remains immutable, source `52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e`, protocol 13. A new release needs a new tag/name and complete validation.

Remaining release gates include active mixed-progression 8/16/50-player, WAN and full progression endurance, 49 scripted plus one rendered under the target hostile load, physical controller/phone/native-language/listening and human balance. The one-hour local fifty-client probe is frozen-source continuous combat with zero rendered clients. Durable recovery still needs participant credentials, entropy history/paging, departures, hosted storage/owner acceptance and deployed rankings; the normal writer remains disabled. Profiles/cosmetics, short/standard/long/Raid/Endless and the individually consented bank-safe secret extension already exist. Do not reimplement them as if absent.

## Development setup and constraints

Use Node 24 and pnpm 11.25.0. `pnpm verify` performs content, type, real WebSocket/HTTP/SQL and production-build checks. Bundled Node is `C:\\Users\\yigal\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe`; fallback pnpm is in `dependencies\\bin\\fallback`. Include both directories in PATH. Python 3.11 has Pillow/NumPy; use `python -X utf8`. No SciPy/OpenCV is required by the shipped art verifier.

Read applicable AGENTS/skills, inspect actual Git status, preserve in-flight work. The repository is outside the previous task's writable root, so reviewed elevated shell access was used for writes, Git, local networking and builds. Use `git -c core.bare=false` consistently. No new clone, worktree, paid provider, main merge, contest submission, unsolicited external messaging or subagent delegation. Built-in image generation is the authorized art tool; technical whole-pose extraction/resizing may use Pillow. Never repaint anatomy or silently discard alpha to make an atlas fit.

Active documentation has been consolidated. Exact pre-cleanup handoffs/state/acceptance/roster plans are preserved under `docs/history/2026-10-25-checkpoint-cleanup/`; [cleanup inventory](checkpoint-cleanup-2026-10-25.json) records their hashes. Older subsystem guides are explicitly dated records, and older counts/formulas are superseded by current progress and fixed-threat rules. Issued assets, raw returns, failed evidence, prior builds and historical changelog entries remain available.
"""
edit('docs/CHECKPOINT_2026_10_25.md',checkpoint,'New current handoff checkpoint')
edit('docs/HANDOFF_NEXT_CHAT.md',"# Grave Accord — start here\n\nThe current continuation authority is [the October 25 checkpoint](CHECKPOINT_2026_10_25.md), followed by [development progress](DEVELOPMENT_PROGRESS.md) and [implementation state](IMPLEMENTATION_STATE.md). It records the existing local folder, exact gameplay source, current art, verification, remaining work, preview and publication boundaries.\n\nThe previous accumulating handoff is preserved byte-for-byte in [dated history](history/2026-10-25-checkpoint-cleanup/docs/HANDOFF_NEXT_CHAT.md). Its older counts and outstanding-work lists are historical. The user requested a clean handoff and a stop at this checkpoint; the next chat can resume the remaining development.\n",'Replace conflicting accumulated handoff with one current entry point')
start=r"""Continue Grave Accord in this SAME EXISTING project folder:
C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)

Read docs/CHECKPOINT_2026_10_25.md, docs/DEVELOPMENT_PROGRESS.md and docs/IMPLEMENTATION_STATE.md FIRST, then inspect actual Git HEAD/status, origin, reviews/early-watch-motion-2026-10-25/runtime.json and draft PR #14. Repository: ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-. Branch: feat/first-playable-loop. Preserve the working tree and history; do not clone or switch to main.

Current build 2026.10.25-brutal-signals, protocol 14: 60 playable bosses (59 ordinary + 1 secret), seven classes, 378 skills, 28 weapons, six maps, five modes and sixty original boss themes. Fixed threat grades use -- / - / no sign / + / ++; Brutal adds B, secret is >10. The minimum roster goal is 150 ordinary plus secrets: 91 new ordinary identities remain. Existing-boss quality assessments/redesigns: 59; ability-changing class upgrades: 7; optional large branching tree: 1. Five secondary-map layout revisions are implemented, with detailed human review still open.

Resume the Early Watch expansion. Ashen Usher 1--, Brass Toad 1- and Ragpicker's Kite 1 are ART-ONLY concepts, not encounters. Brass Toad has twelve technically normalized idle/hop/defeat candidates from three selected sheets, plus one rejected hop native. Six Usher/Kite requests are prepared but unexecuted. Exact natives/requests/canvases, portable bindings, partial packing history and an independent RGBA verifier are committed. Finish their motion and implement three original encounters with distinct phases, movement/arena pressure, warned counterplay, extra Brutal mechanics, individual music and fifteen-locale help. Only fully integrated content changes the roster to 63 and deficit to 88. Continue other bosses, ability-changing upgrades and the settings-toggle branching tree afterwards.

Latest human feedback concerns earlier port 5177: Constable was slightly harder but phase/Brutal differences still subtle; keep Normal appropriately easy. The completed f1766fe pass adds actual Brutal pincer/ring sequences, lateral Cordon movement, persistent phase-response hints, phase-entry cues, red variant treatment and tempo-aligned percussion. It awaits human review at frozen http://127.0.0.1:5178/. Any map/class works; compare Solo Hollow Constable, Normal global difficulty, Boss form Standard or Brutal with equal choices. Preserve all frozen preview roots/processes. Current source journal also records the art-only checkpoint; that does not add a boss to the frozen preview.

Keep one progress ledger and synchronized local/in-game/Wiki changelogs current at meaningful checkpoints. The Wiki has 18 pages and 27 images; publish exact committed canonical pages/images and verify all blobs/public image hashes. Keep PR #14 draft and main protected. The full suite has 382 tests; read the exact current local/CI evidence instead of assuming a historical hash is current. Browser control is disabled: do not retry or bypass it, and do not claim rendered, physical-device, native-language, listening or final balance acceptance.

The user now authorizes resuming the remaining development from this saved checkpoint. No new clone/worktree/subagent delegation, paid provisioning, replacement Site, mismatched backend deployment, main merge or contest submission. Existing public protocol-4 Site and immutable protocol-13 Windows development release remain separate. The game is unfinished; do not describe already implemented profiles/modes/classes as missing or claim a final release. Read the handoff's remaining hosted/recovery/WAN/device/release gates.
"""
edit('START_NEXT_CHAT.txt',start,'Replace protocol-6/five-boss prompt with a current continuation prompt')
state="""# Grave Accord implementation state

Updated October 25, 2026. [Current checkpoint and continuation](CHECKPOINT_2026_10_25.md) and [derived progress counts](DEVELOPMENT_PROGRESS.md) supersede earlier subsystem milestones.

| Area | Current source state |
| --- | --- |
| Build / protocol | 2026.10.25-brutal-signals / 14 |
| Bosses | 60 playable: 59 ordinary, one secret; all have original themes |
| Boss expansion | Target 150 ordinary plus secrets; 91 new ordinary identities remain |
| Classes / skills / weapons | Seven playable kits, 378 skills / 63 paths, 28 weapons |
| Maps / modes | Six installed layouts/sizes; Quarantine, Midnight, Pilgrimage, Raid and Endless |
| Existing encounter quality | Latest Constable phase/mobility/Brutal pass implemented; 59 others await assessment/redesign |
| New requested upgrades | Seven ability-changing class-upgrade revamps and one optional large branching-tree view remain |
| Map revisions | Five secondary topology changes and six ground deliveries installed; human/device acceptance remains separate |
| Motion | 1,466 selected runtime poses; seven complete basic survivor sets; special/boss work remains |
| Early Watch | Three original concepts; Toad has twelve art-only motion candidates; no new encounter/music yet |
| Profile | Mastery, rescues, codex, cosmetic insignia, preferences/remaps, import/export and full-Hard unlocks implemented |
| Recovery / rankings | Local bounded transport and process/owner fixtures exist; normal writer disabled; hosted durable service and credentials/history/departures remain open |
| Verification | 382 automated tests plus content/fifteen locales, TypeScript and production build; exact checkpoint receipts are separate from rendered/human acceptance |
| Publication | Feature branch and draft PR #14; 18-page/27-image Wiki; protected main and coordinated release remain separate |

The fixed identity grade, five signs, separate B marker and >10 secret are authoritative. Global difficulty and squad scaling do not rerate identities. [Fixed classifications](FIXED_BOSS_THREATS.md), [latest phase/Brutal response](PHASE_AND_BRUTAL_FEEDBACK.md), [direct solo form selector](BOSS_PRACTICE.md), [map/selection fixes](MAP_ROUTES_AND_SELECTION.md) and [motion continuity](MOTION_CONTINUITY.md) document the current behavior.

The latest preserved manual preview is http://127.0.0.1:5178/, frozen gameplay source f1766fe. No human verdict on that response is recorded. Current source also includes an art-only journal/progress entry. The old public Site stays at protocol 4; the issued Windows development ZIP stays at its source/protocol 13. Source/Wiki updates do not redeploy either.

Remaining development and acceptance are enumerated in [progress](DEVELOPMENT_PROGRESS.md) and the [acceptance backlog](IMPLEMENTATION_BACKLOG.md). Human balance/listening, native-language and physical-device review, active mixed-progression multiplayer/WAN/full endurance, durable hosted recovery/rankings and a coordinated final release remain open. Browser control is disabled and must not be bypassed. The user requested a saved checkpoint before starting a new chat; the full game is not complete.
"""
edit('docs/IMPLEMENTATION_STATE.md',state,'Replace stale 23-boss/protocol-9 state and completed-as-missing work')
accept="""# Acceptance ledger

Updated October 25, 2026. This ledger distinguishes implementation, automated evidence and human/device acceptance. [Current state](IMPLEMENTATION_STATE.md), [progress](DEVELOPMENT_PROGRESS.md) and [checkpoint](CHECKPOINT_2026_10_25.md) provide the exact current scope.

| Area | Implemented / verified evidence | Remaining acceptance or implementation |
| --- | --- | --- |
| Playable content | 60 identities, seven kits, 378 skills, 28 weapons, six maps, five modes | 91 additional ordinary identities; 59 existing-boss quality assessments/redesigns |
| Progression | Shops, votes, prerequisites, budgets, profiles and fixed graded contracts | Ability-changing upgrade passes for seven classes; optional branching-tree view; final human balance |
| Boss challenge | Constable movement, distinct geometry, added Brutal sequences, phase hints and red treatment | Latest human review and other 59 encounters' quality passes |
| Art | Seven basic survivor sets; 1,466 selected runtime poses; installed map/portrait changes | Remaining special/boss animations, rendered transitions and detailed human/device review |
| Early Watch | Three concepts and twelve technically normalized Toad candidates, with independent exact source/atlas reconstruction | Usher/Kite motion; all three actual encounters, music, localization and integration |
| Audio | Sixty original boss themes plus ambient; 61 compressed deliveries; bounded phase percussion | Human/device listening and crowded mix acceptance |
| Automated source | 382 tests, content/fifteen-locale validation, TypeScript and production build | Exact source-local/CI publication checks for each later checkpoint |
| Maps | Five secondary topologies and six ground deliveries installed, collision/spawn/Accord reachability checked | Detailed new-layout human review; earlier Normal/Constable readability feedback has limited scope |
| Multiplayer | Real WebSocket/HTTP/SQL fixtures and a scoped one-hour local fifty-client combat probe | Full mixed-progression 8/16/50, WAN, 49+1 rendered target hostile load, device/endurance acceptance |
| Durable services | Bounded transport and actual process-replacement/competing-owner fixtures | Credentials, entropy history/paging/departures, hosted storage and deployed rankings; normal writer disabled |
| Windows | Immutable protocol-13 unsigned development release with native/extraction/copy evidence | Current-source new release, manual/device validation and final acceptance |
| Documentation | Shared in-game/local/Wiki changelog, structured progress, 18 pages and 27 images | Keep synchronized as work advances; native-language and rendered Wiki review remain open |

Browser control is disabled; earlier rendered samples do not certify current source. The public Site remains its earlier protocol-4 build. PR #14 remains draft and main remains protected. The current user request ends at a saved handoff checkpoint, not a final game/release claim. The superseded acceptance ledger is retained in dated history with an exact checksum.
"""
edit('docs/ACCEPTANCE.md',accept,'Replace first-playable acceptance rows with current implementation and explicit open gates')
roster="""# Boss production plan — current expansion

Updated October 25, 2026. The user's expanded minimum is **three original ordinary bosses in each of ten levels and five subtiers: 150 ordinary identities, plus secrets**. The current game has **59 ordinary bosses and The Uncounted**, leaving **91 additional ordinary identities**. Stronger forms/recolors do not count as new identities. [Derived coverage and other work](DEVELOPMENT_PROGRESS.md).

Bosses retain intrinsic grades. Signs --, -, no sign, + and ++ mean bottom through top tier. Brutal adds a separate B; >10 is above Calamity. Ratings can be revised by a deliberate versioned balance change, never by card position or encounter number. [Authoritative classification and selection](FIXED_BOSS_THREATS.md).

The original sixty-identity plan and its route-affinity lists are preserved in [dated history](history/2026-10-25-checkpoint-cleanup/docs/BOSS_ROSTER_EXPANSION.md). Those lists describe primary authoring affinities. Current five/ten/sixteen-fight campaign offers select suitable fixed grades from shared authored ordinary identities and retain regular/finale roles. Raid and Endless keep their documented reserved/exclusive schedules. Do not silently rescale a small route roster to impersonate the whole grade range.

## Next three original identities

| Identity | Proposed fixed grade | Distinct mechanic | Current state |
| --- | --- | --- | --- |
| Ashen Usher | 1-- | Breakable ticket stands and staggered warned aisles | Concept preserved; three motion requests unexecuted |
| Brass Toad | 1- | Locked hops, gapped landing ripples, tongue lane and drain-plug interruption | Concept and twelve art-only motion candidates; no encounter yet |
| Ragpicker's Kite | 1 | Orbiting cloth kite, wind corridors and breakable pins | Concept preserved; three motion requests unexecuted |

All three require shared-authority implementation, meaningfully different phases, additional harder Brutal sequences, clear warnings and escape spaces, localized help, individual original music and verification before the roster changes to 63/62 ordinary and the deficit becomes 88. [Current art and integration handoff](CHECKPOINT_2026_10_25.md).

## Existing roster quality

Constable has completed the first requested phase/mobility/Brutal implementation pass; latest human acceptance remains open. Other 59 existing encounters need assessment or redesign. Normal Constable should remain among the easiest bosses. Pressure should come from understandable movement and mechanics; blanket stat inflation does not establish a meaningful phase change. Brutal is the explicit form for extra attacks and visual identity, while global difficulty primarily scales stats/pressure/resources.

## Art and acceptance

Preserve a readable silhouette, restrained dry-ink/matte-gouache surfaces, one signature prop and quiet effects. Avoid noisy all-over detail and unexplained decorative particles. Generate complete clips in a single edit from preserved identity references, normalize with one physical scale and a shared anchor, and keep every native/request/rejected attempt. Native/contact QA, runtime integration, rendered animation and human balance/listening are separate gates. [Exact current progress](DEVELOPMENT_PROGRESS.md) is the authority for counts.
"""
edit('docs/BOSS_ROSTER_EXPANSION.md',roster,'Replace obsolete sixty-boss target and variable-grade route assumptions')
first="""# Current playable development build

Build **2026.10.25-brutal-signals**, protocol **14**. The feature branch implements sixty distinct bosses, seven classes, 378 skills, 28 weapons, six maps and five modes. Every current boss has its own original theme. [Current state and limitations](IMPLEMENTATION_STATE.md) and [continuation checkpoint](CHECKPOINT_2026_10_25.md) replace the earlier two-class/one-boss first-loop instructions.

Use Node 24 and pnpm 11.25.0: `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`. Offline Solo runs in the local worker; matching online development needs `pnpm server`. Check exact protocol/source before pairing front/backends. The preserved manual comparison build is http://127.0.0.1:5178/; keep its existing files/process unchanged.

Solo review offers a direct Standard/Brutal opener selector. [Playtest instructions](BOSS_PRACTICE.md). Fixed grades, extra Constable Brutal sequences, phase hints, red presentation and quiet responsive percussion are in current source. [Phase response](PHASE_AND_BRUTAL_FEEDBACK.md).

The full source suite passes 382 tests, content/fifteen locales, TypeScript and production build; exact checkpoint receipts remain source-bound. Browser control is disabled, and new rendered/device/native-language/listening/human acceptance remains open. Three Early Watch concepts and twelve Toad motion candidates are art-only and do not increase the playable count.

The [public Site](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) still hosts the older protocol-4 two-class/one-boss deployment. The issued Windows development download is also an earlier immutable build. Current source/Wiki publication does not redeploy them. PR #14 remains draft; protected main and final release are separate. Earlier first-loop evidence is preserved in dated history.
"""
edit('docs/FIRST_PLAYABLE.md',first,'Replace old first-loop current-state instructions while retaining historical evidence')

# Dated records retain their own precise evidence, without presenting old totals as the current game.
dated=['ART_NORMALIZATION_AND_MOTION.md','ART_PRODUCTION_PROGRESS.md','WARDEN_AND_HEAVY_RUNTIME.md',
       'WARDEN_SIGNATURE_REHEARSAL.md','BOSS_ENCOUNTERS_ITEMS_AND_MUSIC.md','CLASS_AND_ARENA_RUNTIME.md',
       'QUARANTINE_RUNTIME.md','MIDNIGHT_CIRCUIT_RUNTIME.md','PILGRIMAGE_RUNTIME.md','GRAND_RAID_RUNTIME.md',
       'ENDLESS_AND_UNCOUNTED_RUNTIME.md','BALANCE_AND_COLLISION_RUNTIME.md','AUDIO_BIBLE.md',
       'TANK_ACTION_MOTION.md','ENGINEER_ACTION_MOTION.md','MAGE_ACTION_MOTION.md',
       'HEAVY_AND_ASSASSIN_ACTION_MOTION.md','SOLDIER_MEDIC_ACTION_MOTION.md',
       'ARENA_GROUND_ART.md','OPENING_BOSS_DEFEATS.md','MOTION_CONTINUITY.md','CONSTABLE_MOTION.md',
       'SURVIVOR_TEXTURE_DELIVERY.md','SURVIVOR_MOTION_TIMING.md']
for name in dated:
    path='docs/'+name;s=read(path);head,sep,tail=s.partition('\n')
    banner='\n> Dated subsystem record: counts, source hashes and test totals below describe this page\'s recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.\n'
    edit(path,head+'\n'+banner+tail,'Label historical subsystem totals and superseded threat rules explicitly')

path='docs/SKILL_TREE_AND_MENU.md';s=read(path)
s=s.replace('Eighteen Soldier/Medic specialization paths have runtime purchase checks. The other five classes remain authored definitions until their combat kits are implemented.',
            'All seven class kits and all 63 specialization paths / 378 skill nodes are implemented. The new requested pass adds ability-changing upgrades for each class and a separate settings-toggle large branching-tree view; those seven revamps and the optional view remain open.')
edit(path,s,'Correct five classes incorrectly listed as authored-only')
path='docs/GAME_BIBLE.md';s=read(path);head,sep,tail=s.partition('\n')
banner='\n> Current implementation/production authority: [state](IMPLEMENTATION_STATE.md), [progress](DEVELOPMENT_PROGRESS.md), [fixed threats](FIXED_BOSS_THREATS.md) and [continuation checkpoint](CHECKPOINT_2026_10_25.md). The expanded target is 150 ordinary bosses plus secrets; 60 are currently playable (59 ordinary, one secret). Earlier route tables below retain design history; shared fixed-grade campaign selection supersedes strict primary-route fences and encounter rerating.\n'
s=head+'\n'+banner+tail
s=s.replace('Initial health formula: 1800 * 1.22^(threat-1) * (timer/120) * archetypeHealthFactor * (1 + 0.7*(roster-1)) * difficultyHealth * activeMutationHealth.',
            'Current fixed-grade health starts with 1800 * 1.22^(min(level,10)-1) * (1 + 0.08*subtier) * (timer/120) * archetypeHealthFactor, then applies party, difficulty, mutation and mode/form/cycle modifiers. Use the shared runtime helper and [fixed-threat specification](FIXED_BOSS_THREATS.md) for exact rules.')
edit(path,s,'Promote current fixed-grade rules and expanded target above the original design baseline')
path='docs/IMPLEMENTATION_BACKLOG.md';s=read(path);head,sep,tail=s.partition('\n')
edit(path,head+'\n\n[Current checkpoint](CHECKPOINT_2026_10_25.md) and [structured progress](DEVELOPMENT_PROGRESS.md) track 91 new ordinary identities, 59 existing-boss assessments/redesigns, seven class-upgrade revamps and the optional branching tree. Twelve new Toad motion candidates are art-only and excluded from the runtime pose total.\n'+tail,'Add current prioritization and art-only count boundary')

ledger=json.loads(read('docs/development-work-ledger.json'))
ledger['items'].append({'id':'early-watch-motion','label':'Early Watch art-only motion candidate sets','target':3,'implemented':1,'remaining':2,'humanAccepted':0,'completedIds':['brass-toad'],'status':'Toad has twelve technically normalized candidates; Usher/Kite sheets are unexecuted. All three encounters, music and rendered acceptance remain open.'})
edit('docs/development-work-ledger.json',dump(ledger),'Record the current technical art checkpoint without changing playable counts')
history=json.loads(read('src/shared/update-history.json'))
history['entries'].insert(0,{'id':'early-watch-motion-and-clean-handoff','date':'2026-10-25','title':'Art-only Toad motion checkpoint and current continuation guides','groups':[
 {'title':'Production and provenance','items':['Preserved four exact Brass Toad motion returns, selecting twelve complete idle/hop/defeat candidates. The first hop was rejected for tight padding; actual clipping was not established. No new encounter or theme is playable yet.',
 'One upright-calibrated scale per clip and a shared readable anchor retain all faint edge pixels. An independent verifier reconstructs connected figure ownership, all alpha-bearing RGBA and the final candidate atlas. Wider art-only cells are outside the runtime index.',
 'Six Ashen Usher/Kite requests remain prepared and unexecuted. The playable roster stays 60 and the ordinary-boss deficit stays 91; the twelve candidates do not increase the 1,466 runtime pose total.']},
 {'title':'Current documentation and handoff','items':['Replaced stale protocol-6/five-boss continuation instructions and old implementation/acceptance pages with the current checkpoint. Exact old copies and partial packing evidence remain in dated history.',
 'Updated the 150-ordinary-boss target, class upgrade/tree work and historical guide labels. The shared progress ledger now also records the Toad art-only candidate set, with Usher/Kite motion and all three encounters still open.',
 'Added a twenty-seventh Wiki image and prepared an exact local/GitHub continuation handoff. The game, rendered/device acceptance and coordinated release remain unfinished.']} ]})
edit('src/shared/update-history.json',dump(history),'Add a concrete art-only journal/changelog checkpoint')

path='README.md';s=read(path)
s+='\nStart a continuation with [the current checkpoint](docs/CHECKPOINT_2026_10_25.md) and `START_NEXT_CHAT.txt`. Three Early Watch concepts and twelve Toad motion candidates are preserved as art-only work; no additional boss is playable yet. Superseded handoffs/state/acceptance records are retained in dated history.\n'
edit(path,s,'Promote the current handoff and art checkpoint from the repository entry point')

gallery='\n## Brass Toad motion checkpoint — art only\n\nTwelve complete idle, hop and defeat candidates are technically normalized, with exact native/request preservation, connected-figure ownership and alpha-bearing RGBA/atlas reconstruction. The first tight hop sheet and partial packing attempts are retained. This static contact is not an engine capture; no Toad encounter, individual music or rendered acceptance is added. Usher/Kite motion requests remain unexecuted. The playable count is still 60, with 91 new ordinary bosses needed.\n\n![Brass Toad art-only motion candidates, not a playable encounter](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/brass-toad-motion-checkpoint.jpg)\n\n[Current continuation checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CHECKPOINT_2026_10_25.md) · [Exact motion provenance](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/early-watch-motion-checkpoint-2026-10-25.json).\n'
edit('docs/wiki/Art-Gallery.md',read('docs/wiki/Art-Gallery.md')+gallery,'Add current art-only motion image and explicit integration status')
edit('docs/wiki/Contributing.md',read('docs/wiki/Contributing.md').replace('all fifteen canonical Wiki pages','all eighteen canonical Wiki pages')+'\nFor a new chat, begin with the [current checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CHECKPOINT_2026_10_25.md). Preserve dated histories and exact issued art; current counts belong in the shared progress ledger.\n','Correct Wiki page count and continuation read order')
edit('docs/wiki/Home.md',read('docs/wiki/Home.md')+'\nThe latest [continuation checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CHECKPOINT_2026_10_25.md) preserves the current source and art. Brass Toad has twelve art-only motion candidates; the three new concepts are still outside the playable roster. [View the motion contact](Art-Gallery#brass-toad-motion-checkpoint--art-only).\n','Link current handoff and art status from Wiki home')
edit('docs/wiki/Audio.md',read('docs/wiki/Audio.md').replace('The full pipeline now passes 272 tests.','The compressed-delivery checkpoint passed 272 tests; current full-suite totals are recorded in [Development Progress](Development-Progress) and the source verification receipt.'),'Scope the old test total to its historical audio stage')
images=json.loads(read('docs/wiki-images.json'));p=R/'docs/wiki/images/brass-toad-motion-checkpoint.jpg'
images['files'].append({'path':'images/'+p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'width':1720,'height':1140,'caption':'Twelve complete Brass Toad art-only motion candidates at a common provisional body scale. Not a playable encounter or engine capture.'})
edit('docs/wiki-images.json',dump(images),'Add the twenty-seventh image while keeping all previous image hashes')
pr=json.loads(read('docs/github/first-loop-pr.json'))
pr['body']=pr['body'].replace('twenty-six Wiki illustrations','twenty-seven Wiki illustrations')
pr['body']+='\nThe latest art-only checkpoint preserves twelve technically normalized Toad idle/hop/defeat candidates, four exact motion returns and six unexecuted Usher/Kite requests. Independent source/atlas reconstruction passes without runtime admission. Current handoff/state/acceptance/roster guides replace obsolete milestones; exact originals remain in dated history. The playable count, content revision and 91-boss deficit are unchanged.\n'
edit('docs/github/first-loop-pr.json',dump(pr),'Describe the final saved art/documentation scope in the draft PR')
edit('tools/verify-wiki-publication.mjs',read('tools/verify-wiki-publication.mjs').replace('all seventeen published Git Wiki Markdown blobs','all eighteen published Git Wiki Markdown blobs'),'Correct stale evidence-description page count')
attrs=R/'.gitattributes'
with attrs.open('a',encoding='utf-8',newline='\n') as f:
    f.write('\n# Byte-preserved checkpoint copies and partial packing history.\nassets/production/generated/early-watch-motion-2026-10-25/** -text -whitespace\nreviews/early-watch-motion-2026-10-25/** -text -whitespace\ndocs/history/2026-10-25-checkpoint-cleanup/** -text -whitespace\n')
cleanup={'checkpoint':'2026-10-25','sourceBeforeCleanup':'f1766fe9c41184df44c15902533aff0e2fd7ef2c','strategy':'One current continuation entry point; exact old text archived; dated subsystem records explicitly labeled. No asset/native/build/evidence deletion.','archives':records,'runtimeBossCountUnchanged':60,'limits':['Historical changelog entries and source-bound evidence retain their original counts.','Old deployed and issued development builds remain separate from current source.']}
(R/'docs/checkpoint-cleanup-2026-10-25.json').write_text(dump(cleanup),encoding='utf-8',newline='\n')
(H/'INDEX.md').write_text('# Superseded documentation snapshots\n\nExact pre-cleanup copies from October 25, 2026. These are dated history, not current instructions. Start with `docs/CHECKPOINT_2026_10_25.md` and `docs/DEVELOPMENT_PROGRESS.md`. Checksums and reasons are in `docs/checkpoint-cleanup-2026-10-25.json`. Issued assets, failed evidence and builds were not deleted.\n',encoding='utf-8',newline='\n')
print(json.dumps({'archivedDocuments':len(records),'currentWikiImages':len(images['files']),'runtimeBosses':60,'artOnlyCandidatePoses':12}))
