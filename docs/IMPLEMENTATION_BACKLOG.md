# Implementation backlog and contest acceptance map

Current source: build 2026.10.25-soldier-medic-actions, protocol 13. All sixty authored boss identities execute across five modes, seven classes, 378 skills, twenty-eight weapons and six distinct map footprints. Every boss has an individual original theme; production motion totals 1,367 selected frames across survivors, bosses, parts and minions. The in-game journal and Wiki have concrete synchronized updates. See [Endless and Uncounted runtime](ENDLESS_AND_UNCOUNTED_RUNTIME.md), [Raid](GRAND_RAID_RUNTIME.md) and [Pilgrimage](PILGRIMAGE_RUNTIME.md).

ProfileV1 now stores validated import/export, mastery, rescues, lore discoveries, cosmetic insignia, preferences, remapping and full-Hard difficulty unlocks. See [ProfileV1](PROFILE_V1.md).

The complete current pipeline passes 304 tests, authored-content/fifteen-locale checks, TypeScript and production build. Exact evidence is in reviews/runtime-verification.json. Native/audio audits and prior rendered samples are separate. Browser control was disabled in Work settings for the sixty-identity stage; no new rendered acceptance is claimed.

Major remaining work includes boss-history translation; full directional/action animation; final encounter deadline/uptime and balance measurements; verified deployed rankings/recovery; active 8/16/50-player and endurance acceptance; final Windows artifact/release acceptance and the coordinated browser release. Physical-device, native-speaker and human review require actual evidence. The public Site remains its earlier protocol-4 build; protected main remains a separate release boundary.

The latest [balance/collision correction and throughput evidence](BALANCE_AND_COLLISION_RUNTIME.md) records exact health math, 210 progression combinations, same-tick destructible buildings and longer localhost probes. The completed one-hour local continuous-combat probe is documented separately below. Rendered/hosted/WAN capacity, full progression endurance and human balance remain open.

The [issued Windows development package](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) and opt-in LAN authority pass all six native fixtures across the original, fresh ZIP extraction and ordinary Windows copy. All 1,633 members match exactly; physical second-machine LAN, manual rendering/audio and signed/release acceptance remain distinct gates.

[Bounded recovery transport](BOUNDED_RECOVERY_TRANSPORT.md) preserves fifty developed builds and 2,400 purchase replies through the existing 64-KiB HTTP interface and an actual file-backed process replacement/owner race. This local evidence does not enable public recovery. Maximum-entropy state paging, participant credentials, historical departures and hosted integration remain open.

The [Tank action library](TANK_ACTION_MOTION.md) adds 88 independently drawn poses across twenty clips, with source/atlas reconstruction and actual firing/dodge state tests. Complete rendered acceptance and the other characters' full libraries remain open.

The [Engineer action library](ENGINEER_ACTION_MOTION.md) adds another twenty clips/88 poses and independent simultaneous-class presentation tests. Tank and Engineer each have all six directional action families drawn; rendered transition/human/device review and the other five survivor libraries remain open.

The [Mage action library](MAGE_ACTION_MOTION.md) adds twenty clips/88 poses, whole-figure extraction with independent pixel reconstruction and four-direction authority-fired cast checks. Three classes now have the six directional action families drawn; the remaining four classes, many boss action sets and rendered/device/human acceptance stay open.

The [Heavy and Assassin action libraries](HEAVY_AND_ASSASSIN_ACTION_MOTION.md) add forty clips/176 poses; five classes now have all six families drawn. Soldier/Medic action libraries, side runs and many boss action sets remain open.

The [one-hour fifty-client probe](ONE_HOUR_ENDURANCE.md) passes local continuous-combat p99 at 21.41 ms, with 112.11 ms worst and 236 over-budget ticks retained. It is frozen Engineer-era runtime evidence with zero rendered clients and fixture-only invulnerability, not the full mixed-progression, hosted or rendered capacity gate.

The [Soldier/Medic action and independent run libraries](SOLDIER_MEDIC_ACTION_MOTION.md) complete the basic six-family drawn set across seven survivors: 616 action poses and 204 run poses. Special-ability animation, many boss action sets and rendered/device/human acceptance remain open.

All implementation stages remain authorized. These rows are acceptance requirements, not completion claims. Historical checkpoint prose is preserved in [the archived backlog](history/IMPLEMENTATION_BACKLOG-before-60.md).

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

