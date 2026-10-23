# First-loop development evidence

Soldier and Medic fight Hollow Constable in Gatehouse. Five-fight practice and uncapped prototype Endless reuse Constable variants. Sixty distinct boss designs are authored; their gameplay is still in production. This is a development playtest, not the full game release.

## Run from source

Node 24 and pnpm 11.25.0: install with pnpm install --frozen-lockfile, verify with pnpm verify, then run pnpm dev and pnpm server in separate terminals. Client: http://localhost:5173/; default service: 127.0.0.1:2567. VITE_GAME_SERVER sets a different browser endpoint; CLIENT_ORIGINS is the allowed-origin list. Offline solo runs the shared rules in a worker without a multiplayer server. Protocol is 4; incompatible old saves/clients are rejected. LAN hosting and portable Windows packaging remain pending.

Move WASD/arrows, aim pointer, primary button fire, Space dodge, R reload, Q/E abilities, X ultimate, F revive, 1/2/3 supplies. Standard gamepad: sticks move/aim, RT fire, A dodge, X reload, LB/RB abilities, Y ultimate, B revive, D-pad up/down/left supplies. Touch has movement/aim drags and action/supply buttons. These adapters are implemented; actual phone/controller evidence is pending.

Public discovery/private codes, sixty-second reconnect reservations and boundary admission remain. The queue counts reserved slots and rooms separately, holds expiring permits and shows starting-server/position messages. A configured limit is a guard, not measured host capacity.

## Current evidence

- reviews/runtime-verification.json: 74 meaningful tests, strict TypeScript, content/15-locale validation and production build; exact source digest and output hashes. Automated checks do not establish art quality, physical input or human playtesting.
- tests/network.test.ts: actual local SDK/WebSockets for protocol rejection, rooms/privacy, owner changes, duplicate purchases, reconnect, replicated supplies and queue cancellation/admission.
- tests/supplies.test.ts: all eight actual item effects, no-waste checks, transient shields/barriers, cooldown and fixed-slot limits.
- tests/signed-boundary.test.ts and tests/run-store.test.ts: signed multiplayer state and actual local SQLite transactions, competing claims, idempotence, stale writes, finalized rejection and Practice downgrade. These are not deployed recovery or D1 evidence.
- reviews/ui: assistant desktop browser review of voting, grades, illustrated shop, north/south strips, masonry, boss phases and actual keyboard/pointer supply use. Earlier all-fifteen phone class layouts are historical. No native speaker or physical phone/controller review is claimed.
- reviews/performance: separately labeled historical pilots, corrected pooled protocol-3 foreground result and current protocol-4 repeat. Read actual sample metadata/limitations; throttled preview captures are excluded from foreground FPS acceptance.

The corrected protocol-3 49-bot-plus-one-rendered-client run held 4,000 actual moving/colliding hostiles and fifty active players. Server stress p99 13.836 ms, max 18.845 ms over 90.051 seconds; bounded foreground renderer 110.28 FPS, p99 interval 15.2 ms, all 2,206 intervals with 4,000 hostiles/fifty active. Screenshot viewport 1280×1228; displayed canvas 1280×800, internal 1600×1000. Combined server/bot RSS 423,202,816 bytes, browser separate/unmeasured. Stress encoded traffic averaged 104,335.5 B/s/client including frequent fixture replacements. These are localhost synthetic fixtures with suppressed damage/extended boss health, production intermission clocks, forced revive/elimination/return/reconnect and duplicate purchase exercises. They are not WAN, free-host, normal-play bandwidth, endurance or human evidence.

The protocol-4 repeat includes current sprites/supplies/queue state and environment metadata. Its browser preview was throttled between interactions despite document.hidden=false; no current foreground FPS pass is inferred. The original invalid stress with downed bots and old mixed post-stress capture remain retained with explicit limitations.

## Remaining gate

Current foreground rendering, physical phone 30 FPS/desktop 60 FPS, free-host calibration/cold start, sixty-minute endurance and real human review remain separate. Signed boundary/SQL foundations must be connected through authenticated HTTP writers, actual D1 storage, owner leases, participant recovery and deployed restart races before online recovery/rankings ship. See RECOVERY_IMPLEMENTATION.md and HOSTING_CAPACITY.md. Limited four-frame north/south walks do not finish full animation contracts; provisional icons and full shaped-script scene review remain. Complete the first-loop architecture gate before full asset production. Preserve all outstanding full-game/Windows/GitHub deliverables in IMPLEMENTATION_BACKLOG.md.

## Current protocol-4 repeat

The protocol-4 repeat after the swept-bounds optimization held fifty active players/connections and exactly 4,000 actual hostiles for 90.004 seconds: 2,700 ticks, p99 19.772 ms, maximum 37.428 ms, event-loop p99 71.827 ms and zero rejected inputs. Baseline p99 was 6.662 ms. Revive/elimination/return/reconnect and production-clock votes/shop passed. Combined server/bot RSS was 451,883,008 bytes; encoded stress traffic averaged 105,903 B/s/client, about 19.06 GB/hour for fifty if sustained, excluding transport overhead. This remains a localhost synthetic fixture, not normal-play/WAN/hosted usage. Current rendered frames contained exactly 4,000 hostile images/fifty active players, but the preview was throttled around 1.31 FPS, so current foreground rendering remains unestablished. The pre-optimization protocol-4 run missed the server target at p99 42.515 ms and remains preserved separately. A single before/after run does not prove causality or hardware stability.

Evidence: reviews/performance/local-49-plus-rendered-server-protocol4-bounds.json and reviews/performance/rendered-protocol4-bounds-stress.json. Source/assets/fixture hashes are in the server report. Its source digest covers src/package/lock/Vite; the full verification digest also covers tests and other runtime config, so those two digest definitions are intentionally different.

## Public development playtest and recovery continuation

https://grave-accord-playtest.ivoryflame12.chatgpt.site/ is the published anonymous two-class Practice playtest. The current recorded browser/backend deployment is 33b36bc; read deployment evidence for the exact identity. The official Free host is capped at eight slots/one room. This is partial browser publication, not a Windows/full-game release. Actual assistant browser interaction and public HTTP/artifact evidence are under reviews/hosting/.

The source adds accurate eight-slot production copy, online Practice copy and a ready-only private-code/bootstrap handshake; the new real-network test confirms a guest can join by the delivered code. tests/run-service.test.ts and run-journal.test.ts exercise authenticated HTTP, durable nonce replay rejection, response-loss retry, thirty-second lease renewal, separate-process SQLite restart, competing claims and interrupted-combat Practice recovery. A server-only factory now connects journal acknowledgements to room transitions; normal/public execution leaves it disabled, and participant recovery/D1/rankings remain unfinished. See RECOVERY_IMPLEMENTATION.md.

The latest supported browser control retry fails with disabled in Work settings, even though the user can open localhost:5173. Current source/UI changes after the recorded live build are not rendered-browser-verified. Native Sites access to the saved ID currently fails too; keep the existing Site and audience. No new foreground/device/full-scene pass is claimed.
