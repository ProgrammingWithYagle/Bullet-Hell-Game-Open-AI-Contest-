# Carrion Courier — Return Address

Build **2026.10.26-return-address**, protocol **22**. This is the third individual original-roster quality implementation, with final human comparison still open. The roster remains 66 identities (65 ordinary plus one secret): 85 additional ordinary identities and 57 original quality passes remain.

Courier is fixed **1--**. Standard health, damage, deadline, attack definitions and threat grade are unchanged. Its existing 28-pose art and original **Undelivered** theme are reused without altering any native image, atlas or audio blob. It keeps two phases divided at half health.

| Form | First Delivery | Return Address | Finish |
| --- | --- | --- | --- |
| Standard | One locked charge | Two sequential locked charges | 0.75 / 1.1 seconds recovery |
| Brutal / Crazed | Two sequential charges | Three sequential charges | 1.2-second warned split fan, then 1.1 / 1.4 seconds recovery |

Every first charge uses its authored one-second tell. Later legs pause for 0.2 seconds, choose their heading from the actual stopped position, then warn for 1.1 seconds. The warning never follows a moving target. Bounds/masonry clip the lane, actual movement uses the shared body collider and fast body/player crossings use relative swept contact. A new obstacle can stop a charge early; the next warning starts at that actual stop. If the intended departure is blocked almost immediately, a clear alternate heading is selected before its tell. No charge steers after release. An advanced third leg can rotate to another actual survivor/decoy target.

The 32-pixel trail follows actual movement, lasts three seconds per section and retires from its oldest end. At most six trails remain. All overlapping trails share one hit per survivor per half second (five base damage per hit). Swept capsule contact covers fast crossings. No zero-length movement creates an invisible trail. Body damage is limited to one hit per target per leg. Existing player invulnerability, scaling and difficulty rules still apply.

The advanced split fan locks its actual final origin and both wings for a full 1.2-second warning. Opening/late phases emit eight/twelve base projectiles for seven base damage; the central half-gap is 0.32 radians. Projectiles use the shared ordinary emission controller: Brutal 2.5x, Crazed 7.5x, with the existing finite queues, delay, cancellation and live cap. This is a gap in that volley, not a promise that unrelated existing hazards disappear. Standard has no dispatch fan. The existing cross volley can fire between routes, after a 1.5-second route cooldown; authored auxiliary casts do not begin during warning, charge, turn, dispatch or recovery.

Delivery marks show completed/current legs; the split fan draws locked wing sectors, individual rays and marked central edges. The boss heading names **First Delivery** / **Return Address**, with persistent phase-response hints and full help in fifteen AI-authored locales. The existing anticipation/charge/hurt/stagger/death poses remain authoritative. Existing phase bell and transition animation continue to respect effects volume and both reduced-motion settings. Bespoke new transformation artwork is future work.

Phase entry resets routes/trails/dispatch/echoes before fresh attacks. Baby/Easy Standard shield assistance and all existing revive/cover/lava/form rules remain. Successful stagger, victory, timeout and wipe clear route state. Protocol21 known issued local Practice saves preserve all recorded form history on migration to22; online/signed recovery is not migrated.

Validation and exact source/CI/preview/Wiki boundaries are recorded at the checkpoint under `reviews/courier-route-2026-10-26/`. Dedicated tests cover real leg counts, actual wall stops and retarget locks, body/trail swept contact and shared hit budgets, dispatch warnings and 2.5x/7.5x emissions, recovery/auxiliary cadence, all maps/difficulties, cancellation, fifteen-locale help, saved form history and real owner/observer replication. Automated geometry/network evidence does not establish rendered, native-language, physical-device, listening or final human balance acceptance. Browser control remains disabled.
