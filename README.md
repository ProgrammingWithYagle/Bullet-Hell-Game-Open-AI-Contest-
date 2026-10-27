# Grave Accord

A cooperative gothic bullet-hell game in active development. Current feature branch: build **2026.10.26-return-address**, protocol **22**, 66 distinct executable bosses with individual original themes, seven classes, 378 skills, 28 weapons and six different map layouts/sizes.

All sixty-six identities execute, including nine scheduled Endless exclusives and the optional Uncounted finale. Five modes work offline and in local online rooms: five-fight Quarantine Run, ten-fight Midnight Circuit, sixteen-fight Black Bell Pilgrimage, three-fight Grand Raid and uncapped Endless Vigil. The in-game main menu has a dated changelog generated from the same history as [CHANGELOG.md](CHANGELOG.md) and the [GitHub Wiki changelog](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Changelog).

Use Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`. Open http://127.0.0.1:5173/. Offline solo requires only the frontend and worker. Run `pnpm server` in another terminal for matching protocol-22 local online rooms on port 2567. Local protocol-4 through protocol-21 saves have bounded migrations; signed/online state is strict.

[Draft PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14) contains the current source. Protected main is a separate release boundary. The [public playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) still serves its earlier two-class, one-boss protocol-4 deployment. Source/Wiki updates do not redeploy it.

The [Wiki](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki), [Raid implementation](docs/GRAND_RAID_RUNTIME.md), [Pilgrimage implementation](docs/PILGRIMAGE_RUNTIME.md), [game bible](docs/GAME_BIBLE.md) and [authored roster](docs/BOSS_ROSTER_EXPANSION.md) distinguish working behavior from planned content. The implemented roster has sixty-six identities; the expanded target is 150 ordinary bosses plus secrets, with 85 additional ordinary identities still required. Profiles now preserve class mastery, rescues, codex discoveries, cosmetic insignia, personal/squad Endless bests, settings and control mappings; a full Hard campaign unlocks Insane/Hellish. [Profile details](docs/PROFILE_V1.md). Complete directional/action animation, final encounter tuning, verified rankings and durable online recovery remain unfinished. The Windows development package is issued; its final manual/device acceptance remains open. Full rendered animation, listening, physical-device/native-language, WAN, full progression endurance, capacity and balance acceptance remain open. The [one-hour localhost observation](docs/ONE_HOUR_ENDURANCE.md) records scoped continuous-combat timings separately.

[Bounded recovery transport](docs/BOUNDED_RECOVERY_TRANSPORT.md) now passes a real fifty-build HTTP/file-backed restart and competing-owner fixture. The normal runtime still has no configured recovery writer; maximum-entropy histories, participant credentials and hosted acceptance remain open.

## Windows development build

[Download the portable Windows development playtest](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) (706.8 MiB, unsigned). Extract the entire ZIP and run **Grave Accord.exe**. All 1,633 members match after fresh extraction and an ordinary Windows copy; all three copies passed separate offline and LAN software fixtures. The release includes the exact manifest, SHA-256 checksums and verification report.

The source includes a sandboxed Electron 45 app and explicit LAN host/join menu. After `pnpm verify`, run `pnpm desktop:build` on Windows to produce a new portable folder under `release/`. The app bundles its own runtime and assets; offline solo requires no Node or network. LAN uses a separate authority only after Host is selected. [Desktop build and validation](docs/WINDOWS_DESKTOP.md). Issued artifact links and extraction/copy evidence are maintained separately from the protected-main release boundary.

Hollow Constable now has two longer visible phases with opening double volleys and final gapped rings, extra Brutal pincers, four new shuffling poses and named pattern labels. [Behavior and evidence](docs/CONSTABLE_PATROL.md). This is the first qualitative boss-pressure pass; human balance review remains open.

Solo setup now includes a **Boss form** selector for direct Standard/Brutal opener comparisons. [Exact playtest steps](docs/BOSS_PRACTICE.md).

[Current development progress](docs/DEVELOPMENT_PROGRESS.md) tracks boss additions, quality passes, class ability revamps, branching-tree work, map implementation and separate review gates. [Phase/Brutal feedback and musical intensity](docs/PHASE_AND_BRUTAL_FEEDBACK.md) describes the latest changes.

Start a continuation with [the current checkpoint](docs/CHECKPOINT_2026_10_25.md) and `START_NEXT_CHAT.txt`. [Early Watch](docs/EARLY_WATCH_RUNTIME.md) adds three original encounters, 36 selected poses, individual themes and fifteen-locale help; its original integration roster was 63; Small Wakes now brings the source to 66, with 85 ordinary identities remaining. Superseded handoffs/state/acceptance records are retained in dated history.

The optional [expanded skill map](docs/OPTIONAL_SKILL_MAP.md) shows all 54 skills per class with zoom, scrolling and keyboard navigation. Enable it in Settings; classic remains the default. This completes the requested optional view implementation, while rendered/device/human review remains open.

[Difficulty and phase rules](docs/DIFFICULTY_AND_PHASES.md): Baby/Easy Standard shield events; Baby full and Easy half and Normal quarter combat revives; Hard+ no combat revives. Hard keeps half the interior cover, Insane removes it, and Hellish adds lava with every boss forced Crazed; Insane forces Brutal. Entry threats use two phases, segmented health and separate transition cues. Warned repeat volleys increase Brutal pressure; Normal health remains unchanged.

Latest rules: docs/ASSIST_LIMITS.md — Normal revives at 25%; Baby/Easy use six/three shield circles and two/three-second channels; Baby adds two cover props per map. Preserve all prior frozen previews. [Twenty-one class ability transformations](docs/CLASS_TALENTS.md) are now integrated at existing utility-path depth-three nodes, with all costs and prerequisites retained. Human/rendered review remains open.

[Lantern Warden quality pass](docs/WARDEN_PATROL.md) adds rest-only patrols, directional sweeps and a fully warned sequential Brutal return. Three original-roster quality passes are implemented (Constable, Warden and Courier); 57 remain. Its four patrol poses brought that checkpoint to 1,506; current selected runtime motion is 1,542. Human/rendered acceptance remains open.

Full verification also uses Python 3 with the pinned Pillow dependency: `python -m pip install -r tools/art-verification-requirements.txt`. This is a development verification dependency; the game itself remains browser/Windows JavaScript. CI installs it in an isolated virtual environment.

[Small Wakes](docs/SMALL_WAKES_RUNTIME.md) adds Candle Snail 1--, Cobble Crab 1- and Mourning Kettle 1 with two phases, 36 selected motion poses, three individual scores and fifteen-locale response help. The source has 66 bosses and 1,542 selected runtime poses. Current exact validation:484tests plus content,locales, TypeScript and production build; frozen preview/CI/publication receipts are in the current checkpoint. Human/rendered/device/native-language/listening/final balance acceptance remains open.

[Courier Return Address](docs/COURIER_ROUTE.md) changes one Standard delivery into two at half health; advanced forms add one leg and a warned split fan. Locked warnings start at actual stops, trails fade, and recovery leaves time to counterattack. Standard health/damage remains. Current build includes all66 Crazed forms, 2.5x/7.5x projectile budgets, compact maps and a distinct phase bell/entry animation.
