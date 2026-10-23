# Hosting capacity and free-tier controls

Checked 2026-10-23. The browser client development playtest is deployed publicly at https://grave-accord-playtest.ivoryflame12.chatgpt.site/ after specific user audience approval. The gameplay service is now deployed on Render Free; actual evidence follows below. Neither registration nor a localhost benchmark establishes public hosting capacity.

The Render service form shows Free at $0/month, 0.1 CPU and 512 MB RAM. Initial calibration is bounded to one room and eight reserved slots. Fifty remains an unpassed hosting target. Keep auto-deploy off while validating exact source versions. Use `/api/health` for protocol, content revision, startup and capacity identity.

Render's current Hobby allowance is 5 GB outbound/month, shared across the workspace, including WebSocket responses and static responses. Free instance hours are shared too. Services can sleep after fifteen idle minutes, require approximately a minute to restart, and lose local files on restart. Durable recovery must use the approved D1 service rather than a file on the gameplay instance. No paid compute, card addition or paid storage is authorized.

Sources checked: [Render Free](https://render.com/docs/free), [outbound bandwidth](https://render.com/docs/outbound-bandwidth), [WebSockets](https://render.com/docs/websocket). Account-specific remaining usage is checked privately in the dashboard before hosted load tests.

## Current measured evidence

`reviews/performance/local-49-plus-rendered-server-pooled.json` records the earlier protocol-3 pooled-renderer run: 49 SDK bots and one rendered client. Baseline server p99 was 2.552 ms over 600 ticks. A 90.051-second stress held 4,000 actual server hostiles and fifty active connections/players throughout: p99 13.836 ms, maximum 18.845 ms, zero rejected inputs. Both votes, duplicate purchases, a two-second revive, elimination/return and reconnect ran with production intermission clocks.

Its bounded browser baseline averaged 118.46 FPS and stress 110.28 FPS, with a 15.2 ms stress frame p99. All 2,206 stress intervals had 4,000 displayed hostile images and fifty active players. Window resizing changed the outer browser dimensions; the stress screenshot is 1280 by 1228 with a 1280 by 800 displayed playfield, internally rendered at 1600 by 1000. The protocol-4 repeat records live browser/canvas metadata directly.

Combined server/bot stress RSS was 423,202,816 bytes. This is not server-only memory or browser memory. Encoded outbound averaged 104,335.5 bytes/s per client during the injected stress, about 18.78 GB/hour for fifty clients if sustained. That extrapolation includes continuous fixture projectile replacement and excludes transport overhead. It is not normal-play consumption or a WAN measurement. It nevertheless rules out treating the whole free allowance as unlimited capacity.

The first stress attempt had bots downed because dodges replaced fixture invulnerability. It remains separately labeled in `rendered-pooled-stress-first-attempt.json` and does not pass the active-player requirement. The corrected fixture suppresses damage except for its explicit lifecycle victim; all hostile objects still move, collide and render. A throttled approximately-one-FPS warmup is preserved separately and excluded from the foreground result.

## Implemented admission behavior

Instance slots include reconnect reservations. Room count and player count are independent. A bounded queue offers expiring permits in order among requests with eligible resources; an unavailable new-room resource does not block joins to existing rooms. Offers hold capacity, expire after fifteen seconds and cannot be reused. Waiting clients renew their thirty-second ticket by polling. The queue holds at most 128 requests. Leaving cancels its ticket.

The client waits up to 75 seconds for a starting server, checks protocol/content identity, then joins the queue. It shows its position and allows leaving through Pause. A room remains Practice. Local unit tests and real WebSocket tests cover capacity holds, stale offers, cancellation and admission after exactly one released slot.

## Gates still open

- Run the current protocol-4 local renderer/server sample after the new sprites and supplies.
- Deploy and check actual version identity, cold start, restart and bounded host load. Record server-only memory, tick percentiles, encoded traffic, elapsed time and bandwidth consumed.
- Calibrate separate aggregate room and slot limits from that host evidence. Reduce the configured limits if the free instance misses the target; retain the larger-capacity release gate.
- Test 8/16/50 active matches, physical-phone 30 FPS, desktop 60 FPS and sixty-minute endurance. Local scripts and viewport emulation do not replace physical-device or human evidence.
- Complete D1-backed recovery/rankings and the Windows/offline/LAN release. Check shared allowance again immediately before each hosted test; stop the test before a bounded budget can be exceeded.

## Current protocol-4 repeat

The protocol-4 repeat after the swept-bounds optimization held fifty active players/connections and exactly 4,000 actual hostiles for 90.004 seconds: 2,700 ticks, p99 19.772 ms, maximum 37.428 ms, event-loop p99 71.827 ms and zero rejected inputs. Baseline p99 was 6.662 ms. Revive/elimination/return/reconnect and production-clock votes/shop passed. Combined server/bot RSS was 451,883,008 bytes; encoded stress traffic averaged 105,903 B/s/client, about 19.06 GB/hour for fifty if sustained, excluding transport overhead. This remains a localhost synthetic fixture, not normal-play/WAN/hosted usage. Current rendered frames contained exactly 4,000 hostile images/fifty active players, but the preview was throttled around 1.31 FPS, so current foreground rendering remains unestablished. The pre-optimization protocol-4 run missed the server target at p99 42.515 ms and remains preserved separately. A single before/after run does not prove causality or hardware stability.

Evidence: reviews/performance/local-49-plus-rendered-server-protocol4-bounds.json and reviews/performance/rendered-protocol4-bounds-stress.json. Source/assets/fixture hashes are in the server report. Its source digest covers src/package/lock/Vite; the full verification digest also covers tests and other runtime config, so those two digest definitions are intentionally different.

## First actual Free-host run

Render deployed commit 853a5a64a953691772e0bc829a3237e43788657f on Free, protocol 4, eight reserved slots and one room. Eight actual SDK clients remained active through natural Baby combat, then mutation vote, contract vote and shop. No damage/HP/timer/projectile injection. The sampled window was 58.797 seconds within a sixty-second bounded loop. Encoded outbound was 840,679 bytes; peak server-only RSS was 122,556,416 bytes; natural hostile peak 14. Early rolling p99 peaked at 96.029 ms/max 101.079 ms with 199 samples, falling to 4.472 ms at 261 samples and about 3 ms later in combat. This does not pass a strict all-window 25 ms target or establish 4,000-hostile/50-player capacity. Retain the eight-slot calibration cap pending warmed/restart/endurance/host-stress evidence. All test slots/rooms were released. See reviews/performance/hosted-render-free-eight.json; the rejected first driver attempt is preserved separately.

## Latest access and HTTP observation

At 2026-10-23T19:56:00Z, anonymous Site HTTP returned 200/Grave Accord. Gameplay health returned 200 after 22.318 seconds, with a new startedAt, source 33b36bc, protocol 4, expected content fingerprint and zero occupied rooms/slots. This is one reachability/wake observation, not rendered performance or a cold-start percentile. Supported browser inventory and direct attach now report disabled in Work settings despite the user's working preview. The cause is unknown. Native Sites get_site reports NOT_FOUND for the saved ID; preserve the existing public Site rather than creating a duplicate. Current source copy/handshake changes are not published to the frontend until the saved Site can be accessed.
