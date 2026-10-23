# Grave Accord — complete continuation handoff

**Latest continuation:** [WARDEN_SIGNATURE_REHEARSAL.md](WARDEN_SIGNATURE_REHEARSAL.md) adds eight drawn idle/channel frames (sixteen Warden motion frames total), measured lantern attachments and a separate local Phaser signature rehearsal. Nine new automated checks bring the full suite to 83. The room shares warning/active/rest geometry between rendering and collision; full encounter, network integration and final Phaser motion acceptance remain open. Browser troubleshooting was not repeated. Read current Git status and the exact verification/publication evidence before continuing.

Updated 2026-10-23. This is a continuation of an authorized game implementation, not a new project or a request to redesign it from scratch. The original handoff was requested to retry browser access; supported browser control worked earlier, but the latest retry has regressed; current access details are below. Read this document and IMPLEMENTATION_STATE.md before editing anything.

**Latest continuation:** [ART_NORMALIZATION_AND_MOTION.md](ART_NORMALIZATION_AND_MOTION.md) records 29 normalized static poses, five native portraits now integrated into setup, and one eight-frame Warden attack study. The local review page is `http://127.0.0.1:5173/tools/art-review.html#lantern-warden-attack`. Preserved prompts/natives, exact crops, atlas measurements, pixel/hash audit and screenshots live under assets/production and reviews/art-normalization-2026-10-23. Five new classes stay In production; Warden gameplay/full action libraries remain pending. Current source passes all 74 tests/content/type/build checks. Browser control worked for the saved art/portrait checks, then again returned disabled in Work settings during an incomplete offline-match smoke test. Preserve the later access interruption and capture limitations. Continue art/actions/encounter review and remaining first-loop gates; no repeat permission troubleshooting is needed. Read actual Git HEAD/status and publication evidence, not historical commit IDs below.

## 1. Open the correct workspace and preserve the working tree

**Use this existing local folder, including its uncommitted changes:**

`C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)`

Do not start in a clean clone, cloud container, main checkout, or fresh worktree. The preserved original work was committed/pushed as 853a5a6 and the first production connection as 33b36bc; later work must be read from Git status and exact evidence. Do not reset, clean, discard, overwrite, or regenerate the working tree indiscriminately. Inspect `git status --short` and the handoff inventory first. The original MIT license remains authoritative for the source.

- Branch: `feat/first-playable-loop`.
- Starting published Git HEAD: `47108bd4f60e0e0081407c16bc2941746f707533` — the earlier initial runtime, **not** the latest work on disk.
- Repository: https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-
- Existing draft PR 14: https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14
- Current source/content version: **0.3.0**. Protocol: **4**.
- Content fingerprint: `b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241`.
- The latest complete `verify` passed on 2026-10-23: authored-content checks, strict TypeScript, **74 rules and real-network tests**, and production build. `reviews/runtime-verification.json` records the exact current source digest and build artifact hashes; read that JSON after the latest verify run. This does not establish a finished game or current rendered performance.
- A first restricted run failed because SDK fetch could not reach loopback. The identical suite passed with normal reviewed local-network escalation. Do not change expected version-rejection assertions to hide access failures.
- The handoff's file inventory records paths, sizes and hashes independently of the old commit. It excludes dependencies/build output and its own inventory to avoid circular hashes.

## 2. Authorization, sources and production constraints

The user explicitly authorized the entire implementation and publication plan, including later additions. Continue through approved gates without repeatedly requesting permission for ordinary reversible development. Ask before concrete paid provisioning or financial exposure. Do not send messages to other people without authorization. This chat has no additional authorization for new subagents; three historical asset/research agents finished their bounded tasks. Their names do not represent pending jobs.

The user prioritizes polished, original art and usable gameplay, wants candid evidence, and dislikes repeated permission interruptions. Do not claim that authored definitions, static proofs, a mocked service, synthetic clients, or a build constitute the full shipped game. Human, physical-device, native-language and assistant/synthetic evidence must remain separate.

Original user brief and supplied rules are preserved under `docs/handoff-inputs/`. The brief's old “Stage 1 only” sentence predates the explicit later implementation authorization. Contest documents provide requirements, not permission to accept terms, make eligibility declarations, or submit the contest. Latest direct human instructions take precedence over earlier proposals.

Planning deadline: **October 30, 2026, 11:59 p.m. Pacific**. Actual Handshake submission is separate from GitHub publication. The official external rules link in the approved plan is https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0 . Recheck applicable official rules before final submission claims.

## 3. What the full game must deliver

Grave Accord is an original cooperative zombie bullet hell in dry ink and matte gouache. Clean silhouettes, quiet large surfaces, selective face/hand/weapon detail, readable hostile colors, restrained effects. No copied sprites, music, maps or signature artwork from reference games. The user specifically rejects noisy AI-looking images and placeholder symbols as final upgrade art.

| Experience | Capacity | Route | Target duration |
| --- | --- | --- | --- |
| Quarantine Run | 1–8 | 5 fights | 10–20 min |
| Midnight Circuit | 1–8 | 10 fights | 25–35 min |
| Black Bell Pilgrimage | 1–8 | 16 fights | 45–60 min |
| Grand Raid | 1–16 | 3 extended bosses | 10–20 min |
| Endless Vigil | 1–50 | No final encounter | Until defeat/departure |

Campaign routes need different layouts, encounter sequences and boss pools. Public discovery and private room codes are required across multiplayer modes. Final delivery includes public browser play, a downloadable portable Windows build, source and assets on GitHub Releases, canonical and published Wiki, one Project, protected main, changelog, provenance and third-party notices.

### Combat and progression locks

- Seven classes available without grinding: Soldier/pistol, Heavy/LMG, Tank/riot shotgun, Medic/injector carbine, Mage/grave wand, Engineer/rivet pistol, Assassin/needle launcher. Each has primary, dodge, two starting abilities and a cooldown ultimate. Ultimates have skill upgrades.
- No friendly fire or player collision. Friendly structures must allow teammates through. Authoritative swept collision for fast shots and dashes; visible hitboxes and clear telegraphs.
- Restore health and reload between fights. Any teammate can channel a 2 s revive during a 20 s downed window. Eliminated players return at the next encounter. Solo gets one self-revive per encounter. Whole party incapacitation or boss deadline causes defeat.
- Optional Accord Break objectives at major phase transitions scale participants without requiring a class. Current design/runtime uses 8 s windows, 2 s simultaneous pad occupation, requirements 1/2/3/5 by group size, 4 s stagger/vulnerability, +25% incoming boss damage, and 15% party recovery. Keep numeric definitions synchronized.
- Purchased power resets per run; mastery, cosmetics, lore, settings and difficulty unlocks persist. All seven classes must be selectable in the finished game.
- Campaign SP: start 3, earn 24 more before final fight. Before fight `j+1`, use `3 + floor(24*j/(R-1))`. Raid budgets 12/20/27. Endless reaches 27 by fight ten, then scales encounter challenge rather than uncapped player purchases.
- Skill costs along a six-node path are 1/2/3/4/5/6 (21 SP); maximum one active capstone. **Current expanded requirement is 378 nodes, not the original 126.** Every class has 3 parent branches × 3 specialization paths × 6 nodes = 54. Each parent contains all 18 grades D−/D/D+ through SS−/SS/SS+. The unrelated QA count of 126 class × campaign × difficulty combinations remains correct.
- Normalize base coin income by route length. Shops enforce class compatibility and server-owned currency/purchases. Riskier contracts increase bounty.
- After non-final victory: personal rewards → 15 s vote among 3 mutations → 15 s vote among 3 concealed bosses → 25 s shop/skills → 5 s deployment. Deterministic tie-breaking; disconnected players abstain. Mutations last 3 encounters, at most 3 active; exclusions and modifier limits apply.
- Difficulties: Baby, Easy, Normal, Hard, Insane, Hellish. A full campaign on Hard unlocks the last two. Tune HP, damage, complexity and recovery independently; validate deadlines against actual damage windows.
- Threat 1 Normal through 10 Calamity, with The Uncounted above ten. Threat does not reveal identity. Optional secret requires campaign victory on Normal+, 3 Accord Breaks, no timeout; bank normal victory before extension.

### Boss expansion and the user's latest combat requests

The user wanted at least 50 and possibly 100 bosses, distinct campaign gauntlets and additional Endless-only bosses. Current coherent design has **60 distinct identities**: 50 disjoint timed-route bosses (pools 9/14/20/7), 9 Endless exclusives, and The Uncounted. This is authored content, not sixty completed sprites or live encounters. Preserve original eleven identities: Hollow Constable, Carrion Courier, Pallbearer, Cradle Matron, Bellringer, Mold Alchemist, Stitchwright, Grave Choir, Mortuary Engine, Drowned Regent, The Uncounted. See `docs/BOSS_ROSTER_EXPANSION.md` and `content/bossPools.json` for ownership/signatures.

The user observed repetitive Constable animation/attacks and explicitly requested harder bosses with multiple phases and **a Brutal version of every boss with double power**, especially for Endless repeats. Current implementation choice: Brutal ×2 health, ×2 damage, ×1.5 deadline, ×1.75 bounty; four thresholds 100/75/50/25%, readable telegraphs ≥0.85 s and unchanged projectile caps. All sixty have authored variant definitions. Only Constable is currently implemented; its regular later phases add crossing volleys and gapped rings, with a fourth Brutal combo phase. Prototype Endless uses Brutal for each Constable repeat after its first clear. General per-boss completion tracking and full signature execution are still pending. These are variants, not additional distinct identities.

### Language, rankings, audio and polish requirements

- Fifteen launch catalogs: en, zh-Hans, zh-Hant, ja, es, fr, de, pt-BR, ru, hi, ar, bn, id, ur, ko. Simplified and Traditional Chinese are independent. Current catalogs each have **1,491 keys**, total **22,365** messages, **1,200** required content keys. AI-authored translations are not native approval. RTL menus must not reverse game geometry, numbers or rank order.
- One shared leaderboard row/rank for a team run, with expandable roster including departed/late participants. Four timed modes get bounded score from clear/time/survivors/damage; Endless orders completed progress first, then time through last clear and damage. Do not reward stalling in an unfinished fight. Exact formula, ties, partitions, HMAC/auth, D1 schema, restore/finalize races and outage behavior are specified in `docs/LEADERBOARDS.md` and `content/leaderboards.json`. No durable leaderboard implementation is shipped.
- Offline/modded/LAN remain Local/Practice, never verified global ranks. Timed base victory stays banked before secret extension. Accessibility options do not invalidate ranks.
- Original music and SFX are required. Current package has 2 arranged loops, 8 stems and 25 SFX (35 WAVs), with editable deterministic synthesis and objective checks. Final adaptive mix, more complete soundtrack/ambience and human listening remain pending.
- User requested actual icon-only item buttons with detail inspector, a visibly branching skill tree, first-visit tutorial with Skip, separate class/map/difficulty submenus, actual survivor portraits and map previews. Current guide is a 4-slide field guide, not an interactive combat tutorial. Polish it through playtesting.
- Player aiming must show north and south as well as east and west. Border walls must prevent walking/dashing into masonry. Concrete contract examples such as “3 players with A builds” plus visible current build grades must replace an unexplained squad multiplier. Voting should have distinctive illustrated cards and typography, not plain text boxes.

## 4. Exactly what exists in the playable subset

TypeScript + Phaser + Vite + Colyseus, with a shared deterministic headless simulation and offline worker. Electron is the approved Windows packaging target but has not been implemented.

Playable: Soldier and Medic only; Gatehouse only; Hollow Constable only; five-fight practice and uncapped prototype Endless. Other classes, routes and maps may be previewed in setup but are marked In production and cannot launch. Do not remove that honesty before their runtime is implemented.

Implemented in source:

- Shared 30 Hz combat, initially 20 Hz Schema patches; authoritative damage, collisions, purchases/rewards/votes/timers.
- Public rooms and private 6-character codes, room ownership/start, 60 s reconnect reservation, boundary admission, fraction-preserving departure scaling, separate room/instance capacity.
- Keyboard/mouse, gamepad and touch adapters; prediction/reconciliation, strict finite input/sequence checking, bounded queues and stale-input expiry.
- Soldier/Medic weapon combat, Q/E, ultimate, dodges, revives, solo self-revive, optional Accord Breaks, rewards/votes/shop/skills. Duplicate purchase idempotence and class/prerequisite/capstone checks.
- Expanded skill effects on the two implemented classes, including Medic hit-triggered ally healing with rate cap. All 18 two-class specialization paths have prerequisite/SP tests.
- Validated offline lobby/intermission saves: purchases, coins, skills, offered cards, mutations, RNG, timers. Interrupted combat restarts from prior boundary. Saves are version-matched practice data, never trusted by online combat.
- New illustrated setup/guide/shop/tree, 5 painted upgrade icons, locale persistence and RTL class menus. Earlier assistant browser review inspected actual purchases/leave/resume and all 15 phone class-menu layouts.
- New wall rectangles, role-normalized build rating and concrete contract recommendations, illustrated voting cards and multilingual self-hosted fonts. Desktop assistant review now exists under reviews/ui; shaped-script and small-screen review remain open.
- Constable phase/Brutal source changes pass tests. The attack animation is triggered once per new warning rather than repeatedly throughout the warning.
- New pooled Phaser projectile images replace three Graphics circles per projectile. All hostile hazards remain visible. A protocol-3 pooled sample measured 110.28 FPS with exactly 4,000 rendered hostiles and fifty active players; current protocol-4 repeat is tracked separately.

Eight usable supplies, queue/cold-start UX, signed boundaries, transactional SQL ledger, authenticated bounded HTTP transport and a lease/claim journal are implemented. Real separate-process local HTTP/SQLite restart and owner-race tests pass. The journal now has a tested server-only GraveRoom integration; it is disabled in the normal executable and is not deployed recovery. Missing systems include full profiles/mastery/unlocks, live authenticated recovery, durable rankings, full content, final art/animations, all-device/input/accessibility polish, hosting verification and Windows/LAN packaging.

## 5. Current continuation actions

Access to this exact folder and GitHub is verified. Supported IAB worked earlier, but latest inventory/direct-attach calls report disabled in Work settings despite the user seeing enabled settings and a working localhost preview. Cause is unconfirmed. Follow IMPLEMENTATION_STATE.md, RECOVERY_IMPLEMENTATION.md, HOSTING_CAPACITY.md and FIRST_PLAYABLE.md for current gate evidence. Preserve the original working tree and historical inventories.

## 6. Browser state and evidence limits

Supported IAB controlled localhost:5173 earlier. The latest control retry fails before tab listing or attaching to the localhost tab the user opened, even after a supported session reset. Preview opening and agent control are distinct; do not blame the project or assume the user disabled settings. A hidden-chat opening request can return queued and the page can render about one FPS despite document.hidden=false. User must have this chat and its game preview visible for an ordinary foreground measurement; do not stimulate every frame with tools or count a background sample as foreground. No broader search permission is needed. Do not use raw CDP/browser packages to bypass supported controls. An early requested 390×844 override remained 1280×1228 and is not phone evidence. A later English public home observation measured an actual 390×844 viewport with scrollWidth 390; it remains emulation, not a physical phone, and complete latest-font/RTL review is open.

## 7. Performance evidence

The corrected pooled protocol-3 49+1 run held 4,000 hostiles and fifty active participants: server stress p99 13.836 ms/max 18.845 ms over 90.051 seconds; bounded foreground browser 110.28 FPS/p99 frame 15.2 ms with all intervals at 4,000 hostiles. See FIRST_PLAYABLE.md and original JSONs for fixtures/memory/traffic/viewport limits. Current protocol-4 post-optimization server repeat passes p99 at 19.772 ms (max 37.428 ms), with fifty active players/4,000 hostiles throughout 90.004 seconds. Its source/assets/fixture hashes are recorded. Preview throttling leaves current foreground FPS open. The earlier protocol-4 42.515 ms failure is retained. Physical phone, WAN/free-host, sixty-minute endurance and human gates remain open. Retain invalid/downed/mixed/throttled attempts instead of laundering them into a pass.

## 8. Art, animation and audio handoff

- `assets/proofs/survivors-v3.png`: current seven-survivor finish reference. `assets/proofs/bosses-clean-detail-v2.png`: cleaner six-boss proof. Original eleven-boss sheet is an earlier proof, not the entire 60-boss library.
- Current Soldier runtime: `assets/proofs/animation/soldier-run-atlas.png`, 8 frames, 256 px cells, 10 FPS, side direction with horizontal flip, pivot (0.5,0.86).
- Current Constable runtime: `assets/proofs/animation/boss-attack-atlas.png`, 8 ×512 px, 10 FPS, pivot (0.5,0.84). Needs distinct readable state animations, further phase/cast visual review and Brutal presentation.
- Medic runtime now uses four-frame north/south walk strips and static east/west normalized seed views. Soldier retains its eight-frame side atlas plus the new north/south strips. See docs/direction-walk-requests.json and assets/proofs/directions/walk-normalization.json; full action contracts remain open.
- Five painted item icons: damage, fire-rate, magazine, reload, health. Native PNGs under `assets/proofs/items/`; 256 px runtime alpha-preserving derivatives under `assets/icons/upgrades/`; full prompts/controls/hashes under `docs/ui-item-art-provenance.json`. Menu screenshot exists. Weapons/skills/abilities are still provisional line art. Mutation cards currently reuse these five representative illustrations by stat category, not 24 unique finished mutation icons.
- New direction proofs preserved under `assets/proofs/directions/`: Soldier reference, rejected first Medic attempt, corrected Medic reference, 8 normalized seeds, normalization receipt. `docs/direction-art-provenance.json` stores exact prompts, source relationships and review limitations. Tool did not report backend/model or expose quality selection; do not claim Sunburst was verified.
- `tools/prepare-direction-seeds.py` is technical cell extraction, shared per-class scale and bottom-center alignment only. It creates edit canvases under ignored `tmp/directions/`. Its original absolute generated-image path remains machine-specific; use preserved reference files if portability is needed. **No walking-strip generation jobs are pending.** The last corrected Medic request completed and its native was copied.
- The original reference sheets remain provisional historical inputs. Corrected whole-strip generations now produce four limited north/south runtime walks; exact accepted/rejected requests are in direction-walk-requests.json. Light/dark alpha and engine review exist. Full action libraries remain unfinished.
- Apply the sprite-pipeline skill: approved seed → transparent edit canvas helper → whole strip in one edit per direction/action → shared normalization/anchor → previews and in-engine motion/gameplay-size review. Do not generate individual frames independently or silently recolor/paint with Python. Preserve natives, exact prompts, rejected versions and transparent alpha.
- User preference: strongest exposed OpenAI image route, prefer GPT Image 2.5 Sunburst at max quality only if actual tool controls verify selection. Built-in tool here exposes prompt/reference/transparency but no model/quality selector. Record the truth.
- Audio sources and score are under `assets/audio` and tools; consult `docs/AUDIO_BIBLE.md`, `reviews/audio-proof-review.json` and `assets/audio/preview.html`. Original deterministic synthesis uses no external samples. Two loops + 8 stems +25 SFX have objective seam/headroom/hash/regeneration evidence. Runtime AudioBus caps voices and throttles repeats; final 50-player mix and actual human listening are still required.

## 9. File map for the current development work

| Area | Files and intent |
| --- | --- |
| Content source | `tools/build-stage1.mjs`, `content/source/boss-expansion.mjs`, `skill-expansion.mjs`, `boss-variants.mjs`, `arena-geometry.mjs`; generated `content/catalog.json` and splits; `content/revision.json` |
| Simulation | `src/shared/game.ts` owns rules/state/economy; `geometry.ts` swept tests/spatial grid; `random.ts` deterministic RNG |
| Protocol/view | `src/shared/protocol.ts` v4, `view.ts`, `network-state.ts`; changing incompatible state requires version discipline |
| Rating | `src/shared/build-rating.ts` normalizes role baseline, weights .5 offense/.25 survival/.25 support, grades 1.1^index, concrete equivalent squads; excludes transient buffs/mutations |
| Server | `src/server/index.ts`, `GraveRoom.ts`, `capacity.ts`; 30 Hz authority, 20 Hz schema, origin checks, reservations, private/public discovery, chunked projectile bootstrap, metrics |
| Client/session | `src/client/session.ts`, `offline.worker.ts`, `prediction.ts`, `controls.ts`, `storage.ts`; reconnect lifecycle and boundary saves |
| Renderer | `src/client/scene.ts` thin Phaser view, pooled projectile images; north/south four-frame walks integrated; `frame-meter.ts` raw wall-clock measurements |
| Main/menus | `src/client/main.ts`; `ui/setup.ts`, `tutorial.ts`, `shop.ts`, `votes.ts`, `icons.ts`; `ui/polish.css`, `ui/votes.css`, `fonts.css`; `assets.ts` asset URLs |
| Languages | `locales/build-catalogs.mjs`, `locales/source/`, `src/client/i18n.ts`, `content-text.ts`; `tools/verify-locales.mjs --self-test` |
| New tests | `tests/boss-variants.test.ts` (3), `rating-and-walls.test.ts` (2), `skills.test.ts`, `checkpoint.test.ts`; existing core/client/network/reconnect tests |
| Gates | `tools/verify.mjs`, `verify-stage1.mjs`, `verify-gauntlets.mjs`, `balance-stage1.mjs`, `measure-first-loop.ts`, `rendered-feasibility.ts` |
| Evidence | `reviews/runtime-verification.json`, Stage1/balance/gauntlet/localization/audio/art reviews, `reviews/performance/`, `reviews/ui/` |
| GitHub | `docs/github/first-loop-pr.json`, `project-items.json`, `main-ruleset.json`, `tools/github-admin.mjs`; canonical Wiki under `docs/wiki/` |

Gatehouse added collider rectangles include upper masonry/side strips/bottom corners, with an open bottom gate corridor. Both prediction and server use them. Tests verify five long sweep directions and all 50 initial spawns. New art review must ensure painted boundaries and collider shapes agree; narrow safe spaces must still feel fair.

Build-rating note: personal grade is in HUD and team average is in vote UI. Grade describes purchased build power, not human skill or a player level. Test baseline for all seven authored classes is D− and equivalent examples meet the same rating threshold. Check actual player comprehension and display whether a recommendation is above current capacity. Do not invent player XP levels to explain it.

Boss implementation notes to audit next: fourth-phase `comboOffsetSeconds` and `signatureRepeatOffsetSeconds` are authored metadata; runtime currently schedules attacks with fixed staggered offsets, and other bosses' signatures are not executed. Zone radius/duration are still effectively Constable constants. Deadline/rating calculations need actual attack-window integration. Endless health/damage/speed growth now reads authored rule values .15/.12/.025 per ten encounters, speed growth cap .5. Recheck these through sustained gameplay.

The analytical 16,716-row model passes for legal **normal** campaign/Raid foundation-build witnesses with .65 aiming/movement uptime and declared damage windows. It excludes specialization alternatives, abilities, ultimates, mutation benefits and Accord benefits. **Brutal four-phase deadline feasibility is not included**, despite variants being structurally validated. Add that model and real playtesting; do not call every Brutal encounter balanced because ×2/×1.5 unit checks pass.

## 10. Complete remaining work checklist

### First-loop gate before full asset production

- [ ] Current browser walkthrough: new voting/fonts, HUD build grades, meaningful recommendations, phase telegraphs/animations, wall collisions and small-screen overlays.
- [ ] Clean 49 bots + one rendered baseline/stress timing after projectile-image pooling; 4,000 actually rendered hostiles, traffic, memory and lifecycle exercises; document desktop reference environment/browser/GPU.
- [ ] Physical phone landscape combat and portrait menus at 30 FPS; actual touch/controller, aim assist/auto-fire and binding behavior. Desktop target 60 FPS.
- [x] Eight usable supplies, three slots, authoritative purchases/use and replication; keyboard medkit/barrier and pointer Adrenaline use observed in the browser. Final art and physical touch/gamepad review remain open.
- [ ] Signed authoritative online intermission checkpoints and restart behavior, not just local practice save. Coordinate with durable run lifecycle/leaderboard owner leases and ranked-to-practice downgrade on interrupted combat.
- [ ] Queue when measured instance capacity is exhausted; cold start/restart messages; measure actual free hosting limits and aggregate allowances before deployment/load tests.
- [ ] Late arrivals/reconnect/expiry/host departure/restart races and boss health fraction behavior at boundaries. Add meaningful tests when implementing missing behavior.
- [x] Limited two-class north/south walks: four frames per direction, fixed class-shared scale/anchor and actual engine review. Full survivor idle/attack/hurt/dash/downed libraries remain open.

### Full content and progression

- [ ] Implement Heavy, Tank, Mage, Engineer and Assassin kits, ultimates, skills, friendly pass-through structures, shops and class-specific mechanics. All seven unlock immediately.
- [ ] All 378 nodes must have real effects and prerequisites; grade/role-aware ratings, one capstone, max reductions and normalized 27-SP budgets. Validate complementary-path choices and avoid meaningless duplicate nodes.
- [ ] All 28 weapons, 24 mutations/exclusions/limits, 8 supplies, 5 upgrades and economy routes; atomic currency accounting and power reset.
- [ ] Actual 5/10/16 campaign routes and three-boss Raid, distinct layouts and selected concealed contracts; integrate no-repeat gauntlet selection and full Endless pools/exclusives.
- [ ] All 60 boss signatures and counterplay, attacks with actual animation states, normal phases, four-phase Brutal variants, completed-appearance eligibility for repeats and real uptime/deadline tuning.
- [ ] Six arena kits with appropriate collision/occlusion and mobile readability. Avoid the current static painted scene hiding obstacles or placing objectives in walls.
- [ ] Six difficulty presets, independent tuning, Hard completion unlock of Insane/Hellish, mastery/cosmetics/lore/settings/profile schema/import/export and migration.
- [ ] Optional Uncounted criteria, banked campaign win and separate secret badge/extension.

### UI, languages, assets and audio

- [ ] Replace remaining provisional weapon/skill/ability/supply/mutation line symbols with original readable item artwork. Five shop upgrades are illustrated; mutation category reuse is temporary.
- [ ] Finish complete survivor/boss animation contracts: dimensions, transparent alpha, pivots, attachments, true facings, idle/run/fire/ability/dodge/hurt/downed/death as needed. Inspect whole cycles in motion at gameplay scale and regenerate inconsistent art.
- [ ] Fully functional tutorial/guide/help and replay; assess interactive combat lesson, onboarding pace and Skip behavior. Preserve separate illustrated setup steps.
- [ ] Final voting layout, unique card art, restrained typography, legible chosen/count states, keyboard focus, countdowns and disconnected-voter updates.
- [ ] Remappable controls, aim assist/auto-fire, text scale, reduced motion/effects, high contrast/color-independent cues, volume controls and persistent settings. Preserve all hostile hazards when reducing friendly cosmetics.
- [ ] Fonts were installed and build successfully; review shaped scripts/glyph coverage/all scene overlays and 15-locale text expansion. `fonts.css` emits both WOFF and WOFF2 for many unicode chunks; assess bundle/download cost (current full dist ~53.3 MB) without sacrificing offline coverage.
- [ ] RTL and bidirectional nickname behavior, Intl formatting/plurals, fallback behavior and versioned catalogs; native review independently for each locale including both Chinese variants.
- [ ] Final music/ambience/adaptive phase/Brutal cues, weapon/ability/impact/UI sounds; bounded online mix and human listening. Preserve score, stems, synth source and provenance.
- [x] Manifest records bundled fonts and four limited north/south runtime strips without marking complete production contracts finished. Keep future requirements explicit.

### Rankings, service, recovery and hosting

- [ ] Durable D1-backed team rankings with anonymous reads and authenticated official-server writes; recompute exact score, stable shared ranks, board filters, history/rosters and contributions.
- [ ] Implement the lifecycle/restore protocol from LEADERBOARDS.md: idempotent event IDs/payloads, HMAC over exact body bytes, nonce/time bounds, owner epochs/leases, atomic compare-and-set, stale/replayed/finalized-run rejection and bounded participant deltas.
- [ ] Server secrets only; no credentials in source/browser/Electron/checkpoints/public JSON. Store actual values through approved native secret configuration, not a committed .env.
- [ ] Offline/LAN/custom/unverified/practice labels; outage fallback, pending finalization retries and cache timestamps. Actual deployed write/read/restart/race evidence and separate private-room disclosure.
- [ ] Free Render realtime service and approved free static/client/service host. Inspect allowances, sleeping/restarts and quota exposure. The Render/client Practice playtest is deployed; D1 deployment remains open. Do not switch stack/provider silently if tools are unavailable; document a concrete compatible path.

### Stage 2.5 verification

- [ ] All **126** class × campaign-route × difficulty progressions (7×3×6), plus Raid and Endless scenarios.
- [ ] Mutations/combinations, skills/prerequisites/capstones, currency, cooldowns, timers, input rejection, duplicate commands/vote ties/disconnects/owner departures/restarts.
- [ ] 8-, 16- and 50-player active matches; 60-minute endurance with memory growth, tick distribution, encoded traffic and recovery.
- [ ] Actual humans assess feel, clarity, pacing, teamwork and difficulty. Separate assistants/synthetic evidence from humans. Native-language and physical-device reviews must be real.

### Stage 3 delivery and governance

- [ ] Electron portable Windows runtime, assets/fonts/audio bundled; fresh extraction, offline with no Node/internet, occupied-port handling, online join and explicit opt-in private LAN hosting.
- [ ] Anonymous public browser URL and deployed version identity match the validated source/assets. Check phone/desktop, networking and cold starts on the actual service.
- [ ] Commit/push current work; update PR 14 title/body around actual final scope and evidence, inspect verify on the correct head. `docs/github/first-loop-pr.json` is stale and not automatically applied to an existing PR by its helper.
- [ ] Canonical Wiki update in protected repo then publish corresponding native pages. Cover play/download/host/classes/progression/bosses/troubleshooting/architecture/accessibility/credits/releases. Do not treat source-only Wiki edits as published.
- [ ] Project 3: verify every card's stage/subsystem/priority/status/evidence, not merely issue existence. Aggregate GraphQL reads can lag after writes; query persisted item IDs before creating duplicates.
- [ ] Keep main protections: PR, passing verify, up-to-date branch, resolved conversations, linear history, blocked force-push/deletion, no bypass actors, zero mandatory reviewer approvals for sole-maintainer usability.
- [ ] Matching source, binaries, release archives, package hashes, licenses/notices, downloadable play copy and a fresh download/extraction/startup audit. No final Windows build currently exists.
- [ ] Updated illustrated Markdown/PDF/design packet if needed; preserve old sealed versions and issue a new version with independent artifact checks.
- [ ] Contest title, cover, description, playable URL, controls, credits and measured evidence. Record **actual Handshake submission separately**, with no invented submission/eligibility claim.

## Latest publication and access continuation

The user specifically approved public anonymous access to https://grave-accord-playtest.ivoryflame12.chatgpt.site/ after an initial automatic-review rejection. That change succeeded (access revision 2); approval is resolved. Do not ask again or return this Site to private. Deployed source was 33b36bc022452e89be4dbdadd73040e28614aba6, with native deployment appgdep_6adbaf5aab8c81919c915781d3554967 and version appgprj_6adba24c54c4819197768bbc03f2997e~appgver_f8f10d69d6f88191989b55df7fd23fe5. Public assistant browser gameplay exercised a real purchase/start/fire/Q/E/damage/defeat and returned to menu. It is assistant evidence, not a human session. Linked client JS/CSS/worker/sprites matched local build hashes; provider-added script changes delivered HTML bytes. The later HTTPS check returned 200 for Site and health, zero rooms/slots and the matching source/protocol/content.

Current Sites connector get_site reports NOT_FOUND for the saved project ID; this does not prove the public Site was removed. Preserve .openai/hosting.json, existing publication and archive. Do not create another Site or bypass access with expired credentials. Current browser control is also unavailable as described above. Local files and GitHub still work. Render connector can read the exact existing service, but a mutating MCP deploy requires the user-confirmed workspace context. Continue independent code work and explain any concrete remaining connection requirement.

Full verification now passes 68 tests. HTTP authentication follows documented seconds/body-digest/base64url signing, key/server allowlists, ten-minute nonces and 64-KiB limits. The server journal retries identical event IDs, checks acknowledgments, renews leases and claims recovery; tests stop/restart a separate loopback process with persisted SQLite. Its clock and encounter victory are synthetic. It is not yet called by GraveRoom. Live D1, player identity/new-transport binding, historical roster, bounded fifty-player transfer and rankings remain required. See RECOVERY_IMPLEMENTATION.md. Existing v0.2 sealed outputs are unchanged.

## 11. Historical sealed delivery and GitHub state

Historical Stage 1 **v0.2.0** was completed and independently verified before runtime coding. Do not overwrite, relabel, or reseal it with newer source and the old digest.

- PDF: `output/stage1/Grave-Accord-Production-Bible-v0.2.0.pdf`, 72 pages, 34,198,885 bytes; SHA256 `af14be6ebe23520cc05aa0c2f9ce91f581fdc645f2324732c8102231393ddccf`.
- ZIP: `output/stage1/Grave-Accord-Stage1-v0.2.0.zip`, 94,371,321 bytes; SHA256 `0e603a81c377ee75d653cfde23c9999502e52c03936a223c130249cde7d761d9`.
- 208 archive members/206 payload files matched source, secure fresh extraction and native Windows normal copy. `reviews/stage1-delivery-review.json` is historical evidence.
- Stage 1 PR 13 merged as `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`; prerelease `v0.2.0-stage1` has four matching assets with size/digest evidence. It is a design-packet release, not playable binaries. Earlier v0.1 artifacts remain historical.
- Main ruleset ID `25692180` was active with all requested protection and no bypass actors. Native Wiki 15 pages last published commit `ea6ef3e`. Live changes have not been rechecked in this handoff turn.
- Project: https://github.com/users/ProgrammingWithYagle/projects/3 . Required fields/auto-add and 12 issues exist; per-card field/evidence verification remains pending. User signed into GitHub; API credential lacked Project scope.
- GitHub connector mutations previously returned 403. `tools/github-admin.mjs` is the repository-scoped configured-credential fallback; never print tokens or broaden credential scope. Its `pr` command returns an existing PR without updating its title/body. Add a narrowly scoped update action or use a working connector if needed.
- Normal Git writes/network may need reviewed escalation because .git is read-only in the default sandbox. One prior turn's automatic approval review stopped at a usage limit; that was not a source error and must never be bypassed by changing tools. Current authorized filesystem edits and local-network verification succeeded.

## 12. Commands, environment and review shortcuts

PowerShell; Node v24.19.0 is on PATH. pnpm is not on the normal PATH in every session:

```powershell
& 'C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' install --frozen-lockfile
node tools/verify.mjs
node tools/verify-locales.mjs --self-test
node tools/balance-stage1.mjs
node tools/verify-gauntlets.mjs
node node_modules/vite/bin/vite.js
node --import tsx src/server/index.ts
```

Run client and server in separate retained sessions. Vite binds 127.0.0.1:5173 with strictPort; normal game service defaults to 127.0.0.1:2567. Server health `/api/health` includes protocol/content/practice/capacity. Set `VITE_GAME_SERVER` for client endpoint; `CLIENT_ORIGINS` for server browser origins. Explicit LAN action is still unimplemented, so do not silently bind publicly. Python path: `C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`; use `-X utf8`.

Stack pins: Phaser 4.2.1; Colyseus core 0.18.21/schema 5.0.42/sdk 0.18.6/ws-transport 0.18.4; Vite 8.3.5; TS 7.0.2; tsx 4.23.15; pnpm 11.25.0. Lockfile exists. Avoid the umbrella Colyseus package's unnecessary Git dependency. Native msgpackr-extract remains disabled. Runtime notices inventory currently covers 31 packages including nine Fontsource packages.

Content regeneration sequence, only when source changes justify it: `node tools/build-stage1.mjs`, `node tools/build-contracts.mjs`, `node locales/build-catalogs.mjs`, `node tools/build-asset-manifest.mjs`, then balance/gauntlet/source/runtime checks. **build-stage1 rewrites generated Wiki pages and parts of the bible with design-status wording**, so reconcile actual-state text after regeneration. Do not overwrite sealed PDFs/packets. Formatter writes changed files only.

Useful browser UI IDs:

- Home `#new-run`, `#resume-boundary`, `#join`, `#tutorial`, `#guide`, `#settings`, `#language`.
- Setup `[data-class="medic"]`, `[data-mode="endless"]`, `[data-map="gatehouse"]`, `[data-difficulty="baby"]`, `#setup-next`, `#name`, `[data-visibility="offline"|"public"|"private"]`, `#launch`.
- Guide `#tutorial-skip`, `#tutorial-next`; lobby `#start`, `#return-menu`; shop `[data-shop-tab="gear"|"tree"]`, `[data-branch]`, `[data-inspect="damage"]`, `#buy-selected`.
- Pause `#pause-button`, `#resume`, `#leave`; join `#refresh`, `#rooms button`, `#join-class`.
- F8 DEV diagnostics exposes `#dev-metrics-data`, `#dev-metrics-reset`; raw intervals use performance.now rather than smoothed Phaser delta.

Existing screenshots: `reviews/ui/painted-upgrades-desktop.png`, `skill-tree-desktop.png`, `skill-tree-phone.png`, `class-phone.png`, `class-arabic-phone.png`, `rendered-50-after-stress.png`. They predate latest voting/font/direction changes. Save new screenshots with settled UI state, and render them in the user-facing response when presenting a visual update.

At this handoff, old tool sessions (Vite 60381, test harness 37843, ordinary server 50190, art worksheet 67960) are **historical identifiers only**. Their current liveness is unverified. Port enumeration in the restricted environment returned no entries; do not infer that all services stopped. Check the actual next-session state and startup output. No new image-generation or server-measurement job remains pending in this turn.

## 13. Documentation follow-ups

This handoff and IMPLEMENTATION_STATE.md take precedence over stale implementation claims in older documents. Keep updating the following as their evidence changes:

- README and FIRST_PLAYABLE: counts, current tests, source-only status and latest browser/performance limitations.
- ACCEPTANCE: replace old Pending runtime with the exact partial implementation and keep release gates open.
- CHANGELOG and canonical Wiki Changelog: record user-visible implemented changes, never prospective features as shipped.
- ASSET_MANIFEST and THIRD_PARTY_NOTICES: fonts are now installed/built and licenses preserved; remaining production status needs reconciliation.
- LOCALIZATION_IMPLEMENTATION: catalog-only history should be distinguished from current partial runtime integration/layout review.
- PR description and Project issue evidence: older draft text describes 20/26 tests and a now-outdated browser state. Publish only after actual updates.
- `reviews/runtime-verification.json` limitations still use a broad “browser review pending” phrase; historical UI reviews exist, latest visual changes remain unreviewed. This is a wording cleanup, not evidence to fabricate.

The human explicitly wants context and all unfinished work preserved for a new chat. Do not spend the new chat replanning the full project, requesting implementation authorization again, or treating a chat change as losing the saved source. Resume the concrete gate work above.

## Gameplay service update — 2026-10-23

The user confirmed Render “My Workspace” (tea-d574jver433s73eg4mhg) for the existing service. This workspace context remains authorized for continuing the same approved service work; pass it explicitly rather than asking again. Deployment dep-dbdrquom7kps73bg2l7g is live at source dfade8834e81cfd324eeb124d22ec3b7bd68c245. Both GitHub verify checks pass. Render remains Free/Ohio/auto-deploy Off/eight slots/one room. Actual hosted SDK verification passed public eight-slot discovery and private-code delivery/two-person join with private discovery exclusion. All test slots/rooms were released. App error logs for the checked deployment window were empty. See reviews/hosting/render-update-dfade88.json and hosted-ready-handshake-dfade88.json.

The frontend still serves source 33b36bc. The recovery components are not wired into GraveRoom, so the update does not enable live recovery/rankings. The current Sites connector cannot access the saved Site; the user is checking the existing Site in the signed-in Sites list. Do not describe reconnecting as a confirmed fix or invent a reconnect button. Browser control and Sites access remain concrete blockers for the corresponding first-loop gates.

## Verified Wiki publication and account finding

The user confirmed that the existing public Site belongs to another ChatGPT account. This explains the current account's Sites NOT_FOUND result. Do not repeat a generic reconnect request, invent an account-switch button inside Sites, or create a replacement Site. Leave the existing Site settings/audience unchanged; continuing publication requires the owning account or legitimate editor access. This fact alone does not establish the cause of the separate local-browser control failure.

The user can open localhost:5173 and explicitly selected @Browser, but direct supported-tool attachment still reports Local browser use is disabled in Work settings. A supported session reset did not resolve it. Website exceptions and local-browser enablement are distinct. The user has instructions to check the Browser plugin on the account running this chat and an exception for localhost only. No broader search/CDP permissions were requested. Specific browser-feature flags were not found in the checked user config/requirements files; no settings were edited.

The native GitHub Wiki is now published at 5425a8d80015e125a7d56c659a06dc1a8529a5c8, from canonical source 7b8c32b8ea0e151e8623237f60df665a593fd9ff. All fifteen committed Markdown blobs match, and anonymous home/getting-started HTTP pages return 200 with the playtest link. Evidence: reviews/wiki-runtime-publication.json. These are Git/HTTP checks, not rendered Wiki or native-language approval. The existing .wiki-checkout was reused and its original clean/remote state was checked; no new clone/worktree was created.

Latest full runtime verification is 68 tests, strict TypeScript, authored-content/15-locale checks and production build. Runtime source digest is recorded in reviews/runtime-verification.json. Later changes concern documentation/evidence and the manual Wiki verifier. Gameplay deployment remains dfade8834e81cfd324eeb124d22ec3b7bd68c245; frontend remains 33b36bc. Read current Git HEAD/status independently. PR 14 remains draft; main is unchanged. Continue the first-loop gates rather than claiming the game complete.

## Latest room checkpoint and art-production direction

Full verification now passes 74 automated tests, strict TypeScript, authored-content/15-locale validation and a production build. The exact source digest is in reviews/runtime-verification.json. GraveRoom now calls the journal through a server-only factory: safe phase clocks/mutations pause during checkpoint acknowledgements, combat-start is durable before simulation, leases refresh without pausing active combat, and failures latch unavailable while Practice may continue. Normal local/public server execution has no writer configured; participant restoration, individually durable command receipts, bounded fifty-player transfer and deployed D1/rankings remain unfinished. See RECOVERY_IMPLEMENTATION.md and reviews/recovery/room-journal-local.json. These facts supersede earlier statements that GraveRoom does not call the journal.

The user explicitly asked to stop investigating browser permissions and continue character/boss art and concepts now. This later instruction authorizes art production before the remaining first-loop browser gate; it does not turn that gate into a pass. Do not keep retrying browser control or ask for broader permissions. Another account may playtest the existing public URL; no human session findings have been received. Maintain separate art/concept, runtime and human evidence. The current public frontend remains 33b36bc and gameplay service remains dfade88. Preserve their existing Site/service identities.

## Art production completed this round

Five four-direction survivor references and three new individual boss pose studies are saved: 20 views/nine poses, selected from seventeen preserved generated natives. Heavy/Tank/Mage/Engineer/Assassin and Lantern Warden/Ratcatcher/Quarantine Clerk have assistant native and 1x/2x static readability review on quiet ground and an explicitly illustrative hazard overlay. Exact prompts, generated originals, revision decisions, workspace copies and hashes are recorded. These are static references, not completed animation, implemented gameplay, browser/device evidence or human approval. See [ART_PRODUCTION_PROGRESS.md](ART_PRODUCTION_PROGRESS.md) and reviews/art-production-2026-10-23/inventory.json.

The user prioritized this work and asked to stop browser troubleshooting. Continue art/animation and content work in the same folder; keep unverified first-loop/device/recovery gates open. No new playable class or boss is claimed from these sheets. The runtime checkpoint f194746 passed both GitHub verify checks and local 74-test verification; newer art-only changes do not alter runtime source.

The art/source checkpoint is 48a83b1d0b73d3cab0dabcd4e40ce4f9a0416a00; its GitHub PR Verify run passed. Both checks passed on the preceding runtime checkpoint f194746. Native Wiki commit 73cde8de2d9cb0f87e2ad632ba29b807093b52cc matches all fifteen canonical pages at art/source commit 48a83b1; public home/controls links returned 200. See reviews/recovery/github-verify-room-and-art.json and reviews/wiki-runtime-publication.json. PR 14 stays draft, with main unchanged.
