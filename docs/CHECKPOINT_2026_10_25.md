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

Preserve every root/process, including 5174–5183. The previous feedback was on 5177/5179: Constable slightly harder was appropriate but phase/Brutal changes subtle; Early Watch phases passed quickly and shield events gave too much relief. The new responses await human comparison. Keep Normal entry bosses easy.

| Port | Frozen runtime source | Scope |
| --- | --- | --- |
| 5178 | f1766fe | Constable pincer/ring, lateral Cordon, phase hints/cues, red treatment, tempo-aligned percussion; protocol 14; human verdict open |
| 5179 | bbf909a | Integrated Early Watch; protocol 15; older human feedback informed latest difficulty rules |
| 5180 | deb4896 | Optional skill map; protocol 15 |
| 5181 | 3355e92 | Difficulty pressure, lava, forced Hellish Brutal; protocol 16 |
| 5182 | fb78b70 | Normal quarter revival, Baby/Easy circles/channel and additional Baby cover; protocol 17 |
| 5183 | 9bee65b | Latest 21 class transformations plus all latest difficulty rules; protocol 18 |

Exact roots/PIDs/file/HTTP receipts belong to each checkpoint's review directory. Inspect actual port ownership and command lines before touching processes; occupied 5173/2567 may serve other protocols. Browser control is disabled: do not retry or bypass it via CDP or another route. Do not claim rendered, physical-device, native-language, listening or final balance acceptance.

## Current verification and publication

The current build passes **457 tests**, authored content/fifteen locales, TypeScript and production build. Both exact `9bee65b` GitHub CI checks succeeded. Source snapshot `b554b87544f9aba53f6623c524c0b4a4888bf7ac4b733160a48cd053c50eab2d`; runtime source `d45aa59d4e38ce3f0be04232363e4b9ec68be1192179a8594e486298dda958e0`; content revision `535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6`. Receipts and failed attempts: `reviews/class-talents-2026-10-25/`.

The frozen class preview is **http://127.0.0.1:5183/**, runtime commit `9bee65b5219ebcb1cf12e15a4090a2460c26f198`, protocol 18, process **59400**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-talents-9bee65b`. All **1,668 files / 691,392,897 bytes** match the production receipt. Sixteen HTTP asset checks pass; 5178–5182 index hashes remain unchanged. Existing 5174–5177 roots are untouched (they were not listening in the latest port inventory). Preserve all old roots/processes.

The canonical Wiki remains **18 pages / 29 images**, published from committed source `9bee65b5219ebcb1cf12e15a4090a2460c26f198` at Wiki commit `63186b748db09c1628adccae144fc341edf2deb1`. Every page/image Git blob and public image SHA-256 matches; four public HTML responses pass. Publication does not update the public Site or Windows archive. These software checks do not prove rendered, physical-device, native-language, listening or final human balance acceptance.

Use bundled Node 24 and pnpm 11.25.0. Node: `C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`; fallback pnpm: sibling `dependencies\bin\fallback`. `pnpm verify` checks authored content/locales, TypeScript, actual HTTP/WebSocket/SQL fixtures and production build. Use `python -X utf8` for technical RGBA/art work and `git -c core.bare=false`. Projectless chats need reviewed elevated writes/build/network access to this existing OneDrive folder.

Canonical Wiki is `docs/wiki/`, existing native checkout `.wiki-checkout`; publish exact committed pages/images and run `node tools/verify-wiki-publication.mjs <source SHA>`. Source pushes alone do not publish the Wiki. Historical checkpoint records remain in Git and `docs/history/`; the current implementation/progress pages supersede older counts and unintegrated-draft notes.

## Latest Warden source

[Warden patrols](WARDEN_PATROL.md), build `2026.10.26-warden-patrol`, protocol 19, implements the second original-roster quality pass. The roster remains 63 and 88 new ordinary identities remain. Four new patrol poses bring selected motion to 1,506. Normal health/damage/deadline stay unchanged; Brutal gets direction changes and a fully warned sequential return. All 21 class transformations and latest assistance/Hellish rules remain. Current exact verification/publication belongs to `reviews/warden-patrol-2026-10-25/`; earlier class-preview/hash/CI/Wiki records above describe their preserved frozen checkpoint. Human acceptance remains open.

The Warden checkpoint passes **469 automated tests** plus authored content/fifteen locales, TypeScript and production build. Source snapshot `5ed4b3a0e5dc8ce798e001caa647fe5303c9be339d594e31b42d79a0823ef000`; runtime source `8a291c2b81f2f72a3d021dbed597636cbb458b834007d2d70beadb5f25e0b4bd`; content revision `82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af`. Exact artifacts/failed attempts are in `reviews/warden-patrol-2026-10-25/`. Canonical Wiki now has **18 pages /30 images**, including the new motion reference. Earlier preview and Wiki receipts retain their own frozen source/counts.
