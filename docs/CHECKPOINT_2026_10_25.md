# Grave Accord continuation checkpoint

Updated October 26, 2026. This is unfinished feature-branch development. Read this page, [development progress](DEVELOPMENT_PROGRESS.md) and [implementation state](IMPLEMENTATION_STATE.md) first. The user's full continuation goal remains active.

## Existing workspace

Use `C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)` and `feat/first-playable-loop` in `ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-`. Inspect actual HEAD/status/origin and draft PR #14 before editing. Preserve all working files/history. No new clone, worktree, delegation, branch switch to main, paid provisioning, replacement Site, mismatched backend deployment, main merge or contest submission is authorized.

Current build **2026.10.26-warden-patrol**, protocol **19**. Main remains protected and separate at `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`; PR #14 stays open/draft. Use the GitHub connector for supported operations; the scoped `tools/github-admin.mjs` fallback keeps credentials in process memory.

## Actual implemented state

- **63 playable boss identities: 62 ordinary plus one secret**, seven classes, 378 skills / 63 paths, 28 weapons, six maps and five modes. Sixty-three individual boss themes plus City Wake; 1,506 selected runtime motion poses.
- Early Watch (Ashen Usher 1--, Brass Toad 1-, Ragpicker's Kite 1) is integrated: 36 selected poses, distinct shared-authority phases/movement/pressure, warned counterplay, extra Brutal mechanics, original music and fifteen-locale help. The older art-only concepts/requests are historical, immutable records. See [implementation](EARLY_WATCH_RUNTIME.md).
- [Twenty-one class transformations](CLASS_TALENTS.md), three per class, now change existing Q/E/ultimate behaviors through utility-path depth-three purchases. All node IDs, costs, prerequisites, numeric bonuses and one-capstone limit remain. Seven implementation passes complete, zero human acceptances. Both shop views have fifteen-locale behavioral help; shared simulation owns delayed effects, moving fields, finite walls/turrets/shields and a real projectile-damageable decoy.
- The [optional all-54-skill map](OPTIONAL_SKILL_MAP.md) is implemented with default-off setting, bounded zoom, scrolling and keyboard navigation. Five secondary-map topology revisions and six ground deliveries are installed. Rendered/human/device review stays open.
- Profiles/mastery/cosmetics/remaps, all five modes, the seven base kits and bank-safe consented secret extension already work.

## Warden quality pass

[Lantern Warden](WARDEN_PATROL.md) is fixed **2--**, with unchanged Normal health/damage/deadline. Still Watch keeps the stationary warned sweep. Half-health Roving Vigil marks and executes collision-resolved patrols before the next warning and in recovery. Ground origin/aim stay locked for every warning and active sweep. Brutal alternates direction and adds a fully warned sequential reverse return instead of overlapping active cones; recovery fans fire two locked-origin warned waves. Four original patrol poses, route/direction cues, persistent phase responses and fifteen-locale help are integrated. The existing individual Last Light score and tempo-aligned percussion remain. Two original-roster quality passes are implemented, 58 remain, zero human acceptances.

The exact built-in ImageGen native/request, portable bindings, failed equal-grid packing assumption and independent full-RGBA verifier are committed. The entire third-pose lantern and faint source alpha margins are retained, with world scale matching the previous Warden body. All prior Warden sources/contracts/atlases remain unchanged. Four new always-loaded 512-pixel cells add 4 MiB decoded RGBA beyond the earlier loading subtotal, separate from actual GPU/device memory or FPS.

## Latest user difficulty rules

One policy covers every combat revival source: **Baby 100%, Easy 50%, Normal 25%, Hard/Insane/Hellish disabled**. Hard+ cannot buy/consume revive kits. Recovery between encounters remains. Medic transformation pulses heal living allies and cannot bypass revival restrictions.

Phase shield-break event: **Baby/Easy Standard only**, disabled on Normal+ and every Brutal form. Baby has **six circles / two-second channel**; Easy **three circles / three-second channel** (half the circles, 1.5 times the channel). Larger squads require at most three occupants. Baby adds two actual cover props per map; Hard retains half interior cover, Insane/Hellish none. Boundary walls and boss-created mechanics remain. Hellish has marked lava after a three-second opening tell (24 damage/s in half-second hits) and forces **every encounter Brutal**, including the secret.

Threats 1–2 have two half-health phases retaining late authored patterns; higher threats retain three Standard/four Brutal phases. Health-bar dividers, phase count and independent entry banner clarify transitions. Normal health stays unchanged. Brutal repeats locked warned volleys for two total waves (three from threat 5), with bounded queues and 4,000-hostile cap; controlled shots/Warden safety stay authored. [Rules](DIFFICULTY_AND_PHASES.md), [latest assistance](ASSIST_LIMITS.md).

## Counts and next work

`docs/development-work-ledger.json` is the count authority; `tools/sync-development-progress.mjs` derives local/Wiki/in-game progress. `src/shared/update-history.json` drives both Markdown changelogs and the in-game journal. Keep these synchronized at meaningful checkpoints.

- **88 new ordinary identities** remain toward at least 150 ordinary plus secrets (three per fixed level/subtier). Recolors and Brutal variants do not count.
- **58 original-boss quality assessments/redesigns** remain. Constable and Warden have completed original-roster implementation passes; its human acceptance remains open. Other current bosses are already playable.
- Tune/review the implemented 21 class transformations and optional tree; no class implementation pass remains, but human/rendered/device/native-language acceptance does.
- Complete special-ability/boss action art, actual rendered transitions, final human balance/music/listening, native-language and physical-device acceptance.
- Finish active mixed-progression 8/16/50-player, WAN/full progression endurance and 49 scripted plus one rendered hostile-load gates. The older one-hour fifty-client probe is frozen-source local continuous combat with zero rendered clients.
- Durable hosted recovery still requires participant credentials, entropy history/paging, departures, storage/owner acceptance and deployed rankings. The normal writer remains disabled.
- A coordinated new Windows/browser release requires new tag/name and full validation. The public Site stays protocol 4. The issued Windows release `dev-windows-20261024-1` stays immutable, source `52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e`, protocol 13.

## Frozen previews and human evidence

Preserve every root/process, including 5174–5184. The previous feedback was on 5177/5179: Constable slightly harder was appropriate but phase/Brutal changes subtle; Early Watch phases passed quickly and shield events gave too much relief. The new responses await human comparison. Keep Normal entry bosses easy.

| Port | Frozen runtime source | Scope |
| --- | --- | --- |
| 5178 | f1766fe | Constable pincer/ring, lateral Cordon, phase hints/cues, red treatment, tempo-aligned percussion; protocol 14; human verdict open |
| 5179 | bbf909a | Integrated Early Watch; protocol 15; older human feedback informed latest difficulty rules |
| 5180 | deb4896 | Optional skill map; protocol 15 |
| 5181 | 3355e92 | Difficulty pressure, lava, forced Hellish Brutal; protocol 16 |
| 5182 | fb78b70 | Normal quarter revival, Baby/Easy circles/channel and additional Baby cover; protocol 17 |
| 5183 | 9bee65b | 21 class transformations plus latest difficulty rules; protocol 18 |
| 5184 | 81805fc | Warden patrol, sequential/reversing Brutal sweep and all prior rules/upgrades; protocol 19 |

Exact roots/PIDs/file/HTTP receipts belong to each checkpoint's review directory. Inspect actual port ownership and command lines before touching processes; occupied 5173/2567 may serve other protocols. Browser control is disabled: do not retry or bypass it via CDP or another route. Do not claim rendered, physical-device, native-language, listening or final balance acceptance.

## Current verification and publication

The current build passes **469 automated tests**, authored content/fifteen locales, TypeScript and production build. Both exact `81805fc` GitHub CI checks succeeded, including independent image verification with pinned Pillow 12.3.0 in an isolated CI environment. Source snapshot `5ed4b3a0e5dc8ce798e001caa647fe5303c9be339d594e31b42d79a0823ef000`; runtime source `8a291c2b81f2f72a3d021dbed597636cbb458b834007d2d70beadb5f25e0b4bd`; content revision `82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af`. Exact artifacts and failed attempts: `reviews/warden-patrol-2026-10-25/`.

The latest frozen preview is **http://127.0.0.1:5184/**, runtime commit `81805fc11fe052bf97872ea2934c61fac066101c`, protocol 19, process **28144**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-warden-81805fc`. All **1,669 files / 691,760,079 bytes** match the production receipt. Eighteen raw HTTP checks pass, including the new patrol atlas, original Last Light delivery and selected locale bundles. 5178–5183 index hashes remain unchanged; 5174–5177 roots are untouched. Preserve every earlier root/process.

The canonical Wiki is **18 pages / 30 images**, published from committed source `81805fc11fe052bf97872ea2934c61fac066101c` at Wiki commit `af9b50fcc4f7213e155a2d96e0073d15fd6e194c`. Every committed page/image blob and public image SHA-256 matches; four public HTML responses pass. Source/Wiki publication does not update the public Site or Windows archive. These software checks do not prove rendered, physical-device, native-language, listening or final human balance acceptance.

Use bundled Node 24 and pnpm 11.25.0. Node: `C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`; fallback pnpm: sibling `dependencies\bin\fallback`. `pnpm verify` checks authored content/locales, TypeScript, actual HTTP/WebSocket/SQL fixtures and production build. Use `python -X utf8` for technical RGBA/art work and `git -c core.bare=false`. Projectless chats need reviewed elevated writes/build/network access to this existing OneDrive folder.

Canonical Wiki is `docs/wiki/`, existing native checkout `.wiki-checkout` (18 pages/30 images); publish exact committed pages/images and run `node tools/verify-wiki-publication.mjs <source SHA>`. Source pushes alone do not publish the Wiki. Historical checkpoint records remain in Git and `docs/history/`; the current implementation/progress pages supersede older counts and unintegrated-draft notes.

Full development verification also uses Python 3 with `tools/art-verification-requirements.txt` (Pillow 12.3.0). The game runtime itself needs no Python. Known issued protocol-18 local Practice/profile revision `535eb34c...` migrates to protocol 19 with identity/progress/purchases retained; online/signed state stays strict.
