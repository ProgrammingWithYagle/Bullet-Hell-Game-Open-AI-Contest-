# Summoner Bonded Companion

Buy Call and Answer for 1 SP and Mending Bond for 2 SP at 3 earned SP. Mending Bond reduces permanent retinue capacity by two, from four to two at entry. Capacity upgrades can still raise the smaller company to four. Call Retinue keeps its ordinary summon types and placement. Open Muster still calls temporary Warders.

Press Action 2 to spend two Focus and bind one living, wounded permanent companion. The bond picks the lowest remaining health percentage among eligible companions, with retinue slot as the tiebreaker. The bond lasts up to four combat seconds. Recovery lasts 190 ticks from the cast.

- **Mending Bond** asks you to put a beacon mark on an enemy and stay within 190 units of the companion with an open line of sight. Its next actual damaging attack on that mark restores up to 20 companion health. A Lanternwing shot has to reach the mark.
- **Close Stitch** narrows the leash to 108 units and lets you complete the repair with your next damaging beacon hit on the same mark. It restores up to 14 companion health.
- **Homeward Thread** calls the wounded companion back from up to 240 units away, regardless of the mark. It pauses its attacks, takes a physical route around cover, and recovers up to 18 health if it reaches you. The other companions continue their orders.

Each fitting costs 2 SP at 5 earned SP and excludes the other. Loss, a broken leash, Gather, a new ordinary order, or a missed window ends the bond. A marked bond also ends if the mark changes, expires, or is lost. A failed cast costs no Focus. A bond that was already paid keeps its cost and recovery. The tether appears to the party and the action status belongs to the Summoner.

## Retinue interactions

Cohort Drive stays on Action 1 and requires two living permanent companions. At the starting bonded cap, either companion falling removes that option until Call Retinue can fill the vacancy. A damaging Cohort attack can complete Mending Bond. Finish a march, Relay opening, or Homeward return before giving the conflicting movement command. Gather and ordinary retinue orders clear both commitments.

Running Pack still calls Hounds with its ordinary health and speed trade. Closed Ranks keeps Gather's arrival armor. Patient Company keeps its temporary Warder duration and damage trade. The bond repairs companion health. It leaves attack damage, poison, slowing effects, player health, and fixed hazards to their existing rules. It ends at encounter transitions and releases the selected entity on disconnect.

## Automated review

The 72 Normal runs included 36 pairs that bought the same items. Twelve runs replayed exactly. The active policies recorded 235 casts and 186 repairs, with 114/74 for Mending Bond, 57/49 for Close Stitch and 64/63 for Homeward Thread. Each pair of numbers gives casts and repairs. The comparison recorded 0 wins across Short and Standard. [Seeded study](../reviews/summoner-bond-2026-11-23/study-summary.json)

The 27-SP census preserved 24,114 tracked builds and found 894 with Mending Bond, including 645 with Cohort Drive. Protocol 100 restores 15,416 issued protocol 99 Practice fixtures. The local release gate passed 2,945 tests and seven checks. [Build census](../reviews/summoner-bond-2026-11-23/build-census.json) · [Practice binding](../tests/fixtures/summoner-issued99-bindings.json) · [Local evidence](../reviews/summoner-bond-2026-11-23/local-evidence-bindings.json)

## Verified protocol 100 previews

Source **0a9a5c083e844d431f751ea38fd5fddb59950da7**, build **2026.11.23-summoner-bond**, protocol **100**, catalog **137**. The local gate and both GitHub workflows passed 2,945 tests and seven checks. Each frozen audience verified 2,218 files and passed seven checks. Testing uses [5444](http://127.0.0.1:5444/) with backend 2820. Public-audience review uses [5445](http://127.0.0.1:5445/) with backend 2821. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45308910957) · [Draft-PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/45308930077) · [Frozen checks](../reviews/summoner-bond-2026-11-23/frozen-verification.json).

Protocol 99 Summoner Cohort Commander is the verified rollback in `output/review-rollback.zip`. All 4,433 restored files matched the archive. Archive SHA-256 `7ca02d4f72def040db9916458bba2937bd429b96b86be73f68a216dd4a990ad7`. All 213 original private SQLite-related files matched their inventory. [Rotation](../reviews/storage-summoner-bond-2026-11-23/retention-result.json).
