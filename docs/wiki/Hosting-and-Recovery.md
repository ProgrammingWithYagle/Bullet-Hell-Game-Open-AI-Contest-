# Hosting and recovery

Local source runs the Vite frontend on port 5173 and the Colyseus service on loopback port 2567. Health is `/api/health`. Offline solo requires only the client and worker. Public room discovery, private six-character codes and reconnect reservations are implemented.

The existing public Site remains the earlier protocol-4 frontend and gameplay. Source pushes, Wiki updates and draft PR changes do not redeploy that Site. Current development source is protocol 43 and requires a matching backend. The issued Windows development archive remains immutable protocol 13; it is a separate build. A public Site owned by a different account must not be replaced without the appropriate authorized deployment path.

## Capacity and recovery status

| Feature | Actual state |
| --- | --- |
| Quarantine / Midnight / Pilgrimage admission | Up to 8 slots in current source |
| Grand Raid admission | Up to 16 slots; real 16-client admission checked, final WAN/device/endurance acceptance open |
| Endless room admission | Up to 50 slots in source; full rendered/hosting acceptance pending |
| Public playtest admission | Earlier eight-slot configuration |
| Reconnect reservation | 60 seconds while the same server process survives |
| Offline resume | Validated encounter-boundary save with compatible local migrations |
| Instance queue/cold-start logic | Tested foundation; live rollout depends on host configuration |
| SQL/HTTP/journal recovery foundation | Real fifty-build bounded-transfer/restart fixture; disabled in the normal runtime |
| Durable server-restart recovery | Not live |
| Verified public rankings | Not live |
| Windows portable runtime | [Unsigned development download](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1); three matching package copies and six native software fixtures; physical LAN/manual acceptance pending |

Server capacity and per-room capacity are separate constraints. Earlier scripted stress fixtures are not proof of physical-device FPS, WAN stability or a host's production capacity. Final 49+1, endurance and deployment acceptance remain open.

Large private checkpoint transfers now use authenticated bounded compression. A real file-backed HTTP fixture preserves all fifty developed builds and cached purchase replies after a process replacement; one of two competing owners wins. Maximum-entropy histories still need paging, and participant recovery credentials/hosted acceptance remain open. [Exact transport evidence and remaining gates](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOUNDED_RECOVERY_TRANSPORT.md).

Do not restart a local online service while active combat or reconnect reservations exist without coordinating with its players. Current development refreshes inspect health, admission and process identity first.

[Getting Started](Getting-Started) · [Architecture](Architecture) · [Recovery design and gates](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/RECOVERY_IMPLEMENTATION.md) · [Hosting capacity](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/HOSTING_CAPACITY.md)

The Electron desktop app contains its own runtime/assets and starts no server for offline solo. The desktop LAN menu explicitly launches a separate bundled authority; it reports an occupied port without replacing that listener. Automated native fixtures cover two local SDK clients and shutdown. Physical second-machine LAN and manual rendered/audio/device acceptance remain open. [Windows implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/WINDOWS_DESKTOP.md).

## Current server records

Build2026.10.29-smooth-rooms adds authority-written team records, exact scores/ties, filtered/paged reads, retained participant history and process-restart persistence in SQLite. `GRAVE_RECORDS_DB` selects the server file; the default is `data/team-records.sqlite`. Preserve that file across process replacement. A host with ephemeral storage must provide retained storage before promising deployment durability. Desktop LAN uses the app data folder. Testing servers may read boards but never write test results. These server-scoped records do not establish shared deployed global rankings or deployed match recovery.

## Waiting room and invites

Public and private rooms both have a six-character code. The Waiting room displays the team, host and chosen rules; Prepare equipment opens the upgrade area. Only the current host starts the run. Codes remain usable for late arrivals and can be shown or copied during play. The host may set an optional case-sensitive 4–64-character password on either type of room. Protected public rooms show a lock; code lookup reports only whether a password is needed, then the join form asks for it. Private rooms remain absent from the public list and need their code as well as any configured password. The authority enforces independent salted scrypt verifiers; passwords and verifiers do not enter listings, metadata, game state, checkpoints or application browser storage. A reserved reconnect keeps its existing identity without another password. Passwords do not add restart recovery: room lifetime still belongs to the running process. Protocol43 retains the Medic/shield rules and bounded local Practice migrations through issued protocol 42, preserving map policy, equipment and economy. Older online clients need their matching build.

## Connection progress and cancellation

Loading offers **Cancel**; **Esc** also returns home. Tab keeps keyboard focus on the loading action. Room search and code lookup show what is happening, with specific version, busy-server, wrong-address, expired-code and full/closed-room errors. Back cancels pending searches. Returning to another screen cannot let an old connection overwrite it. Leaving online records or changing filters cancels its requests, while paging keeps earlier rows usable. Protocol42 and gameplay/record rules remain. [Current source evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/connection-clarity-2026-10-29) separates software and transport checks from rendered/human review.

## Host controls and passwords

The host can reveal the room password beside the code, both in the waiting room and from **Room code** during play. Eye buttons show or hide passwords while entering them. The current Session retains its entered password privately until leaving; ordinary guests do not receive it in room details.

Opening settings, chat or a guide does not pause an online match. Only the current host can press **Pause match** or **Continue match**. The pause freezes the simulation and countdowns while chat remains available. If a paused host leaves or disconnects, play resumes and a connected teammate becomes host. Returning does not automatically reclaim host controls.

**Leave room** keeps remaining teammates playing. **End game for everyone** is a separate host action in Settings and requires confirmation. Everyone sees that the host ended the match; only already-completed encounters count. Protocol43 needs a matching backend, with a bounded local Practice migration from42. [Exact source and review evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/host-controls-2026-10-29).


## Clear edges and open routes

The view leaves space for full bosses and survivors near the map edges, with the same framing between fights and during defeat. Aiming follows the displayed position. Bosses can use the upper passages again; Brass Toad takes clear hops around cover when it cannot see the target. The painted lava pit keeps its normal activation, with the extra circle removed. [Current verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/camera-clearance-2026-10-29) separates software checks from human review.

## Larger-team software checks

Current local checks use real SDK clients with all seven classes: a full campaign with eight players, a private Raid with sixteen, and a three-clear Endless sample with fifty. They exercise earned purchases, equal-count votes, input, host pause/departure, replacement players, reconnect, shared results and persistence after restart. A fifty-player result retains fifty-one historical participants after turnover and loads its roster in two pages. These are isolated QA results with protected players and accelerated clears/deadlines, not legitimate public scores. There are no rendered clients. One earlier fifty-client join timeout remains preserved; standalone and sixteen-then-fifty instrumented repeats pass without changing timeouts or game code, and its cause is unproven. [Exact evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/multiplayer-progression-2026-10-30). Human, device, ordinary balance, full endurance and WAN/hosted acceptance remain separate.

## Groups sharing one connection

Current source gives valid room-code lookups and join attempts separate shared-IP budgets from wrong-code guesses. A full fifty-person group can join by code and retry without the previous thirty-lookup block. Wrong-code guesses remain limited to30 per minute; valid lookups and admissions allow120 each, and results reads allow360. These limits use the connection address rather than a submitted forwarding header.

Your own result reuses its first downloaded team-history page. Loading more results keeps it listed once, and changing filters clears that temporary reuse. A result from a different difficulty cannot appear through the recent-run shortcut. [Current software evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/shared-network-2026-10-30) keeps actual loopback SDK/HTTP tests and the fresh full progression check separate from physical Wi-Fi, WAN, hosted capacity or human acceptance. The historical fifty-client timeout still has no proven cause.
