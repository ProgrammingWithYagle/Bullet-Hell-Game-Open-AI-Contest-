# Balance and collision corrections

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

Build `2026.10.24-balance-collision`, protocol 13. The full pipeline passes 268 tests, content/fifteen-locale checks, TypeScript and production build. Source snapshot: `6497d3056a6a3608e0e1a9ae96513fa253bc43f139b2bb6cfb36e3cca85d679b`. Runtime-only digest: `51d65c0d11bfdb352f78247ca6633c9d787ba6b40e43b39d9d2a72ea66006c58`.

## Authored health and progression

Runtime health omitted the authored `(base encounter seconds / 120)` term. Restoring it changes a solo Normal 90-second Courier from 1,350 to 1,012.5 HP, while the 120-second Constable remains 1,800. Longer timers also scale HP upward as designed. Brutal doubles HP and independently extends the deadline by 50%; its extra deadline never multiplies health again. Secret growth caps at threat ten and does not inherit Raid's 1.25 multiplier.

The actual-deployment [health audit](../reviews/balance/protocol13-final-health.json) covers sixty identities and 1,740 legal difficulty/roster/variant combinations. The [progression matrix](../reviews/balance/protocol13-final-progressions.json) covers 168 timed and 42 Endless class/mode/difficulty combinations, 2,436 deliberate fixture defeats and 2,226 restored boundaries. It tests legal purchases, idempotence, budgets, one-capstone limits, profile participation and Hard unlocks. These are math/progression fixtures, not player combat wins. Measured damage uptime and final tuning remain open.

## Destructible buildings and exact collision

An active Walking District building was included in the friendly projectile masonry pass. That discarded its weapon shot before weak-point damage could apply. Friendly shots now treat the building as a destructible target; hostiles still collide with its live solid. Destruction refreshes the hostile solid and weak-point lists before the next projectile in the same tick.

The projectile loop now reuses solid/weak-point batches and hit scratch. Large construct groups use a spatial broad phase; nested numeric grid coordinates avoid string query keys. Rotated padded walls retain exact narrow-phase collision and oldest-shield precedence. Regressions cover 14,400 wall trajectories/padding combinations, actual building weapon damage, same-tick shield removal, sack snapshot refresh and eight overlapping constructs.

## Local throughput probes

Real SDK clients and an authoritative server run in separate OS processes on one computer. All seven classes are present. Baseline and stress phases last thirty seconds each; stress replenishes 4,000 hostile bullets. Fixtures keep players invulnerable and the boss at 1e9 HP. Rendered clients: zero.

| Boss | Clients | Baseline p99 ms | Stress p99 ms | Stress max ms | Ticks above 25 ms |
| --- | --- | --- | --- | --- | --- |
| walking-district | 50 | 9.59 | 23.63 | 42.42 | 6 / 900 |
| choir-of-moths | 50 | 8.40 | 18.08 | 39.20 | 1 / 901 |
| city-eater | 16 | 4.15 | 11.34 | 31.79 | 1 / 900 |

The earlier five-second Walking District sample reached 88.66 ms stress p99; the first correction still reached 37.44 ms. Those failures and optional Node CPU diagnostics are preserved in `reviews/performance`. Profiling identified repeated construct collision closures, geometry work and grid queries. The longer Moths probe precedes the final build-stamp/import-order change; the final Walking District and City Eater reports match the latest verified runtime exactly. Different durations and OS/JIT/GC conditions prevent a controlled speedup claim.

All three longer probes keep local stress p99 below 25 ms, with occasional slower ticks still present. This does not establish free-host/WAN/device/sixty-minute endurance or 49 scripted plus one rendered acceptance. Browser control remains disabled; no new rendered claim is made. Full animation, human listening/playtesting/accessibility, language/device review, final damage-uptime tuning, deployed rankings/recovery and desktop release remain open.
