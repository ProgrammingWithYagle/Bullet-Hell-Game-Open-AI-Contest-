# Implementation backlog and contest acceptance map

The approved scope includes genuine endless play, fifteen locales, changelogs, team leaderboards, original music/SFX, seven upgradeable ultimates, sixty distinct bosses and the clean-detail art standard. Items become complete only with the listed evidence. All stages are authorized; later gates do not require an additional request for already approved work.

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
| S2-10 | Stage 2 | Bosses | P0 | 60 distinct identities: 50 in disjoint timed-route pools, 9 Endless exclusives and The Uncounted; unique signatures, counterplay, three phases, objective scaling and measured deadlines | Creativity, execution |
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

The four rubric categories are equally important. This matrix is a production guide, not an assertion of a judge's score. Physical-device, human playtesting and native-speaker checks require actual people or devices; simulated evidence is labeled as simulated.

## Current first-loop evidence

74 automated tests, strict TypeScript and production build pass. Eight supplies, three slots, bounded queue/cold-start UX and limited two-class north/south walks are implemented. Desktop assistant review exists. The current local 49+1 server stress passes p99 at 19.772 ms with fifty active players/4,000 hostiles; current foreground FPS is unestablished because the preview was throttled. Signed-boundary/HTTP/SQL/lease journal components pass local tests, including separate-process restart. The new server-only room integration is disabled in normal execution; public rooms and hosted D1 do not use it. An anonymous eight-slot Practice browser playtest is published, with bounded eight-SDK-client hosting evidence; full capacity, physical devices, human review and full-content/release gates remain open. Current supported browser and saved-Site connector access are unavailable despite a working public URL. No row above becomes complete merely from these partial results.

## Art production completed this round

Five four-direction survivor references and three new individual boss pose studies are saved: 20 views/nine poses, selected from seventeen preserved generated natives. Heavy/Tank/Mage/Engineer/Assassin and Lantern Warden/Ratcatcher/Quarantine Clerk have assistant native and 1x/2x static readability review on quiet ground and an explicitly illustrative hazard overlay. Exact prompts, generated originals, revision decisions, workspace copies and hashes are recorded. These are static references, not completed animation, implemented gameplay, browser/device evidence or human approval. See [ART_PRODUCTION_PROGRESS.md](ART_PRODUCTION_PROGRESS.md) and reviews/art-production-2026-10-23/inventory.json.

The user prioritized this work and asked to stop browser troubleshooting. Continue art/animation and content work in the same folder; keep unverified first-loop/device/recovery gates open. No new playable class or boss is claimed from these sheets. The runtime checkpoint f194746 passed both GitHub verify checks and local 74-test verification; newer art-only changes do not alter runtime source.
