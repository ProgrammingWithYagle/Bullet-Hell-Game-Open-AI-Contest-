# Grave Accord

![Grave Accord cover](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/cover.jpg)

Dodge attacks, defeat bosses and spend your rewards between fights. Play Solo or team up with friends in this cooperative zombie bullet-hell game.

**Current development build: 2026.10.29-host-controls.** The game is still in development. The public demo and published Windows download below are older versions.

## New here?

Choose **New here? → Start gently** for a prepared Soldier, Quarantine Run, Gatehouse, Baby difficulty and Solo. Review the settings, then press **Play**. The optional **Tutorial** explains the basics. **New run** lets you choose your class, mode, map and difficulty yourself. [Getting Started](Getting-Started) covers controls, installation and saving.

## Play with others

Create an open room or add an optional password. Protected public rooms show a lock; joining by listing or code asks for the password. Private rooms stay out of the public list and require their six-character code too. Chat keeps its fight position and has its own space during menus. **C** shows or hides the chat panel; **Enter** starts typing and **Esc** closes it while typing. You can also click the message field. Text stays until the server confirms delivery. If sending fails or is uncertain, the draft remains and a notice explains how to retry. If C already has a custom gameplay binding, that action keeps the key.

Upgrades scroll above the separate **Start run / Leave room** row. Online matches keep running while menus are open; only the host can deliberately use **Pause match**. Solo pauses for its menus. [Hosting and Recovery](Hosting-and-Recovery) explains connections and server limits.

While connecting or loading, **Cancel** or **Esc** returns home. Room search shows its progress and explains version, address or room errors. Back ends a pending search.

## Keep your records

Open **Leaderboards** for records saved on this device or **Team records** from the selected game server. Everyone who joined combat shares the team's rank. Filter by mode, difficulty and peak team size, then expand a result to see its players. During an Endless break, the host can finish the run and save the result. [Records](Leaderboards) explains scoring and what qualifies.

## What is playable?

| Feature | Current source |
| --- | --- |
| Survivors | Seven classes, each with two abilities and an ultimate |
| Builds | 378 skills, 28 weapons, eight supplies and 24 mutations |
| Bosses | 66 encounters, each with its own music |
| Modes | Quarantine: 5 fights; Midnight: 10; Pilgrimage: 16; Grand Raid: 3; Endless: no final fight |
| Maps | Six layouts with different cover, spawns and playable space |
| Controls | Keyboard/mouse, gamepad, touch and saved control settings |
| Languages | Fifteen languages; translation review is ongoing |

## Guides and galleries

[Classes and Skills](Classes-and-Skills) · [Modes and Maps](Modes) · [Bosses](Bosses) · [Gauntlets](Gauntlets) · [Economy and Mutations](Economy-and-Mutations) · [Profiles](Profiles) · [Audio](Audio) · [Accessibility and Languages](Accessibility-and-Languages) · [Art Gallery](Art-Gallery)

## Available builds

The [older public browser demo](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) has two classes and one boss. The [published Windows development download](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) is the immutable October 24 version. Source and Wiki updates do not replace either release. Use [Getting Started](Getting-Started) for the current source instructions.

Newer local Windows review packages have separate source, extraction/copy and native runtime evidence. They have not replaced the published download. Final animation, balance, human/device/language/listening review, shared hosted rankings and deployed match recovery remain release work.

<details>
<summary>Development and verification</summary>

Current source is version 0.3.0, protocol 43 on [draft PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14). The [current publication and verification evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/host-controls-2026-10-29) records source CI and Wiki synchronization. Current host-control source passes859local software checks. The separately verified fe82c7e Windows review passes six native offline/LAN diagnostics on three copies. Rendered/human acceptance remains separate. [Development Progress](Development-Progress) tracks remaining work; [Changelog](Changelog) records each update. [Architecture](Architecture), [Hosting and Recovery](Hosting-and-Recovery), [Contributing](Contributing) and [Credits](Credits) provide the technical and project references.

The latest [continuation checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CHECKPOINT_2026_10_25.md) distinguishes current source, frozen previews, CI, Wiki and the current local Windows review package. Protected main and external deployment remain separate boundaries.

</details>

After each clear, a five-second **Boss defeated** moment lets the existing fall or final pose stay visible. **Preparing the next encounter…** and a countdown explain the pause; the final fight prepares results. Fifteen bosses currently have full falling sequences; fifty-one have final defeat poses. The next vote keeps its full time.

Online rooms open a **Waiting room** with the player list and a copyable code. Use **Prepare equipment** while waiting; the host presses **Start run**. The **Room code** button remains available during play. Selecting a specific map keeps it for the run; the two random options choose once or before each fight. Painted cover and themed scenery apply across all thirty-six map/difficulty combinations. Random-map options show a filled picture of the six maps. The player card uses actual character headshots, separate health/shield bars and clear coins, skill points and ammo. New rendered/human acceptance remains open.

## Host controls and passwords

The host can reveal the room password beside the code, both in the waiting room and from **Room code** during play. Eye buttons show or hide passwords while entering them. The current Session retains its entered password privately until leaving; ordinary guests do not receive it in room details.

Opening settings, chat or a guide does not pause an online match. Only the current host can press **Pause match** or **Continue match**. The pause freezes the simulation and countdowns while chat remains available. If a paused host leaves or disconnects, play resumes and a connected teammate becomes host. Returning does not automatically reclaim host controls.

**Leave room** keeps remaining teammates playing. **End game for everyone** is a separate host action in Settings and requires confirmation. Everyone sees that the host ended the match; only already-completed encounters count. Protocol43 needs a matching backend, with a bounded local Practice migration from42. [Exact source and review evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/host-controls-2026-10-29).
