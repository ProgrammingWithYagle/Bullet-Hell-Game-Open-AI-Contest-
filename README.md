# Grave Accord

An original cooperative zombie bullet hell about survivors keeping a forgotten city alive. Dry ink, matte gouache, distinct class roles, shared mutation votes and escalating civic horrors.

![Grave Accord cover](assets/proofs/cover-v1.png)

**Current status: Stage 1 delivered; two-class development playtest published. The complete game and portable Windows release remain in development.** The complete implementation is tracked in the [production Project](https://github.com/users/ProgrammingWithYagle/projects/3). The [Wiki](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki) has fifteen published guides. Download the illustrated design packet from the [Stage 1 prerelease](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/v0.2.0-stage1).

[Play the development prototype](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) — Soldier/Medic, Gatehouse/Constable, Practice only, with an eight-slot Free-host calibration limit.

The authored design includes seven classes with cooldown ultimates, 378 skills, 28 weapons, 24 mutations, six arena kits, fifty route bosses, nine Endless-exclusive bosses and one secret boss. Quarantine Run, Midnight Circuit and Black Bell Pilgrimage are distinct campaigns; Grand Raid supports sixteen players; Endless Vigil has no final round and targets fifty. Player counts and performance remain implementation gates until measured.

The Stage 1 source includes a full [production bible](docs/GAME_BIBLE.md), [sixty-boss gauntlets](docs/BOSS_ROSTER_EXPANSION.md), [balance tables](docs/balance), [leaderboard contract](docs/LEADERBOARDS.md), [audio bible](docs/AUDIO_BIBLE.md), [localization data](docs/LOCALIZATION_IMPLEMENTATION.md), eight original art proof sets, cleaner finish references and an editable original audio library. Fifteen AI-authored language catalogs contain 22,365 messages. Human playtesting, native-speaker review and physical-device performance remain separately recorded checks.

Open assets/proofs/animation/index.html to review animation proofs and assets/audio/preview.html to audition music and SFX. These worksheets work locally without a game server. They are preproduction reviews, not gameplay.

The latest [production-art checkpoint](docs/ART_NORMALIZATION_AND_MOTION.md) normalizes 29 reference poses, integrates five new class portraits and adds an eight-frame Lantern Warden attack study. With `pnpm dev` running, open [the local art room](http://127.0.0.1:5173/tools/art-review.html#lantern-warden-attack) for pose selection, playback, scale/alpha/anchor review and provenance. These assets do not add playable classes or bosses. Built-in image generation prompts and preserved natives are recorded in docs/production-motion-2026-10-23.json.

The latest [Warden continuation](docs/WARDEN_SIGNATURE_REHEARSAL.md) adds four idle and four channel frames, measured lantern attachments and a local Phaser signature rehearsal. Open [the rehearsal](http://127.0.0.1:5173/tools/warden-rehearsal.html) with `pnpm dev` running to inspect the authored warning, rotating cone and trailing safe wedge. This room is separate from normal matches; full Warden gameplay and final Phaser motion approval remain pending.

The runtime branch contains Soldier and Medic, Gatehouse and Hollow Constable, five-round practice and an uncapped prototype loop. It shares combat rules between an offline worker and an authoritative Colyseus service. It includes public/private rooms, reconnect reservations, votes, a class shop, skill spending, ultimates, controls and fifteen language catalogs. The client now includes first-visit onboarding, separate illustrated setup pages, icon shops, connected specialization trees and local intermission recovery, three supply slots with eight usable consumables, and capacity queue/cold-start messaging. Full-content implementation, signed online recovery, verified rankings, physical-device review, portable Windows packaging and the full release remain in progress. Local authenticated HTTP/SQL restart tests do not constitute live player recovery. Constable variants are practice encounters, not the sixty distinct bosses.

With Node 24 and pnpm 11.25.0, run `pnpm install --frozen-lockfile`, then `pnpm verify`. This validates Stage 1, checks TypeScript, runs 83 rules/network/signature checks and builds the client. In separate terminals, run `pnpm dev` and `pnpm server`, then visit [the local prototype](http://localhost:5173/). Offline solo uses the worker and does not require the multiplayer service. See [first-loop evidence and remaining gates](docs/FIRST_PLAYABLE.md). For a new development chat, read the [complete continuation handoff](docs/HANDOFF_NEXT_CHAT.md) and preserve the existing uncommitted working tree.

The illustrated PDF and portable Stage 1 packet are produced by the tools in tools/; source, fresh extraction and ordinary Windows copy must agree before delivery.

The game implementation uses TypeScript, Phaser, Vite, Colyseus and Electron with one shared authoritative rules simulation. A free Render realtime service and a public browser client with durable global team records are the approved hosting design. No paid provisioning is authorized.

See [CHANGELOG.md](CHANGELOG.md) for implemented changes, [the acceptance backlog](docs/IMPLEMENTATION_BACKLOG.md) for planned work, and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for provenance and licenses. The original MIT license is preserved. Actual Handshake submission is tracked separately from source and release publication.
