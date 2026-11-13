# Midnight Circuit — services of the dead

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

The playable roster now contains 23 distinct bosses. Midnight Circuit adds fourteen identities in a separate pool: eleven regulars and three finales. A run completes nine different regular fights and a different route finale. Quarantine keeps its own disjoint nine-boss pool. Endless can draw all 23 implemented identities before repeats become Brutal. The larger Endless-exclusive schedule and the remaining 37 identities are still in development.

All seven classes can play the ten-fight route locally and through authoritative Colyseus rooms. Skill income follows `3 + floor(24*j/9)` before fight `j+1`, reaching 27 before the finale. Base cumulative coin income reaches 2400 with the same total route budget as Quarantine. The authored ten-step threat and arena sequence now drive real encounters. Opening boss selection remains an explicit rehearsal override; ordinary contracts conceal future identities and reserve finales for the last vote.

| Identity | Actual signature and counterplay |
| --- | --- |
| Cradle Matron | Up to three destructible 100-HP nests summon two real patients each six seconds, with an 18-patient cap. Destroying a nest stops its spawning. |
| Mold Alchemist | Fixed landing circles give 1.3 seconds to leave before five-second mold pools damage and slow. The landing positions do not chase survivors. |
| Bellringer | Actual expanding rings have a 35-degree opening that rotates 30 degrees between casts. The open wedge is both rendered and collision-safe. |
| Stitchwright | A warned tether can miss, be shot for 45 HP, be broken by leaving its 350-pixel reach, or be removed through a one-second neutral rescue interaction. It slows walking but does not disable dodging. |
| Glass Surgeon | Four 35-HP needles form a polygon with a real missing edge. Breaking a needle cancels only its connected sides. |
| Ash Baker | Three slow loaves announce their two split directions. Each stops on cover and splits once into two actual projectiles after 1.5 seconds. |
| Sluice Keeper | Three warned channels apply 65-pixel/second side currents without dealing damage. Dry strips remain. Client prediction uses the same forces and collision. |
| Last Stationmaster | Two track lanes alternate a crossed closed signal and an open arrow. A real swept carriage traverses only the closed track. |
| The Lamplighter | Three large outlined candle-shadow pockets protect against the warned outside pulse. Color and sound are not required to identify them. |
| The Anatomist | Two marks follow only for the first 0.7 seconds, then lock their last positions before a 1.6-second caliper snap. |
| Plague Gardener | Four 70-HP roots grow narrow vine strips. A cut strip heals each survivor once for 10 HP; shooting a root opens its own strip early. |
| Grave Choir | Three separately drawn casters have independent health and locked beams offset by 0.45 seconds. Part damage transfers once to shared boss health and team credit. Defeating one singer cancels that singer's beams. |
| Red Abbess | Two sanctuaries move during the tell before an outside-in wave. Any survivor can hold either pocket for 1.2 seconds to neutralize it. A full unneutralized wave finishes before another begins. |
| Vesper Judge | A long tell marks one actual half of the current arena; the other stays open. The struck half alternates on successive casts. |

All identities execute three Normal/four Brutal phases, existing Accord objectives, rewards, deaths, deadlines and cleanup. Brutal doubles boss health and damage and extends the deadline/bounty as previously authored. Auxiliary beams now have locked line geometry and spiral attacks release timed sequences of real bullets. Weak points take finite damage and do not also accept the same primary projectile as an unrelated boss hit.

Protocol 9 adds identities, route state and signature cues. Bounded local protocol-4 through 8 Practice saves preserve only their actual old class, map, mode and boss roster. Old clients and signed online saves remain strict. No normal-runtime durable recovery or verified ranking service is claimed.

## Art and music evidence

Eighteen exact built-in imagegen requests and their native PNGs are preserved in `docs/midnight-art-2026-10-24.json`, including the superseded Sluice release with a detached wheel. Seventeen selected sheets supply fourteen eight-pose boss clips, an eight-pose individual Choir singer, an eight-pose ordinary patient, and eight signature props: 128 actual drawn poses plus eight props. Cropping, a common scale per clip and transparent padding are the only processing steps. The independent auditor reconstructs every shipped pixel and verifies source/atlas hashes, full native alpha and visible padding.

Fourteen original scores add Cradle Ledger, Glasshouse Rot, The Late Warning, Needle Debt, Aperture, Oven at Dawn, Watermark, Last Departure, Unlit Wick, Lecture in Bone, Green Afterlife, Three Names, Scarlet Vespers and The Open Half. Each has its own motif, arrangement, instrumentation, meter and harmonic plan. All 23 bosses select their own complete loop. The prior nine PCM masters are retained byte-for-byte. Editable synthesis/scores and clipping/DC/mono/seam checks are included; listening and final perceived mix remain open.

Current automated results are recorded in `reviews/runtime-verification.json`. New tests cover each counterplay, every Normal/Brutal phase, ten-fight progression and normalized budgets, shared damage, long-lived minion caps, bounded old saves, and all fourteen identities over real WebSocket rooms. Native art/size review and source tests do not establish final rendered motion, human balance/feel, physical-device, WAN, free-host or endurance acceptance.

Next development continues with the twenty-identity Black Bell Pilgrimage, Raid and Endless/secret encounters, then the remaining profile, recovery/ranking, complete action art, device and Windows release scope. The game is not complete. PR 14 stays draft and protected main is unchanged. The old public protocol-4 Site is separate from current source/Wiki publication.
