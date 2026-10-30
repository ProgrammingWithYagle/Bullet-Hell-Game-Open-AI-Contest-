# Grave Accord — team leaderboards

Current source implements server-scoped team records with authority-only simulation hooks, SQLite persistence, exact scores/ties, mode/difficulty/size/week filters, paged participant histories, save retries and real multiplayer/restart evidence. The player page is [Records](wiki/Leaderboards.md). Shared deployed global rankings and deployed recovery are separate unfinished hosting gates.

The records screen retains separate device/online filters for the current visit. Online mode, difficulty, team-size band and All time/This week survive tab switches. Switching to a smaller mode normalizes an incompatible band. Tab and device-filter changes keep keyboard focus, and Back cancels unfinished requests.

The original Stage1 design below (rules version1, authored2026-10-22) remains the full global-service target. Its D1 HTTP writer/restore/season/cursor requirements are not all provided by the current single-server SQLite implementation. Original arithmetic fixtures are design evidence; current implementation tests are tests/team-records*.test.ts.

## One rank for one team run

A leaderboard row represents a whole run. Everyone who entered combat in that run appears in its expandable roster and shares its rank, including eliminated, disconnected, and departed teammates. Players never compete for separate positions within their own team.

Create five boards: Quarantine Run (`short`), Midnight Circuit (`standard`), Black Bell Pilgrimage (`long`), Grand Raid (`raid`), and Endless Vigil (`endless`). The first four are the four timed experiences; individual rooms and the six reusable arena art kits do not create additional boards. Future independently playable maps must receive their own stable mode/map identifier before getting a separate board.

Partition every board by mode, difficulty, peak squad-size band, rules version, exact content revision, and release season. Do not compare difficulty levels or silently combine balance revisions. Size bands are Solo, 2–4, 5–8, 9–16, and 17–50; omit bands exceeding a mode's capacity. A run's band can rise during play but can never fall. A 16-player Raid cannot appear on an 8-player board after players leave.

`peakCombatRoster` is the highest number of concurrent combat slots admitted at an encounter start, including downed, eliminated, and 60-second reconnect-reserved slots. A spectator or a lobby visitor does not count. A participant who reconnects uses their original run-scoped participant ID. Admission occurs only at encounter boundaries. Peak concurrency is different from the total historical roster: an endless run may have more than 50 historical participants while never exceeding 50 simultaneous slots.

The final eligible roster is the union of unique participants admitted into combat at any point in the scored run. Never remove an entry because that person quits, is kicked, times out, or changes class. Only members alive, connected, and in combat at the final-clear tick count as survivors. Downed, eliminated, spectator-only, and absent people do not. This deliberately preserves the survival denominator after departures. Late arrivals still share the team result; their roster entries show which encounters they actually played.

Accounts are optional. Use run-scoped opaque IDs, not email addresses, IP addresses, reconnect tokens, or persistent device IDs, in public data. Each row has an auto-generated team label and short run ID. A local device stores its recent run IDs to locate its results. The leaderboard makes no claim to link a person across devices.

## Timed clear score

Only a completed base campaign or Raid clear qualifies. A defeat has a local recap but no timed global rank. Bank a campaign result at the normal final boss before offering The Uncounted. Secret-extension damage, duration, or defeat cannot change the banked rank. Secret completion is an additional badge.

Calculate the following once, on the authoritative final-clear tick:

```text
speed      = clamp(1 - combatMs / deadlineBudgetMs, 0, 1)
survival   = survivorsAtFinalClear / finalEligibleRoster
protection = clamp(1 - hpDamageTaken /
                         summedPlayerMaxHealthAtEncounterStarts, 0, 1)

score = roundHalfUp(500000 + 250000 * speed
                          + 150000 * survival
                          + 100000 * protection)
```

The maximum is 1,000,000. A real qualifying clear has positive combat duration, at least one survivor, and positive denominators. The theoretical zero-duration maximum is a formula-only boundary fixture, not an admissible online result. Round the complete sum once, never the components. For nonnegative scores, `roundHalfUp(x) = floor(x + 0.5)`; compare exact integer ratios at boundaries rather than relying on a pre-rounded display percentage.

`combatMs` sums active simulation time from the first encounter through the base final clear. Exclude shopping, votes, menus, loading, connection queues, server downtime, and solo pause. Include telegraphs, boss invulnerability, Accord Breaks, and every other active combat phase. The server advances this counter from simulation ticks; client wall clocks never affect it. Conversion from ticks to integer milliseconds occurs only for serialization, using `floor(totalCombatTicks * 1000 / 30)`, rather than summing individually rounded tick lengths.

`deadlineBudgetMs` sums the actual authored deadline for each scored encounter after difficulty and legal mutation adjustments, frozen at that encounter's start. It excludes unused future contracts and the secret extension. Do not replace a short contract's deadline with the route's target playtime. A timer change never takes effect retroactively. Each encounter must have cleared strictly before its own deadline: an invalid individual timeout cannot be hidden by a favorable aggregate budget. Online menus do not pause combat or its deadline.

Both health counters use integer milli-HP (1,000 milli-HP = 1 HP). `hpDamageTaken` is actual health removed from all participants during scored combat, capped at their remaining HP on each hit. Count hostile, environmental, and deliberate self-damage; exclude blocked damage, shields, overheal, maximum-health-stat changes, and overkill. Healing and revives never subtract prior damage. Repeated damage after healing can exceed the health budget, reducing protection to zero.

`summedPlayerMaxHealthAtEncounterStarts` adds the effective maximum HP of every admitted entrant once at every scored encounter start, after build and mutation modifiers. Do not add health again for a revive, reconnect, temporary shield, or failed recovery replay. Late arrivals first contribute when admitted for their next encounter. Freeze each encounter's snapshot; a mid-fight modifier does not rewrite it.

Rank timed runs by score descending, then combat duration ascending, then exact damage ratio ascending. Runs equal on all three competitive values share a competition rank (`1, 1, 3`). Use authoritative finish time then run ID only for stable display order, never to split a rank. Do not insert personal contribution or damage dealt into team ranking: support and rescue play must not lose credit.

For indexed D1 ordering, derive `damageRatioSortKey = floor(damageNumerator * 10^33 / healthDenominator)` with arbitrary-precision integers, then zero-pad it to 49 decimal digits and store it as TEXT. Both counters are safe integers no greater than `2^53 - 1`, with a positive denominator. Distinct fractions within those bounds differ by at least `1 / (2^53 - 1)^2`; multiplying by `10^33` separates them by more than 12 units. The padded key therefore preserves exact ratio ordering and equality without SQLite floating-point division. Use the same construction for Endless last-clear ratios. Public UI shows percentages, not the internal key.

## Endless Vigil: progress first, time clearly shown

Show **bosses cleared** as the primary achievement and **total combat survival time** beside it. Rank by:

1. Bosses cleared, descending.
2. Combat time through the last completed clear, ascending.
3. Exact HP-damage ratio through that same clear, ascending.

More completed bosses always beats fewer. Faster progress breaks a tie; waiting in a safe corner cannot improve the result. Extra time spent fighting the eventual failed boss remains prominently visible as survival time but contributes no ranking advantage. A run with zero clears receives a recap and local survival record, but no global entry. Menus, intermissions, and reconnection waiting never inflate either combat clock.

Freeze ranking metrics after each completed boss: `bossesCleared`, `combatThroughLastClearMs`, `hpDamageThroughLastClear`, and `healthBudgetThroughLastClear`. On terminal defeat or **End Vigil** during an intermission, finalize that last-clear tuple with `totalCombatSurvivalMs`. An active run is labeled In Progress and has no finalized rank. A deliberate departure during combat does not immediately terminate a team that can still continue. All-absent rooms terminate after the existing reconnect grace period. A registered interrupted encounter cannot be replayed for a better verified result.

Distinct runs equal on the complete three-value tuple share a competition rank. Use exact cross-multiplication for ratio comparisons; a displayed 25.0% is not a comparison key. Stable display order is finish time, then run ID. Do not introduce a hidden survival-time tiebreaker.

## Interface and localization

The default leaderboard opens on the last played mode, difficulty, and size band; without history use Quarantine Run / Normal / Solo. Filters are Mode, Difficulty, Squad size, and Period. All time is the default within the active release season; This week uses UTC Monday 00:00 through the next Monday, based on authoritative terminal time. Older seasons are available under an archive selector. Week filtering never merges seasons or revisions.

Timed desktop columns are Rank, Team, Score, Combat time, and Survived. Endless columns are Rank, Team, Bosses cleared, Survival time, and Peak squad. On phones use one two-line row with the same hierarchy, an explicit expand button, and no horizontal scrolling. Top 10 is the initial view; Show more fetches 25 rows. A separate **Your last run** card shows its current rank, total qualifying runs in that partition, primary metric, and three-line explanation. Its rank is a read-time snapshot and may change as other teams finish.

The timed result panel highlights the shared rank and score, then speed, survival, and protection components. The endless panel highlights bosses cleared and survival duration, with a smaller **Clear time breaks ties** explanation. Empty boards invite the first qualifying run. Failed, practice, pending, and unavailable results use those words rather than a fictitious rank.

Expanding a row displays the complete historical roster in pages of 25. For each participant show nickname, classes played, encounter range/count, joined-late/departed/reconnected badges, final status, damage dealt, healing provided, damage blocked, and completed revives. Contributions explain a shared effort; do not turn them into a second ranking or an MVP requirement. Participants who arrived at the final encounter receive the same run rank with clear **Joined encounter N of R** context. An endless participant first admitted into the eventual failed encounter is labeled **Joined after the last clear**; the shared rank does not claim they completed earlier bosses.

Public ranked defaults on for the official rules. Private ranked defaults off. Before combat every lobby member sees **Ranked: this team's result and nicknames will be public**, or **Practice: local results only**. A private room opting into ranked publishes its result, never its room code or live lobby location. Freeze ranked/practice choice before the first combat admission; any later custom rules or integrity downgrade latches the run unranked. Allow aim assist, auto-fire, touch, gamepad, reduced effects, and accessibility settings on equal terms.

All labels, empty states, metric help, status badges, and plural forms must exist in all 15 launch locales. Localize numbers and duration labels with `Intl` while keeping sortable wire values numeric. Keep nicknames as plain text, isolate their direction with `bdi`, and mirror menu layout for Arabic/Urdu without reversing ranks, numbers, or game geometry. Display names are NFC-normalized, trimmed, 1–24 graphemes, at most 96 UTF-8 bytes, and reject controls, explicit bidi formatting, and markup. Empty or rejected names become localized **Survivor 01**, etc.; never render submitted HTML.

## Persistent service and trust boundary

Use an account-free public Sites-hosted HTTP Worker backed by D1 for ranking and run-lifecycle records. Render continues to run real-time combat. The browser reads public scores over HTTPS; only an official combat server with a server-only HMAC key can register lifecycle events or submit results. The browser and Electron bundle contain neither that key nor checkpoint signing secrets. Offline, modded, and LAN-hosted results remain **Local / Practice** and never enter verified online boards.

Declare logical D1 binding `DB` in the Sites hosting manifest. Use versioned schema migrations and prepared, parameterized statements. Configure runtime secret values through native Sites secret tools and Render's protected environment; source and `.env.example` contain key names only. The Sites public audience permits anonymous reads and does not authorize writes. No separate player OAuth flow is needed.

Runtime secret names are `LEADERBOARD_WRITE_KEY` and `CHECKPOINT_SIGNING_KEY`; use independent random 256-bit values. `LEADERBOARD_KEY_ID` identifies the active writer key without disclosing it. Key rotation permits one explicitly configured previous key during a 24-hour transition; a key ID alone conveys no authority. Restrict accepted server IDs to deployment configuration and allowlisted protocol/content revisions. Never let a request register its own trusted key or season.

Sign the exact request body bytes. Headers carry key ID, server ID, integer Unix timestamp seconds, random 128-bit nonce, and the base64url HMAC-SHA-256 signature over:

```text
UPPERCASE_METHOD + "\n" + PATH + "\n" + timestamp + "\n" + nonce + "\n" + SHA256_HEX(body)
```

`PATH` excludes query strings; writer endpoints do not accept a query. Reject time skew over 300 seconds, invalid signatures, unknown keys/servers, reused nonces, oversized bodies, unknown fields, and non-finite/unsafe numeric values. Compare signatures using Web Crypto verification. A nonce is stored for ten minutes; retries use a new nonce but retain the same run/result event ID. Rate limiting supplements authentication; it never replaces it. Do not put credentials in URLs or logs.

The service recomputes score, size band, and board identity from validated authoritative counters. It never accepts `score`, `rank`, or a client-provided trusted result. A valid signature establishes which official server reported the run; it does not make a compromised server or faulty game simulation impossible. Release evidence must test the actual integration rather than call this design anti-cheat proof.

## Minimal HTTP and durable records

`content/leaderboards.json` is the machine-readable companion contract. Its `jsonSchema` contains Draft 2020-12 create/event/participant contracts; adjacent semantic rules cover counter monotonicity, per-mode eligibility, actual encounter deadlines, and roster consistency. Public endpoints:

| Method/path | Contract |
| --- | --- |
| `GET /api/v1/leaderboards` | Required `mode`, `difficulty`, `sizeBand`, `seasonId`, `rulesVersion`, `contentRevision`; optional `period=all|week`, UTC `weekStart`, `limit` 1–25 (default 10), opaque `cursor`. Return rows, total qualifying runs, next cursor, board identity, and read-time `asOf`. |
| `GET /api/v1/runs/{runId}` | Public finalized summary, shared rank in its exact board, verification status, score/tuple, survival and contribution recap. Unknown or unfinalized IDs return 404. |
| `GET /api/v1/runs/{runId}/participants` | Finalized public roster in stable first-admission order; `limit` 1–25, opaque cursor. Never expose reconnect credentials or room code. |

Authenticated writer endpoints:

| Method/path | Contract |
| --- | --- |
| `POST /api/v1/runs` | Register stable UUIDv4 run ID, official server/owner, immutable mode/difficulty/revision/rules/season/visibility/ranked choice, and sequence-zero checkpoint digest before first combat. Duplicate identical create is idempotent; conflicting identity is 409. |
| `POST /api/v1/runs/{runId}/events` | A bounded, ordered lifecycle event: `combat-start`, `intermission`, `lease-refresh`, `restore-claim`, `demote`, or `finalize`. Include event ID, exact expected checkpoint sequence, owner epoch, previous digest, and typed metrics. Each event is idempotent by run ID + event ID + payload hash; conflict is 409. |

Writer bodies are at most 64 KiB, UTF-8 JSON; each event carries at most 50 participant deltas. The service stores historical participant records incrementally, so a long endless run never needs an unbounded final request. Queue additional roster deltas as sequential intermission events if necessary; every admitted participant must be durably recorded before the next ranked combat. Finalization is rejected if totals do not match the registered roster count, peak size, and latest lifecycle state.

Use four logical D1 tables: `runs` (one mutable lifecycle row and immutable finalized result per run), `participants` (run ID + participant ID, contribution totals and admission context), `events` (event ID + payload hash for idempotency), and `nonces` (key/server/nonce + expiry). Index finalized runs by board partition and competitive ordering, plus UTC end time for weekly reads. Index roster by run ID and admission order. Public APIs return selected fields, not arbitrary database rows. Use same-primary reads for a just-finalized result; public board lists may be cached for up to 15 seconds and disclose `asOf`.

Checkpoint documents carry the run ID, owner epoch, sequence, cumulative metrics, roster digest, seed, intermission state, protocol/content/rules versions, issue/expiry, and HMAC. Checkpoints expire after 24 hours. Store their digest and cumulative counters in D1; retain full signed recovery data with participants under the game's checkpoint design. Do not store credentials or signatures in public result JSON.

State transitions are `registered → combat → intermission → combat ... → finalized`; `intermission → intermission` is allowed for bounded roster-delta registration. A `restore-claim` is valid only against the exact latest acknowledged intermission sequence/digest, a nonterminal state, and an expired previous owner's 90-second lease. A server refreshes that lease every 30 seconds while it owns a ranked room. There is no early-release endpoint in v1; a replacement owner waits for lease expiry. Claim increments the owner epoch atomically, preventing the old server from continuing to submit events. Concurrent claims cannot both succeed. Restore cannot reduce cumulative counters, change the seed, regenerate offered contracts, change votes already committed, or allocate fresh starting money.

Mark combat-start durably before simulating an encounter. If a process dies after that event, the prior intermission cannot replay the interrupted encounter as ranked. Allow recovery of the signed checkpoint as **Recovery Practice**; preserve the saved build and completed progress. If a server dies while safely in a registered intermission, the new owner can continue ranked after the one-owner claim. A finalized run never resumes or earns another rank; a secret extension is outside the banked timed result.

For every mutation, claim, or finalization, perform the compare-and-set of sequence/state/owner plus event insertion and participant changes in one D1 `batch()`. Add database constraints so a failed compare-and-set aborts dependent writes rather than inserting a result after a zero-row update. Do not use a read-then-unconditional-write pattern or an in-memory lock as the integrity boundary. A same-ID/same-payload finalized retry returns the original accepted result. A different final payload, stale sequence, previous owner, old checkpoint, or terminal replay returns 409 without modifying ranks. Failed auth is 401/403; invalid shape/range is 400; excessive size is 413; rate limits are 429; temporary storage failure is 503.

Public reads cache partitioned top pages and use bounded cursors, not arbitrary SQL or nickname searches. Cap request limits and validate enum filters. Keep roster contributions incremental, validate counters as nondecreasing, and reject unknown participants/classes. Participant damage/healing/blocked milli-HP and combat-tick totals are nonnegative safe integers. Record both original and latest class where a class change is legal. The public display is a derived view of those authoritative values.

## Outages, capacity, and publication claims

If initial ranking registration is unavailable, start the game as **Practice — rankings unavailable**. If a required later lifecycle write cannot be acknowledged, continue gameplay while latching **Unverified — ranking connection interrupted**. Never stop offline or LAN play because a global service is down. Do not reconnect to an old checkpoint and silently promote an already downgraded run. Keep local result evidence.

An unknown final-submit response is **Pending verification**. The owning official server retries the identical finalized event with a fresh transport nonce for up to 24 hours. If it already committed, the service returns the same result; if the owner/process and its unacknowledged result are lost, do not invent a verified rank. Finalization after restart still requires the registered state, owner epoch, and exact monotonic counters. A public GET outage shows last cached rows with their timestamp, or a readable unavailable state.

Observe query counts, indexed query duration, storage, rejected events, write availability, and server-to-service latency without logging secrets. Inspect the actual Sites/D1 allowance and Render allowance before release; do not assume paid quotas or purchase capacity. Return a usable local/practice path on exhaustion. This small HTTP service stores results and low-rate lifecycle updates, not real-time projectile snapshots.

Acceptance requires a deployed-service write/read/restart test, cross-browser visibility, all 15 localized layouts, private-room disclosure, and actual simultaneous finalize/restore races. Formula fixture verification alone is design evidence. Do not claim global leaderboards shipped while only local records or mocked responses work.

## Acceptance scenarios and fixtures

The companion fixture file contains exact arithmetic vectors, sorting comparisons, eligibility cases, roster cases, and lifecycle races. The implementation must pass them without changing expected values to match its output.

- A four-player clear displays one rank and all four people. A late fifth arrival appears with entry context; a departed player remains in the denominator and roster.
- Fast teams gain speed score; healthy teams gain protection score; repeated healed damage never becomes negative or rewards damage farming.
- Each mode/difficulty/size/revision uses its own board. Invalid combinations, like 17–50 in Raid, are rejected.
- A loss cannot post to a timed board. Timed base victory remains banked after secret defeat.
- Endless progress beats stalling; partial final-fight survival changes the visible timer but cannot improve ordering. Exactly tied runs share a competition rank.
- Scores and contribution displays agree across English, Simplified/Traditional Chinese, Japanese, Spanish, and all other launch locales, including Arabic/Urdu bidirectional names.
- Forged browser writes, duplicate finalization, stale restored checkpoints, concurrent owner claims, and writes from a previous owner cannot create a second rank.
- Browser reload sees durable scores; Render restart does not erase D1 results; a mid-combat crash recovers gameplay as practice without ranked replay.
- Service outages do not block play. A retried response-lost finalization produces one result; a never-verified result remains explicitly unverified.

## Sources and implementation references

The installed Sites skill's storage and identity references establish D1 bindings, migration flow, anonymous public access, authenticated write boundaries, and server-only runtime secrets. Native Sites configuration remains the owning agent's responsibility. The protocol, scoring, and recovery policy above are project decisions, not claims that Sites provides those game-specific behaviors automatically.

- [Cloudflare D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/): prepared bindings and atomic batch rollback underpin lifecycle compare-and-set writes.
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/): bound request/query sizes and verify actual allocated capacity before launch.
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/): verify HMAC in the hosted HTTP service.

Sources checked 2026-10-22. Hosted configuration, migrations, performance, and live traffic remain later implementation evidence.

## Current server implementation

`TeamRun` receives start/damage/clear events from the authority before victory heals players. It retains opaque run-scoped participant history through departures, counts peak concurrent admitted slots, freezes the timed base result and last-clear Endless tuple, and retries an immutable final snapshot after a write outage. Test authorities never create this writer. Clients cannot submit scores.

`TeamRecordStore` stores immutable competitive counters and paged participant rows in one SQLite transaction. Repeated finalization is idempotent; only the secret-clear badge may increase. Exact BigInt fractions and 49digit damage keys preserve shared competition ranks. GET `/api/leaderboards` accepts mode/difficulty/sizeBand/offset/limit/week; GET `/api/leaderboards/:runId` pages fifty participants. Public client POSTs receive405. Reads are bounded and rate limited. Current-content partitions remain strict; older rows stay on disk and are not silently mixed.

Set `GRAVE_RECORDS_DB` to a retained file; default `data/team-records.sqlite`, `disabled` explicitly disables records. The current server entry point opens it; LAN hosts use `team-records.sqlite` in the app data directory. Current server health still says Practice relative to the unfinished global-service/recovery contract. These boards explicitly say server records. No deployment, storage purchase, shared global acceptance or release is claimed by local tests.
