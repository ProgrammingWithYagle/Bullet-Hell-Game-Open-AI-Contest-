# Summoner Formation Keeper

Buy Call and Answer for 1 SP and Set the Line for 2 SP at 3 earned SP. Call two living permanent companions and aim at clear ground. Action 3 spends two Focus and sends the first two nearby living permanent companions to separate posts. Temporary Warders and other players’ bodies stay on their own orders.

The posts face the cast direction. The companions cross the arena under their ordinary collision, navigation, health and slow rules. They stop attacking while taking and holding their posts. Both must settle before the line can catch a shot. Stand behind the line and keep the Summoner within reach.

A projectile that crosses the space between the two bodies from the front can be caught. It deals its ordinary damage to the nearer companion with an unused catch. Each companion gets one catch. Existing collision priority still applies to masonry and earlier contacts. Fields, beams, warned fixed damage, and rear shots keep their ordinary behavior. Losing a body, issuing Gather or another retinue order, or exhausting the two catches ends the line.

## Fittings

- **Walking Rank** replants a narrower line as the Summoner walks. Both companions move to the new posts and must settle again. The movement stays within 155 units of the original cast, with the original duration and catches.
- **Quarter Turn** lets a formed line turn once. Aim to one side and press Action 3, then let both companions reach their rotated posts. The turn costs no new Focus and keeps the original center, duration and remaining catches.

Each fitting costs 2 SP at 5 earned SP and excludes the other. The action lasts up to 165 combat ticks, with a 257-tick recovery from its first cast. A blocked cast spends no Focus. Gather or a new ordinary order ends the current commitment without a refund. Disconnect and encounter changes release the bodies and the cue. Rejoining preserves any recovery still running in that encounter.

Cohort Drive, Homeward Thread and Set the Line can be owned together. Wait for their movement commitments to finish before giving another one. Close Stitch can still mend a stationed companion after your own eligible beacon hit. Running Pack, Closed Ranks and Patient Company retain their ordinary rules. The line and its posts are visible to the party. Readiness, recovery and fitting prompts belong to the owner.

## Automated review

The seeded Normal comparison used 72 runs split across solo and paired Short and Standard play. Each of the 36 pairs used the same purchases, and twelve cases replayed exactly. The active policies issued 302 formation orders, caught 73 hostile shots and replanted 136 times. The comparison recorded 0 wins. [Seeded study](../reviews/summoner-formation-2026-11-23/study-summary.json)

The 27-SP census preserved all 25,008 existing build sets and added 2,972 sets with Set the Line. It exercised 1,433 builds that owned all three Summoner pathways. Protocol 101 restores 16,313 issued protocol 100 Practice fixtures. The full local gate passed 2,960 tests and seven checks. [Build census](../reviews/summoner-formation-2026-11-23/build-census.json) · [Practice binding](../tests/fixtures/summoner-issued100-bindings.json) · [Local evidence](../reviews/summoner-formation-2026-11-23/local-evidence-bindings.json)

## Verified protocol 101 previews

Source **d6ee0dbe7bef5c5ec0e8c3a8d474aa37cf2c50d2**, build **2026.11.23-summoner-formation**, protocol **101**, catalog **140**. The local gate and both GitHub workflows passed 2,960 tests and seven checks. Each frozen audience verified 2,221 files and passed seven checks. Testing uses [5446](http://127.0.0.1:5446/) with backend 2822. Public-audience review uses [5447](http://127.0.0.1:5447/) with backend 2823. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45324614750) · [Draft-PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45324634286) · [Frozen checks](../reviews/summoner-formation-2026-11-23/frozen-verification.json).

Protocol 100 Summoner Bonded Companion is the verified rollback in `output/review-rollback.zip`. All 4,439 restored files matched the archive. Archive SHA-256 `eee7fe163db923d14566799c51f7639d5790177d4afc89ccfc361c11a56f2daf`. All 213 original private SQLite-related files matched their inventory. [Rotation](../reviews/storage-summoner-formation-2026-11-23/retention-result.json).
