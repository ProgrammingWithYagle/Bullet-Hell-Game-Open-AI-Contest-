# Bounded large-squad checkpoint transport

Development source build `2026.10.24-recovery-transport`, game protocol 13. This changes the private signed checkpoint envelope without changing the browser game protocol or enabling deployed recovery/rankings. The issued Windows playtest remains its immutable `52552c0` source.

## Implemented behavior

Small boundaries retain the existing two-field `{body, signature}` envelope. Above 16 KiB of exact serialized UTF-8 bytes, the server emits `{body, signature, encoding: "deflate-raw-v1"}`. The signature binds a fixed encoding context followed by the exact compressed bytes. Verification authenticates before inflating. The uncompressed JSON still contains the original schema, run ID, epoch, sequence, issue/expiry times and strict current-protocol state.

Uncompressed state remains limited to one MiB. Compressed payloads are limited to 46 KiB; base64url plus every permitted registration/event/lookup field fits inside the unchanged 64-KiB HTTP bound. A boundary test uses maximum permitted IDs and safe integers to check all three complete payload shapes. Decoding caps expansion at one MiB, rejects truncated or trailing/concatenated streams, validates canonical base64url and strict UTF-8, and checks exact metadata fields, identity and expiry. Legacy signatures still verify; both envelopes derive the same SHA-256 identity from identical uncompressed bytes.

No participant, skill, inventory slot, vote, RNG value or cached purchase reply is discarded to make a transfer fit. An oversized/incompressible state fails explicitly; the journal latches unavailable and ordinary Practice can continue. Authentication or a locally acknowledged boundary does not give a browser a recovery credential.

## Regression evidence

The developed-squad fixture uses all seven classes, fifty participants, ten deliberately forced clears, real authority purchases, route-normalized 27-point budgets, carried supplies, distinct builds and 2,400 retained purchase replies. It shortens intermissions and does not claim fifty human combat wins. Its approximately 454 KB raw state previously exceeded the writer limit. Compression produces a registration around 60 KB, with the entire lookup response also below 64 KiB. Exact measured bytes and the verified source snapshot are in `reviews/recovery-transport-2026-10-24.json`.

A separate real HTTP process stores that state in file-backed SQLite, exits, starts a replacement, and races two owners against the expired lease. Exactly one owner wins. All fifty builds, progress records and transaction histories survive; fifty successful and fifty rejected purchase requests are retried without charging coins or changing inventory. A previous owner's write fails, the winner writes another boundary and finalizes, and a finalized run cannot be claimed again. The lease clock is advanced in the isolated fixture; this is not natural ninety-second crash timing or hosted D1 evidence.

Security regressions include encoding removal/substitution, invalid signatures before inflation, signed malformed streams, an authenticated expansion bomb, trailing data, unknown fields, invalid UTF-8, expired/invalid clocks, exact maximum-envelope headroom and a deliberately incompressible legal roster. The latter confirms explicit unavailability with no dropped receipts or relaxed transport bound. The first 40-KiB compressed budget failed the developed-squad fixture; that failed run remains preserved separately. The final 46-KiB ceiling is checked against complete request and response bodies.

## Remaining gates

The normal executable still has no configured recovery writer. Participant recovery credentials and stable transport bindings, historical departed participants, individually durable command acknowledgements, hosted D1 races, physical/rendered recovery flows and public verified rankings remain unfinished. Maximum-entropy or very long histories can still exceed the compression/serializer ceilings; those cases need a separately bounded paged transfer rather than larger HTTP messages or discarded idempotency receipts. This change establishes the tested fifty-build HTTP/restart path, not universal fifty-player recovery or live global rankings.

Implementation uses the [Node zlib API](https://nodejs.org/docs/latest-v24.x/api/zlib.html) and its `maxOutputLength`, `info` and consumed-input checks. [Cloudflare documents Node zlib support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/zlib/); actual deployment compatibility must still be validated in the owning service.
