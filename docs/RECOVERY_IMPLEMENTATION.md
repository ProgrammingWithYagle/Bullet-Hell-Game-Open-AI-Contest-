# Recovery implementation and verification boundary

Protocol 4. This is a partial implementation, not a shipped online recovery or ranking service.

`Game.authoritativeCheckpoint()` captures only lobby/intermission boundaries. It retains the current multiplayer roster, builds, supplies, timers, votes, RNG, selected/offered contracts, mutation state and bounded purchase-reply history. Restore validates each participant's build and inventory, resets transport input, and leaves participants disconnected for a future authenticated admission/identity-claim path. Transient combat effects do not become permanent purchased power.

`src/server/checkpoints.ts` signs the exact serialized boundary bytes with server-only HMAC-SHA-256. It requires a 32-byte-or-longer key, a UUIDv4 run ID, an owner epoch and sequence. Signed data expires after 24 hours. The verifier rejects altered bytes, another key, oversized/noncanonical data and unsafe/invalid game states. A valid signature alone does not authorize a restore.

`src/server/run-store.ts` uses D1-style prepared statements and an atomic batch. The schema is `services/run-ledger/migrations/0001_runs.sql`. A NOT NULL event guard aborts the whole batch if owner, sequence, digest or state no longer matches. It covers idempotent event IDs, conflicting retries, ninety-second owner leases, epoch increments, finalization, stale-checkpoint rejection and a latched Practice downgrade for interrupted-combat recovery. A pre-combat checkpoint cannot roll back a started encounter as a ranked boundary. Checkpoint settings and cumulative counters cannot decrease through a boundary write.

Cloudflare documents transaction rollback for a failed D1 batch: [D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/). Tests run the actual schema/statements in local SQLite transactions, including two competing asynchronous claims. They are local synthetic evidence, not deployed-D1 race evidence. The fifty-participant signature round-trip is likewise a serializer/validation test, not a recovered live match.

Public matchmaking does not accept plaintext or signed checkpoint uploads yet. Runtime rooms remain Practice. No signing credential is included in source, the browser, Electron or public JSON.

Still required before online recovery can be claimed:

- Official-server HTTP writer authentication over method/path/time/nonce/exact body, replay prevention and bounded payloads.
- Deploy the D1 migration/service through Sites and configure actual secrets through native secret storage.
- Connect the room lifecycle to acknowledged boundary writes and durable combat-start events, with outage downgrade behavior.
- Participant recovery credentials, stable participant-to-new-transport bindings, reconnect reservation expiry and late-arrival handling after a process restart.
- Preserve historical participants and cumulative team counters across departures, and integrate final ranking records.
- Actual deployed write/read/restart, simultaneous claim/finalize and old-owner tests. Preserve a normal victory before any secret extension.
