# Implementation backlog and contest acceptance map

Current product source is **2026.10.30-welcome-finish / protocol 43**. The [current checkpoint](CHECKPOINT_2026_10_25.md), [single implementation ledger](development-work-ledger.json) and [derived progress](DEVELOPMENT_PROGRESS.md) distinguish implementation from human and release acceptance. Current-content polish for first-time players is the priority; substantial new content stays deferred.

There are66 playable identities:65 ordinary and1 secret. The original expansion target remains150 ordinary plus secrets, with85 ordinary identities remaining. Twelve of 60 original-boss quality passes are implemented;48 remain, with final whole-boss human acceptance open. Seven class revamps / 21 ability transformations,378 skills / 63 paths, 28 weapons, six maps, five modes and fifteen catalogs are implemented. The optional 54-skill map and five secondary topology revisions remain distinct from final visual/device/balance acceptance. [Future design ideas](FUTURE_DESIGN_IDEAS.md) records deferred bots/story, shield-cap branches and selective blocking.

## Current polish and evidence

The first-visit language chooser and stable automatic-name policy have limited positive human feedback at testing at 5252. Controls retain focus, cancel capture and present save outcomes. The follow-up removes an empty orange warning frame without removing actual language-loading/error messages. Current source verification and the matching previews/Windows package are recorded separately in the checkpoint; the preceding controls source passes 915 tests and both complete source/records CI jobs.

[Current larger-team progression checks](../reviews/multiplayer-progression-2026-10-30/verification-01.json) cover an 8-player campaign, private 16-player Raid and 50-player Endless sample, all seven classes, earned purchases, equal-count votes, active input, host changes/reconnect, shared results, historical roster pagination and restart persistence. They use protected QA players and accelerated clears/deadlines. One initial 50-client join timeout remains preserved; standalone 50 and exact 16-then-50 instrumented repeats pass with unchanged game code and timeouts. Its cause is unproven. This does not complete rendered, ordinary balance, long endurance or WAN/hosted capacity acceptance.

## Remaining work and release boundaries

Human first-visit/compact/enlarged-text/RTL/controller/device review; final encounter and class balance; complete action art; listening and native-language review remain. Real mixed progression over full campaign/endurance windows, 49 scripted plus one rendered capacity, physical second-computer LAN and WAN/hosted measurements remain. Durable authority-written server records are implemented; globally deployed shared rankings and restart recovery still require coordinated hosting work. The older one-hour continuous-combat50-client measurement has a separately frozen Engineer-era runtime and remains historical.

The published Site remains protocol 4 and the issued public Windows download protocol 13. Current local reviews, source, Wiki and draft PR updates do not replace those releases. Merging main, deployment/release replacement, paid provisioning and contest submission remain separate. Browser automation stays disabled. [Historical backlog and stage-local evidence](history/2026-10-30-backlog-before-multiplayer-review.md) preserves the former protocol 21 / 497-test snapshot unchanged.

## Original requested deliverables

The following inventory preserves the original identifiers and requested acceptance scope. Its stage-local status wording is historical; use the current ledger/checkpoint above for implementation and verification.

| ID | Stage | Subsystem | Priority | Deliverable and acceptance evidence | Rubric |
| --- | --- | --- | --- | --- | --- |
| S1-01 | Stage 1 | Design | P0 | Versioned complete catalog; unique IDs, units and no unresolved entries; content validator | Execution |
| S1-02 | Stage 1 | Balance | P0 | 378 skills, route-normalized budgets, bounded modifiers; analytical uptime report and CSV | Execution, value |
| S1-03 | Stage 1 | Art | P0 | Eight proof sets; original references, provenance, frame/pivot review and gameplay-size animation preview | Creativity, polish |
| S1-04 | Stage 1 | Audio | P0 | Two arranged original loops, editable stems, 25 SFX, PCM/seam/hash/summation report | Creativity, polish |
| S1-05 | Stage 1 | Localization | P0 | Fifteen complete catalogs, placeholder parity and explicit translation-review status | Value, polish |
| S1-06 | Stage 1 | Delivery | P0 | Illustrated PDF and Markdown, packet manifest, fresh extraction and ordinary-copy hashes | Execution, polish |
| S2-01 | Stage 2 | Simulation | P0 | Fixed 30 Hz deterministic shared simulation; swept collision, health, ammo, deadlines, seed replay | Execution |
| S2-02 | Stage 2 | Combat | P0 | Soldier/Medic, Q/E/ultimate/dodge, Constable and Gatehouse; readable hazards and accurate hitboxes | Execution, creativity |
| S2-03 | Stage 2 | Loop | P0 | Victory/rewards, 15 s mutation vote, 15 s concealed contract vote, 25 s shop and skill allocation, defeat/retry | Execution, value |
| S2-04 | Stage 2 | Cooperation | P0 | No collision/friendly fire; two-second revive, twenty-second downing, solo self-revive and Accord Break | Value, creativity |
| S2-05 | Stage 2 | Networking | P0 | Colyseus authority, movement prediction/reconciliation, public/private discovery and codes | Execution, value |
| S2-06 | Stage 2 | Scale gate | P0 | 49 active scripted clients plus one rendered client, 4,000 hostile bullets, combat/votes/shop/deaths/reconnect; p99 tick under 25 ms, memory and traffic | Execution, polish |
| S2-07 | Stage 2 | Capacity | P0 | Separate room/instance limits; measured free-host capacity, queue and cold-start messaging | Execution, value |
| S2-08 | Stage 2 | Art production | P1 | Full survivor and boss atlas contracts, six arena kits, icons and effects; retain accepted style and review in motion | Creativity, polish |
| S2-09 | Stage 2 | Classes | P0 | All seven kits and ultimates, compatible shops, full skill effects and capstone enforcement | Creativity, value |
| S2-10 | Stage 2 | Bosses | P0 | At least 150 ordinary identities plus secrets; current 65 ordinary plus The Uncounted, with unique signatures/art/music/counterplay, tier-appropriate phases, form differences, objective scaling and measured deadlines | Creativity, execution |
| S2-11 | Stage 2 | Routes | P0 | Five-, ten-, sixteen-fight routes, three-fight raid and uncapped endless with normalized budgets | Value, execution |
| S2-12 | Stage 2 | Difficulty | P0 | Six independently tuned settings and Hard completion unlocks | Value, polish |
| S2-13 | Stage 2 | Audio production | P1 | Authored soundtrack/ambient plan produced, adaptive cue scheduling and bounded 50-player mix | Creativity, polish |
| S2-14 | Stage 2 | UI/input | P0 | Keyboard/mouse, gamepad, landscape touch, responsive portrait menus, remapping and accessibility | Value, polish |
| S2-15 | Stage 2 | Localization runtime | P0 | Locale selection and persistence, Intl templates, RTL menus, bundled fonts, complete content coverage and layout tests | Value, polish |
| S2-16 | Stage 2 | Leaderboards | P0 | One shared team rank per run; timed score/endless ordering; durable D1, service authentication, idempotence and practice separation | Value, execution |
| S2-17 | Stage 2 | Recovery | P0 | 60 s reconnect, boundary joins, fraction-preserving scaling, signed checkpoints, registered restore claims and restart tests | Execution, polish |
| S2-18 | Stage 2 | Profile | P1 | Versioned import/export; mastery/cosmetics/lore/settings/unlocks; run power resets | Value |
| S25-01 | Stage 2.5 | Content verification | P0 | All 126 class x campaign x difficulty combinations complete automated smoke/progression checks | Execution, polish |
| S25-02 | Stage 2.5 | Validation | P0 | Legal mutation combinations, prerequisites, currency, cooldowns, deadlines and malicious/duplicate inputs | Execution, polish |
| S25-03 | Stage 2.5 | Multiplayer | P0 | 8/16/50 active players, public/private visibility, vote ties, disconnect, owner departure, restart races | Execution, polish |
| S25-04 | Stage 2.5 | Endurance | P0 | 60-minute active gameplay, memory growth, tick distribution and encoded network volume | Execution, polish |
| S25-05 | Stage 2.5 | Device performance | P0 | Document desktop and physical phone model/browser; 60/30 FPS and input/layout evidence | Polish, value |
| S25-06 | Stage 2.5 | Human review | P0 | Human session notes on feel, clarity, pacing, teamwork and difficulty; separate from scripted evidence | Polish, value |
| S25-07 | Stage 2.5 | Language review | P1 | Native-speaker review status per locale; never present AI coverage as native approval | Polish, value |
| S3-01 | Stage 3 | Windows | P0 | Bundled Electron portable build, fresh extraction, offline no Node/internet, online join, LAN opt-in and occupied-port handling | Execution, value |
| S3-02 | Stage 3 | Browser | P0 | Anonymous public URL, phone/desktop input, deployed content/version identity and public online connection | Execution, value |
| S3-03 | Stage 3 | GitHub | P0 | Matching source and release assets, changelog, MIT/third-party notices, Wiki pages and one Project | Execution, polish |
| S3-04 | Stage 3 | Main protection | P0 | Passing verify registered, PR/up-to-date/resolved/linear/deletion/force-push protection, zero approvals and no bypass actors | Execution |
| S3-05 | Stage 3 | Release audit | P0 | SHA-256 manifest, fresh archive extraction, normal Windows copy, release/download/Wiki links | Execution, polish |
| S3-06 | Stage 3 | Contest | P0 | Title/cover/description/controls/credits/URL/evidence packet; actual Handshake submission recorded separately | All four |
