# Development playtest deployment

This deploys the two-class Practice prototype. It is not the full release, a verified-ranking service or a declaration of fifty-player hosting capacity.

Gameplay service: https://grave-accord-playtest.onrender.com . Render Free, Ohio, 0.1 CPU/512 MB, eight reserved slots and one room for initial calibration, health `/api/health`, auto-deploy Off. The first live deployment is source commit `853a5a64a953691772e0bc829a3237e43788657f`, with protocol 4 and content `b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241`. Actual public health returned HTTP 200 with that identity. No paid tier/payment method was added.

Browser Site: `appgprj_6adba24c54c4819197768bbc03f2997e`. Initially private; native deployment results establish its actual live URL and source/version identity. The creation response returned expected origin `https://grave-accord-playtest.ivoryflame12.chatgpt.site`; registration is not deployment. CORS permits that origin plus the two development loopback origins. The production browser defaults to the public gameplay endpoint; `VITE_GAME_SERVER` can override it, while Vite development remains localhost.

`/api/metrics` exposes cached aggregate operational measurements only: no player names, private codes or room IDs. Its tick windows contain at most 600 samples per live room. Server memory on Render excludes the SDK load clients running locally. A peak of rolling-window p99 values must not be called the exact full-run percentile.

`tools/hosted-capacity-client.ts` uses ordinary private-room client commands, actual damage, normal boss health and production clocks. Each run is bounded to sixty seconds and stops before a thirty-MiB encoded traffic allowance. Its first driver attempt omitted the private room code and was rejected; the failed evidence remains, all slots were released, and the driver now waits for the code. Natural encounter traffic is not equivalent to a 4,000-hostile injected stress. Shared monthly usage, cold start, larger capacity, endurance and physical devices remain separately verified gates.

Current signing/SQL recovery code is a foundation only. The deployed service has no live D1-backed recovery or global rankings. Do not put signing credentials in source, browser assets, Electron or public checkpoints. Historical sealed Stage 1 archives remain unchanged.

## First actual Free-host run

Render deployed commit 853a5a64a953691772e0bc829a3237e43788657f on Free, protocol 4, eight reserved slots and one room. Eight actual SDK clients remained active through natural Baby combat, then mutation vote, contract vote and shop. No damage/HP/timer/projectile injection. The sampled window was 58.797 seconds within a sixty-second bounded loop. Encoded outbound was 840,679 bytes; peak server-only RSS was 122,556,416 bytes; natural hostile peak 14. Early rolling p99 peaked at 96.029 ms/max 101.079 ms with 199 samples, falling to 4.472 ms at 261 samples and about 3 ms later in combat. This does not pass a strict all-window 25 ms target or establish 4,000-hostile/50-player capacity. Retain the eight-slot calibration cap pending warmed/restart/endurance/host-stress evidence. All test slots/rooms were released. See reviews/performance/hosted-render-free-eight.json; the rejected first driver attempt is preserved separately.
