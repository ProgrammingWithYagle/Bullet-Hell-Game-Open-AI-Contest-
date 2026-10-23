# First-loop development evidence

This prototype implements Soldier and Medic against Hollow Constable in Gatehouse. The five-round practice and uncapped Endless loop reuse that encounter with numerical contract variations. The sixty distinct designs remain the full-content target. This is not a verified public gameplay release.

## Run from source

Use Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`. The client is normally at http://localhost:5173/. Offline solo uses a dedicated worker running the shared 30 Hz rules. Run `pnpm server` separately for multiplayer on 127.0.0.1:2567. `VITE_GAME_SERVER` configures a different client endpoint; `CLIENT_ORIGINS` is the server's comma-separated allowed browser origins. LAN hosting and portable Windows packaging are not implemented yet.

Public discovery and private six-character codes use the same service. The owner starts a lobby. Reconnecting slots reserve capacity for sixty seconds. Instance limits default to fifty reserved players and four rooms; they are separate from an eight-player practice room or fifty-player Endless room. There is no paid provisioning.

Move with WASD or arrows, aim with the pointer, fire with the primary pointer button, dodge with Space, reload with R, use abilities with Q/E and ultimate with X, and hold F near a downed ally to revive. A standard gamepad uses left/right sticks, RT to fire, A to dodge, X to reload, LB/RB for abilities, Y for ultimate and B to revive. Touch uses a left movement drag, right aim/fire drag and action buttons. These bindings are implemented; physical-controller and phone review remain pending.

## Evidence

- `reviews/runtime-verification.json`: Stage 1 source checks, strict TypeScript, twenty meaningful rules/network checks and a production Vite build. Includes a source snapshot digest and build artifact hashes.
- `tests/network.test.ts`: real SDK/WebSocket joins, version rejection, public/private visibility, ownership, atomic duplicate purchases and interrupted-connection recovery.
- `tests/client-rules.test.ts`: reconciliation replay, the exact Endless power budget, boundary income and all fifteen plural catalogs.
- `reviews/performance/local-50-pilot.json`: fifty active scripted clients; both votes, duplicate purchase requests and 4,000-hostile stress. Approximately ten seconds of combat and ten seconds of stress, about three hundred tick samples per phase.

The recorded machine has an Intel Core 9 270H, twenty logical CPUs and 31.6 GiB of memory. Simulation p99 was 6.42 ms for baseline combat and 13.39 ms for stress. Stress maximum was 44.70 ms and event-loop p99 was 44.99 ms. Encoded outbound traffic averaged approximately 40 kB/s per client baseline and 107 kB/s during stress, including repeated stress-spawn traffic. Server and scripted clients shared one process; the recorded memory is combined. Invulnerability, large boss health, injected stress bullets and shortened intermission clocks are explicit pilot fixtures.

These short synthetic results do not pass the full performance gate. Required evidence still includes forty-nine scripted clients plus one rendered client, desktop/phone FPS, WAN and free-host capacity, deaths, arrivals, reconnects and a sixty-minute endurance run.

## Remaining first-loop work

Browser tools currently return `Local browser use is disabled in Work settings`; the user reports Browser enabled. Reconnecting the browser kernel did not resolve it. Keep the existing approval controls; broader website access has not been shown to fix this mismatch. The app may display the preview even while agent browser control is unavailable. No visual gameplay verification is claimed.

Offline intermission saves, signed server recovery, supplies, complete skill effect coverage and all multiplayer edge cases remain in progress. Runtime fonts and layout need embedded-font, RTL, small-screen and native-speaker review. The Medic uses an original static sprite pending animation production. Verify that screenshots, audio listening and human playtests are recorded separately from synthetic checks.

The complete implementation remains authorized. Continue the first-loop and fifty-player gates before producing the full asset library. Do not treat a source build or successful headless pilot as final release approval.
