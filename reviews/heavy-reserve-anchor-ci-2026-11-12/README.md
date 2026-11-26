# Reserve Anchor verification

Development source **6a75d36a32875c71a47a139dd32426612cd8c59d** uses build **2026.11.12-heavy-reserve-anchor**, protocol **75** and catalog **68**. The local gate and both exact-source workflows passed 2,322 tests and all seven checks. The testing and public review clients each bind 2,064 files and passed native HTTP plus six earned Reserve Anchor cases.

[Source binding](source-binding.json), [exact CI](source-ci.json), [frozen review](frozen-verification.json), [retention rotation](../reviews/storage-reserve-anchor-ci-2026-11-12/retention-result.json).

Two workflow attempts on the original Reserve Anchor source ended at the 20-minute limit for each event. The next commit raises the test-file concurrency floor from four to six. The runtime and test source hashes match. [Original attempts](../heavy-reserve-anchor-2026-11-12/README.md).

The first full gate passed 2,321 of 2,322 tests. The sole failure was the Flak test's stale Heavy catalog expectation. The correction updated 17 to 18 with identical gameplay source. The original focused runs also retain failures for a profile history beyond the fifty-entry limit and an invalid synthetic Short save. The revised Short save earns both clears. [Raw evidence](raw-evidence-binding.json).

[Build census](build-census.json), [seeded Short runs](seeded-short.json), [controlled geometry](geometry.json). Human, rendered, device, native-language, listening, motion and final balance review remain open.
