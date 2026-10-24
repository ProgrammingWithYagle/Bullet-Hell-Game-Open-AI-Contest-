# Hosting and recovery

Local source runs the Vite frontend on port 5173 and the Colyseus service on loopback port 2567. Health is `/api/health`. Offline solo requires only the client and worker. Public room discovery, private six-character codes and reconnect reservations are implemented.

The existing public Site remains the earlier protocol-4 frontend and gameplay. Source pushes, Wiki updates and draft PR changes do not redeploy that Site. The current protocol-10 source must use a matching backend. A public Site owned by a different account must not be replaced without the appropriate authorized deployment path.

## Capacity and recovery status

| Feature | Actual state |
| --- | --- |
| Campaign room admission | Up to 8 slots in current source |
| Endless room admission | Up to 50 slots in source; full rendered/hosting acceptance pending |
| Public playtest admission | Earlier eight-slot configuration |
| Reconnect reservation | 60 seconds while the same server process survives |
| Offline resume | Validated encounter-boundary save with compatible local migrations |
| Instance queue/cold-start logic | Tested foundation; live rollout depends on host configuration |
| SQL/HTTP/journal recovery foundation | Tested modules; disabled in the normal runtime |
| Durable server-restart recovery | Not live |
| Verified public rankings | Not live |
| Portable Windows/offline/LAN release | Not built |

Server capacity and per-room capacity are separate constraints. Earlier scripted stress fixtures are not proof of physical-device FPS, WAN stability or a host's production capacity. Final 49+1, endurance and deployment acceptance remain open.

Do not restart a local online service while active combat or reconnect reservations exist without coordinating with its players. Current development refreshes inspect health, admission and process identity first.

[Getting Started](Getting-Started) · [Architecture](Architecture) · [Recovery design and gates](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/RECOVERY_IMPLEMENTATION.md) · [Hosting capacity](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/HOSTING_CAPACITY.md)
