# Changelog

Meaningful implemented changes are recorded here. Planned work belongs in the Project and implementation state, not in release claims.

## Unreleased

### Added
- Added the shared 30 Hz first-loop combat core: Soldier/Medic abilities and ultimates, swept collisions, revives, authoritative votes, prerequisite-aware skill spending and idempotent purchases.
- Added the Phaser client and offline worker, public discovery/private codes, sixty-second reconnect reservations, movement prediction/reconciliation, class shops, cooldown displays, keyboard/gamepad/touch controls, fifteen runtime language catalogs and original music/SFX playback.
- Passed twenty rules/network checks, strict TypeScript and a production client build. A short fifty-scripted-client pilot reached 4,000 hostiles with a 13.4 ms simulation p99; it does not establish rendered FPS or hosting capacity.
- Published the verified Stage 1 packet, PDF, checksums and report in prerelease v0.2.0-stage1; published fifteen Wiki pages and activated main protection after successful verify checks.
- Expanded the authored boss roster to 60 distinct identities: 50 disjoint timed-route bosses, 9 Endless exclusives and The Uncounted. Each added boss has numerical mechanics, counterplay, an art brief and three phases.
- Added no-repeat gauntlet pools with three concealed candidates at every vote and guaranteed Endless-exclusive slots.
- Added a stricter clean-detail art contract concentrating detail on faces, hands and signature props.
- Began the Grave Accord production workspace and Stage 1 artifact pipeline.
- Created the first original ink-and-gouache cover proof.
- Added an implementation state file recording stage gates and verification boundaries.
- Added localization to the production requirements: en, zh-Hans, zh-Hant, ja, es, fr, de, pt-BR, ru, hi, ar, bn, id, ur, ko.
- Specified Endless Vigil as a true endless mode with no final round, supporting solo, private groups, and public games up to 50 players.
- Authored the full initial content catalog, progression tables, Markdown production bible and canonical Wiki drafts.
- Authored seven distinct cooldown ultimates with skill-tree upgrades while retaining 126 total skill nodes.
- Generated and inspected original survivor, boss and Gatehouse art proofs.
- Added the team-run leaderboard design, including scoring categories and separate squad-size and difficulty boards.
- Completed 15 AI-authored translation catalogs with 959 keys each, including all sixty bosses, content coverage, placeholder checks and plural forms.
- Completed two original arranged music loops, eight editable stems and 25 SFX, with deterministic synthesis and objective signal verification.
- Added corrected HUDs and eight-frame survivor/boss animation proofs with fixed-pivot atlases and browser playback review.
- Added strict Stage 1 content, mutation-combination, analytical balance, art, audio and localization validation.
- Initialized the GitHub Wiki and one production Project with stage, subsystem, priority, status and acceptance-evidence tracking.

### Known limitations
- The runtime is a development prototype; full content, offline/online recovery, verified leaderboards, a Windows build and public hosting remain in progress.
- Embedded multilingual fonts, shaped-script/layout review and native-speaker review remain pending.
- Browser automation still reports disabled access despite the user's enabled setting. Rendered gameplay, 49 bots plus one rendered client, physical-device performance, free-host capacity, endurance and human playtesting remain outstanding.

## Changelog policy

- Date released versions using the release date and link their immutable source commit.
- Use Added, Changed, Fixed, and Known limitations sections as appropriate.
- Update this file when user-visible content or behavior is implemented.
- Publish localized release highlights in the game. Keep this source log available through the Wiki and release.
- Record measured verification separately; passing string-coverage checks is not native-speaker review.
