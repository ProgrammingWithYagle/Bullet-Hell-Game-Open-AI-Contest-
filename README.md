# Grave Accord

An original cooperative zombie bullet hell about survivors keeping a forgotten city alive. Dry ink, matte gouache, distinct class roles, shared mutation votes and escalating civic horrors.

![Grave Accord cover](assets/proofs/cover-v1.png)

**Current source: three playable classes and two bosses, protocol 5. The complete game and portable Windows release remain in development.** Follow the [production Project](https://github.com/users/ProgrammingWithYagle/projects/3), [Wiki](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki) and [current implementation](docs/WARDEN_AND_HEAVY_RUNTIME.md).

[Play the published development prototype](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) — the earlier Soldier/Medic, Gatehouse/Constable, protocol-4 Practice deployment, with an eight-slot Free-host calibration limit. Source publication does not update that deployment.

The source branch plays Soldier, Medic and Heavy against Hollow Constable and Lantern Warden in Gatehouse, offline or in authoritative Colyseus rooms. Choose the opening boss at Review. Five-fight Practice and prototype Endless alternate the two bosses; saved per-boss completion history controls Brutal repeats. Heavy has suppression, bracing and overdrive; Warden has its rotating lantern sweep, fan/zones, phases, Accord interruption and Brutal echo. Four classes, the other routes/maps and fifty-eight bosses remain unfinished.

The runtime includes public/private discovery, reconnect reservations, server-owned votes/shops/skills, ultimates, eight supplies, queue/cold-start UX, control adapters and fifteen language catalogs. Signed-boundary/HTTP/SQL/lease components have local tests; deployed player recovery, verified rankings, full profiles, physical-device/human/native-language review and the Windows release remain open.

Production assets include 29 normalized reference poses, five original setup portraits, 27 Warden motion frames and 32 Heavy directional run frames, with exact prompts, preserved originals/rejected attempts and pixel/hash/anchor audits. With pnpm dev running, open [the local art room](http://127.0.0.1:5173/tools/art-review.html) or [Warden rehearsal](http://127.0.0.1:5173/tools/warden-rehearsal.html). These are review tools; final Phaser motion/transition acceptance and full action libraries remain open. See [the current art/runtime evidence](docs/WARDEN_AND_HEAVY_RUNTIME.md) and preserved [earlier normalization checkpoint](docs/ART_NORMALIZATION_AND_MOTION.md).

With Node 24 and pnpm 11.25.0, run pnpm install --frozen-lockfile, then pnpm verify. Verification covers authored content, TypeScript, **108 rules/network/HTTP/SQL tests** and a production build. In separate terminals run pnpm dev and pnpm server, then open [the local game](http://127.0.0.1:5173/). Offline solo uses a worker and needs no multiplayer server. Current source online play requires the matching protocol-5 local server.

The authored design includes seven classes, 378 skill nodes, 28 weapons, 24 mutations, six arenas and sixty boss identities across distinct campaigns, Raid and Endless. Download the verified illustrated design packet from the [Stage 1 prerelease](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/v0.2.0-stage1). Authored content is separate from completed gameplay. The [bible](docs/GAME_BIBLE.md), [boss pools](docs/BOSS_ROSTER_EXPANSION.md), [balance tables](docs/balance), [leaderboard contract](docs/LEADERBOARDS.md), [audio bible](docs/AUDIO_BIBLE.md) and [locale contract](docs/LOCALIZATION_IMPLEMENTATION.md) preserve the target.

For continuation, use the existing local folder and read [HANDOFF_NEXT_CHAT.md](docs/HANDOFF_NEXT_CHAT.md). The [acceptance backlog](docs/IMPLEMENTATION_BACKLOG.md), [changelog](CHANGELOG.md) and [third-party notices](THIRD_PARTY_NOTICES.md) distinguish implementation and remaining gates. Preserve the original MIT license and sealed Stage 1 artifacts. No paid provisioning is authorized. Actual contest submission is separate from source/release publication.
