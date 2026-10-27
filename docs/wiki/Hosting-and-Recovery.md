# Hosting and recovery

Local source runs the Vite frontend on port 5173 and the Colyseus service on loopback port 2567. Health is `/api/health`. Offline solo requires only the client and worker. Public room discovery, private six-character codes and reconnect reservations are implemented.

The existing public Site remains the earlier protocol-4 frontend and gameplay. Source pushes, Wiki updates and draft PR changes do not redeploy that Site. Current development source is protocol 22 and requires a matching backend. The issued Windows development archive remains immutable protocol 13; it is a separate build. A public Site owned by a different account must not be replaced without the appropriate authorized deployment path.

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
