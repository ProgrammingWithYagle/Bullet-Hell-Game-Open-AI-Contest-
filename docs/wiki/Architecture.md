# Architecture

The development runtime uses TypeScript, Phaser 4.2.1, Vite 8.3.5 and Colyseus 0.18. A deterministic shared simulation owns combat, progression, purchases, votes and timers. It advances at 30 Hz; Schema patches initially run at 20 Hz. Phaser renders independently and pools projectile images. Movement uses prediction/reconciliation with the same masonry collision rules as authority.

Offline solo runs those rules in a worker. Online rooms run on the official gameplay server, validate bounded/finite inputs and reject stale sequences. The server owns currency, class compatibility, skill prerequisites, duplicate purchase replies and damage. Public and private discovery, capacity admission and sixty-second reconnect reservations are implemented. Private codes and reconnect credentials do not belong in public room listings.

Protocol 4 replicates supply inventory/cooldowns, shields and movement effects. The two implemented classes have real weapon/ability/ultimate/skill effects; authored content outside that subset is not automatically executable gameplay.

Recovery components live under src/server/: checkpoints.ts, run-store.ts, run-auth.ts, run-service.ts, run-client.ts and run-journal.ts. SQL changes use transactional compare-and-set plus event insertion. HMAC covers documented method/path/time/nonce/body-digest bytes; SQL stores expiring nonces. The server journal validates acknowledgments, renews leases and handles owner claims. Its local HTTP/SQLite process-restart tests do not constitute deployed D1 or a recovered rendered match; public room integration and participant bindings remain pending.

The latest local gate passes 68 rules, real-WebSocket, HTTP and SQL tests, strict TypeScript, content/localization validation and a production build. CI passes on the recorded runtime source. Performance fixtures, browser observations and human/device/native-language evidence are recorded separately.

Electron is the approved portable Windows target and is not packaged yet. Versioned full profiles/mastery/unlocks, live durable rankings, historical rosters and the complete class/boss/arena/route library remain future implementation work. Current settings/language selection persist locally; they are not a finished ProfileV1 system.
