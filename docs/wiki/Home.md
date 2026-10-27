# Grave Accord

![Grave Accord cover: survivors approach the dead watch captain beneath the city bells](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/cover.jpg)

*Original game cover. [Art gallery](Art-Gallery) · [Boss galleries](Bosses) · [Map comparison](Modes#six-different-playable-layouts).*


Cooperative gothic zombie bullet hell. Choose a survivor, clear a boss contract, vote on mutations, buy a build and survive the next encounter.

**Current development source: version 0.3.0, build `2026.10.26-small-wakes`, protocol 20, updated 2026-10-26.** The game is still in development. [Draft PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14) contains the playable feature branch; protected `main` is a separate release boundary.

| Playable now in that source | Contents |
| --- | --- |
| Survivors | All seven classes; two abilities and one ultimate per class |
| Builds | 378 skills, 63 specialization paths, 28 weapons, eight supplies, 24 mutations |
| Bosses and music | 66 distinct executable encounters, each with an original theme |
| Routes | Five-fight Quarantine Run, ten-fight Midnight Circuit, sixteen-fight Black Bell Pilgrimage, three-fight Grand Raid, uncapped Endless Vigil |
| Maps | Six actual layouts with different cover, spawns and playable dimensions |
| Sessions | Offline solo, public/private online rooms, boundary saves, process-live reconnect |
| Interface | Remappable keyboard/mouse/gamepad, touch; Hold/Toggle options; fifteen language catalogs |
| Profiles | Mastery, rescues, discovered codex, cosmetic insignia, settings, bests, validated import/export and Hard-completion unlocks |

The [public browser playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) remains the **older protocol-4 build with two classes and one boss**. Source and Wiki publication does not redeploy it. Run from source for the latest artwork. The [Windows development download](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) is an earlier immutable source build; see [Getting Started](Getting-Started).

All sixty-six identities execute, including nine scheduled Endless exclusives and an optional Uncounted campaign extension. Complete action/facing animation and final encounter tuning remain unfinished. Verified leaderboards and durable online recovery remain unfinished. The unsigned Windows development package is published with extraction/copy and native fixture evidence; final manual/device release acceptance remains open. Automated evidence does not establish final rendered, human, device, language or balance acceptance.

## Player reference

- [Getting Started](Getting-Started): controls, installation and saving.
- [Profiles and mastery](Profiles): progress, cosmetics, difficulty unlocks and portable profile files.
- [Classes and Skills](Classes-and-Skills): the seven kits and build rules.
- [Modes](Modes) and [Gauntlets](Gauntlets): playable routes, map sizes and boss selection.
- [Bosses](Bosses): all 66 executable signatures and counterplay.
- [Economy and Mutations](Economy-and-Mutations): rewards, shops and team voting.
- [Audio](Audio) and [Accessibility and Languages](Accessibility-and-Languages).
- [Changelog](Changelog): dated changes, also available inside the game's main menu.

## Development reference

[Architecture](Architecture) · [Hosting and Recovery](Hosting-and-Recovery) · [Leaderboards](Leaderboards) · [Contributing](Contributing) · [Credits](Credits)

[Full acceptance backlog](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/IMPLEMENTATION_BACKLOG.md) · [Latest automated verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/runtime-verification.json) · [Midnight implementation evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md)

[Black Bell Pilgrimage implementation and evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/PILGRIMAGE_RUNTIME.md).

[Grand Raid implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/GRAND_RAID_RUNTIME.md) · [Endless and Uncounted implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ENDLESS_AND_UNCOUNTED_RUNTIME.md).

[Current development progress](Development-Progress) tracks new bosses, existing-encounter quality passes, class ability revamps, skill-tree work and map revisions, with implementation separate from human review.

The latest [continuation checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CHECKPOINT_2026_10_25.md) preserves the current source and art. Early Watch adds three original encounters with 36 selected motion poses, individual scores and fifteen-locale help. The roster is 66; 85 additional ordinary identities remain. [View the motion contact](Art-Gallery#early-watch-runtime-motion).

The optional **Expanded skill map** setting shows all 54 skills per class, with zoom, scrolling and keyboard navigation. Classic remains the default. [Implementation and limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/OPTIONAL_SKILL_MAP.md).

## Class ability transformations

The seven requested class-upgrade implementation passes now add 21 behavior changes at existing utility-path depth-three nodes (six cumulative SP each). Costs, prerequisites, node IDs and the single-capstone rule remain. Both skill views show fifteen-locale help. Shared authority, finite constructs, delayed attacks and moving fields replicate to offline/online clients. [Class behavior and tradeoffs](Classes-and-Skills#purchased-ability-transformations). Protocol 18 migrates known issued protocol-17 local saves/profiles; online remains strict. Latest Baby/Easy/Normal assistance and Hellish rules remain intact. Human/rendered/device/native-language acceptance remains open.

[Lantern Warden quality pass](Bosses#roving-warden-quality-pass) adds rest-only patrols, directional sweeps and a fully warned sequential Brutal return. Two original-roster quality passes are implemented; 58 remain. Its four patrol poses brought that checkpoint to 1,506 selected runtime poses; the newer Small Wakes total is 1,542. Human/rendered acceptance remains open.

[Small Wakes](Bosses#small-wakes-three-new-ordinary-encounters) adds Candle Snail, Cobble Crab and Mourning Kettle with 36 selected poses, three individual scores and fifteen-locale phase help. The source roster is 66; 85 further ordinary identities remain. Protocol 20 carries known issued protocol 19 local saves/profiles forward; online remains strict. Total selected runtime motion is 1,542.

## Current feedback pass: Crazed Horizon

Build 2026.10.26-crazed-horizon/protocol 21 adds purple Crazed/C forms to all 66 identities, forced Insane Brutal and Hellish Crazed, 2.5x/7.5x projectile budgets, warned pursuit/crossing patterns and persisted Endless form progression. Four spacious maps are smaller; the boss header separates name/grade/form/phase/timer and phase entry gains a distinct original cue plus reduced-motion-aware bar engraving. [Rules](Bosses) · [Modes and arenas](Modes). Roster remains 66; 85 ordinary identities and 58 original quality passes remain. Human 5185 comparison confirmed clearer phase and Brutal differences but identified too much retreat space. Current changes await comparison.
