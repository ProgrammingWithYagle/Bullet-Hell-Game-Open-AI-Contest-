# Last Dispatch: Black Ambulance

Development source2026.10.27-last-dispatch/protocol 30. Existing grade 2+, base health/damage/attack definitions, timer 150, selected art and individual original theme remain. No new identity, sprite sheet or audio is claimed.

## Movement, roads and recovery

A bounded 32-pixel body grid reconstructs connected patrol routes instead of steering at unreachable global sockets. Actual offset bounds, body radius 58, masonry and conservative lava exclusions constrain both route and body-radius charge rays. Gold patrol lines are harmless and get 0.5 seconds of anticipation before 140 px/s travel. Routes are capped at 420 pixels; movement never teleports to the next station.

Last Call warns one fixed road. At half health Second Dispatch reverses patrol direction and warns two headings serially from their actual stops. Every heading gets the authored 1.4-second warning. Charge speed retains authored phase 380/441 and difficulty/mutation/threat/Endless factors, under the existing 600 px/s cap; base impact 18 retains normal boss damage scaling. Relative body/player sweep checks actual travel, once per player per leg. The first active frame cannot hit earlier player movement. New cover clips/stops movement safely. There is a 0.65-second minimum stop between ordinary legs.

After the last dispatch, the driver is exposed for exactly 3 seconds and the existing 1.25 boss-damage multiplier applies. A countdown line follows that authoritative window. Another 1.5-second gap admits retained auxiliary attacks before the next sequence. The owned charge slot is excluded from generic casting: an actual-Game probe caught phantom casts that otherwise blocked later cycles after Baby/Easy assistance. A regression test covers repeated assistance/recovery cycles.

## Advanced forms

Brutal uses 2/3 dispatches in the first/second phases. Each stop creates two door origins inside the clear vehicle footprint. Gapped fans warn at least 1.25 seconds, with 0.35-second echoes and a half-second departure gap after the last release. Each stop actually emits 40 controlled projectiles from a 16-shot base under the 2.5x policy. Crazed keeps those first releases, uses 120 shots under 7.5x and adds alternating crossing repeats after the retained Brutal prefix. The late phase adds a fourth dispatch. All distinct repeated headings warn from creation, with remaining-wave marks; identical rays are deduplicated only visually. No re-aim occurs after marking. Existing 4,000-live-hostile limits and cancellation may reduce actual later releases.

Phase/stagger/assistance/encounter exits clear unreleased owned patrol/road/stop/door/driver work. Flying shots remain under ordinary lifecycle rules. Existing anticipation/charge/stop/driver action poses follow cues; reduced motion keeps frame 0. Walking art is still a separate gate. All fifteen locales route names, phase responses and advanced help into the closed manual guide. Public optional guides remain Baby-only; testing retains all difficulties.

## Corrected baseline and verification scope

The initial report of 99 outside cases was invalid: the scratch probe treated dimensions as coordinates and ignored nonzero origins. Preserve it as a rejected analytical result. The corrected actual-Game baseline samples 216 cases/388800ticks and finds zero actual boundary/masonry violations, with patrol stalls up to 168ticks(5.6seconds). Arena border obstacles already prevented escape.

The redesigned actual-Game probe uses full offset bounds and passes 216 cases/388800ticks, with 57,116 active patrol ticks and zero sampled stationary active-patrol ticks; peaks 16 door-cue groups/192 hostile projectiles. Samples use stationary invulnerable survivors and are mechanics/storage checks, not a played clear, final balance, rendering or performance/capacity acceptance. Separate tests cover connected 72 map/difficulty/phase routes, full warning locks, moving-body damage, first-frame timing, new cover, exact 40/120 emissions with inheritance, recovery, cleanup,15-locale/pose routing, known-local migration and real owner/observer replication. Exact full gate/source/CI/frozen-preview/Wiki receipts follow.

Browser access is currently disabled in Work settings despite user authorization; no retry/bypass. Rendered, personal clear, native-language, listening, physical-device and final human balance review remain open. The full unfinished-game goal stays active.

## Current local verification

Build **2026.10.27-last-dispatch / protocol 30** passes authored content/fifteen locales, TypeScript, **651 tests / 651 pass / 0 fail** and production build. Local snapshot `446c5ad4965d4e9563879c4d73e88e0102d4a3c93de26d3a69868f1e5e7f7541`, runtime source `f23d0938a638652901f4c924c00699351c93b74f4d4b542cbb42c38d0be2a52f`, content revision `850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b`. Testing artifact: 1,685 files/721,568,751 bytes, explicitly configured for matching local endpoint 2570. Separate public target uses 2571. Exact committed-source CI/new frozen previews/Wiki closure follows; older 637-test evidence is historical.

Fourteen new tests cover connected geometry, one/two Standard and additional advanced headings, full warning locks, first-frame and relative swept contact, new cover, exact 40/120 owned door emissions with Brutal inheritance, three-second recovery, cancellation, repeated assistance/recovery scheduling, 15-locale/pose routing, exact known 29 local/profile migration and actual owner/observer replication. The final actual-Game matrix passes 216 cases/388800ticks across all maps/difficulties/selected forms/phases, checking2,745 complete marked-patrol vertices, with 57,116 active patrol ticks and zero sampled stationary active-patrol ticks. Peaks 16 owned door groups and 192 hostiles. These are invulnerable mechanics samples, not personally played clears or rendered/final balance/performance/device acceptance.

The initial outside-arena baseline is explicitly rejected: it omitted origin offsets. The corrected 216-case baseline has zero actual boundary/masonry violations, and measures real patrol stalls up to 168 ticks. Rejected/corrected reports, exact scratch probes and raw correction logs are retained. The current offensive feasibility model has 15,834 rows/zero deadline misses; this remains a design witness, not final balance.

Preservation verifies all 65 other complete boss definitions, base health/damage/deadline/attack definitions/grade, all other catalog fields, all 2,066 production asset blobs/34 Wiki image blobs, unchanged preferences and byte-exact archived predecessor handoffs. Roster stays 66 with 85 new ordinary identities and 51 original quality passes remaining. Browser access remains disabled in Work settings; no retry/bypass or new rendered claim. The full goal remains active.
