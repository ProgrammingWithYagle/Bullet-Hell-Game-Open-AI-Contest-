# Grave Accord

![Grave Accord cover](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/cover.jpg)

A cooperative gothic bullet-hell game. Dodge attacks, defeat a boss, vote on the next contract and spend your rewards on a build. Play solo or with friends.

The current feature branch uses **build 2026.10.29-home-gallery / protocol 43**. [Draft PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14) contains this unfinished development work; protected main is a separate release boundary.

The current home-gallery pass has 873 passing local software checks. Manual arrows show the full cover, seven survivors and six maps. Full boss and survivor artwork stays visible near borders while upper floor routes remain usable. Host controls retain explicit Pause/Continue, private password reveal and a confirmed end-for-everyone action. [The current review](reviews/home-gallery-2026-10-29) records exact software/transport evidence and limits. Loading has Cancel/Esc, useful room-search/join errors and requests that end when their screen closes. Earlier chat, player-status, room-password, boss/map and recovery improvements remain. [Earlier connection evidence](reviews/connection-clarity-2026-10-29) distinguishes software/transport checks from rendered/human acceptance. [Windows development](docs/WINDOWS_DESKTOP.md) identifies the separately verified native package.

After each boss clear, a five-second **Boss defeated** moment lets the existing fall or final pose finish with a preparation message and countdown before the next choices or results. Fifteen bosses have full falling sequences; fifty-one have final poses.

Server team records now save real shared results and offer filters and team history. Chat has its own space during menus and keeps its fight position. The matching local previews include these changes; hosted global rankings still need coordinated deployment.

## Your first run

Under **New here?**, choose **Start gently** to prepare Soldier, Quarantine Run, Gatehouse, Baby difficulty and Solo. Review the settings, then press Play. The preset remains available after reading the optional **Tutorial**, until a local run is recorded. **New run** offers the full class, mode, map and difficulty selection. Modes show fight counts and estimated duration; map geometry stays on the map step. Difficulty icons are unique, with names and help beside them. Public menus hide development-build details, and testing builds share the same polish.

Between fights, coins buy equipment, supplies and stat upgrades; skill points buy class skills. Inspect an item before buying it. Gear tiles show names, prices and equipped status. The optional boss guide is available on Baby difficulty and pauses Solo while open. **Local Practice records** shows runs stored on this device.

[Getting Started and controls](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Getting-Started) · [Accessibility and languages](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Accessibility-and-Languages)

## Choose a build

| Version | What it contains |
| --- | --- |
| Current source, below | Latest content and presentation; offline Solo and matching local online rooms |
| [Public browser playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) | Earlier protocol-4 build with two classes and one boss |
| [Portable Windows development download](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) | Earlier immutable protocol-13 build; unsigned, 706.8 MiB |

Source and Wiki updates do not redeploy the hosted playtest or replace the Windows download. Extract the entire Windows ZIP and run **Grave Accord.exe**. Its manifest, checksums and extraction/copy evidence ship with the download. Manual and physical-device acceptance remain open. See [Windows development](docs/WINDOWS_DESKTOP.md) for local packaging and LAN hosting.

## Run the current source

Use Node 24 or newer and the pinned pnpm 11.25.0. Full development verification also requires Python 3 and the [pinned Pillow dependency](tools/art-verification-requirements.txt).

```powershell
pnpm install --frozen-lockfile
python -m pip install -r tools/art-verification-requirements.txt
pnpm verify
pnpm dev
```

Open [localhost:5173](http://127.0.0.1:5173/). Offline Solo runs in a worker and needs no multiplayer server. For matching protocol-43 local online rooms, run `pnpm server` in a second terminal; its default loopback port is 2567.

Development and testing builds include rehearsal tools. Public builds omit the boss selector and currency tools. Use `pnpm build:testing` or `pnpm build:public` for the intended audience. [Public polish](docs/PUBLIC_POLISH.md) describes the current scope and review boundaries.

## Current game

| Part | Implemented content |
| --- | --- |
| Survivors | Seven classes, each with two abilities and an ultimate |
| Builds | 378 class skills, 63 specialization paths, 21 ability transformations and 28 weapons |
| Encounters | 66 executable identities, including nine scheduled Endless exclusives and an optional Uncounted finale; individual original themes |
| Routes | Quarantine Run, Midnight Circuit, Black Bell Pilgrimage, Grand Raid and Endless Vigil |
| Arenas | Six different playable layouts with difficulty-specific cover and hazards |
| Sessions | Offline Solo, public/private online rooms, boundary saves and process-live reconnect |
| Preferences | Remappable keyboard/mouse/gamepad, touch controls, reduced motion, text scaling and fifteen language catalogs |
| Profiles | Class mastery, rescues, discoveries, cosmetics, records and validated JSON import/export |

The optional expanded skill map shows all 54 skills per class with zoom, scrolling and keyboard navigation; classic remains the default. A full Hard campaign unlocks Insane and Hellish. [Difficulty and phase rules](docs/DIFFICULTY_AND_PHASES.md), [profiles](docs/PROFILE_V1.md), [class transformations](docs/CLASS_TALENTS.md) and the [optional skill map](docs/OPTIONAL_SKILL_MAP.md) explain the details.

## Development status

The current local software gate passes **873 tests, 873 pass, 0 fail**, plus authored content/fifteen locales/RGBA, TypeScript, production build and71atlas contracts. [Current checkpoint](docs/CHECKPOINT_2026_10_25.md) distinguishes source CI, frozen previews, package verification and Wiki evidence. Rendered/human/device acceptance remains open.

Twelve original encounters have implemented quality passes; 48 remain. Content expansion and the proposed General Double Dash/Sprint branch are deferred during public polish. Complete action/facing animation, final encounter tuning, verified hosted rankings and durable online recovery remain unfinished. Rendered, listening, native-language, physical-device, WAN, endurance, capacity and human balance acceptance remain open.

[Development Progress](docs/DEVELOPMENT_PROGRESS.md) is generated from the single implementation ledger. [Changelog](CHANGELOG.md) and the in-game journal share one update history. The [Wiki](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki) covers playing and the [game bible](docs/GAME_BIBLE.md) preserves the design. Continue development from the [current checkpoint](docs/CHECKPOINT_2026_10_25.md) and `START_NEXT_CHAT.txt`; dated history retains predecessor evidence.

Online rooms open a **Waiting room** with the player list and a copyable code. Use **Prepare equipment** while waiting; the host presses **Start run**. The **Room code** button remains available during play. Selecting a specific map keeps it for the run; the two random options choose once or before each fight. Painted cover and themed scenery apply across all thirty-six map/difficulty combinations. New rendered/human acceptance remains open.


Medic recovery now has explicit class/difficulty rules: Baby full health plus20% shield, Easy75%, Normal45%, Hard 30%, Insane 1HP, and no revival on Hellish. Medic can spend a self-revival charge in a team; ordinary classes retain Solo-only self-recovery. Passive regeneration is reduced for everyone on Hard/Insane and disabled on Hellish. [Exact rules and balance limits](docs/MEDIC_RECOVERY.md).


Personal shields now share one combined capacity across starting shields, ability shields and armor plates: Baby/Easy/Normal 100% of maximum health, Hard 75%, Insane 50%, Hellish 0, rounded down. Excess shield cannot absorb damage. Hellish cannot buy or consume shield items; deployed walls remain physical cover. The HUD shows current shield/capacity. Future Tank/Heavy cap upgrades and selective attack blocking are recorded separately and are not implemented. [Future design ideas](docs/FUTURE_DESIGN_IDEAS.md).


Base starting shield is recalculated each fight from the difficulty-adjusted capacity: Heavy 50%, Tank 100%, Soldier 15%, all other classes 0. Hellish gives everyone0. Existing starting-shield mutation bonuses can fill remaining capacity, and all sources respect the same cap. This adds no new branch or maximum-shield upgrade.
