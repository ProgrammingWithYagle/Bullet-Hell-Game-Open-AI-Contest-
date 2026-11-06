# Fixed boss threat classifications

Current continuation: [difficulty rules and phase pacing](DIFFICULTY_AND_PHASES.md), protocol 16. Historical build descriptions and frozen previews below retain their own issue state. Hellish now forces Brutal, including a selected Standard opener.

Build `2026.10.25-fixed-threats`, protocol 14. Every one of the sixty existing identities has an explicit authored classification in `src/shared/boss-threats.json`. Hollow Constable is `1+`, high tier Normal; Bell Triplets are `3--`, bottom tier Predator. A boss keeps its classification across encounters, campaigns and saves. Future balancing can revise a versioned classification; it is never rerolled by card position or encounter number.

| Suffix | Meaning |
| --- | --- |
| `--` | Bottom tier |
| `-` | Low tier |
| none | Mid tier |
| `+` | High tier |
| `++` | Top tier |

Brutal has a separate `B` marker: `1+ B` is the Brutal edition of that same boss. `>10` is reserved for the above-Calamity secret category, currently The Uncounted. It remains excluded from ordinary offers and retains its separate consent/campaign-bank rules. Global difficulty, player-count health scaling, Raid's health modifier, mutations and Endless cycle pressure remain explicit separate systems; they do not rename a boss's intrinsic grade.

Contracts now derive grade, subtier and bounty from the selected identity. The old hidden card-position risk is zero and no longer adds health, bullets or speed. Ordinary base bounty is `1 + 0.06*(level-1) + 0.04*(subtier+2)`, with the existing 1.75 Brutal multiplier. The maximum is 2.975. Normalized base income and skill budgets remain unchanged; earned bounty premiums add coins, while late arrivals receive only their unearned-boundary base catch-up. Purchased coins are not refunded.

Solo base health is `1800 * 1.22^(min(level,10)-1) * (1+0.08*subtier) * timer/120 * healthFactor`, followed by existing global modifiers. Generic cast count/speed and boss damage also receive declared fixed-grade pressure factors; telegraph durations and signatures retain authority. Constable's initial fan now has eight bullets at 163.2 world pixels/second and 12.3 base damage, with the same 26-tick tell. These are initial classifications and pressure rules, not a claim that the desired phase/mobility redesign or final human balance is finished.

The five-, ten- and sixteen-fight campaigns now select from shared authored ordinary identities near their target rating. Primary route remains an affinity for close choices rather than a fence that silently rescales the same few bosses to every level. Ordinary campaigns retain regular/finale roles. Raid normally retains its regular pool and reserved three finales; an explicit Practice opener that consumed a finale can use an uncleared finale substitute rather than repeat an identity. Every actual deployment keeps the chosen fixed grade.

Endless retains seeded bags, the twelve-completion repeat guard and exclusive fights every fourth slot. Early offers prefer appropriate ratings. Mature offers reserve one age slot so rating preference cannot indefinitely starve an old bag member; the other choices prefer the current target rating. A reproduced initial starvation and Raid-reservation error were corrected, with failed and passing outputs retained. All 59 ordinary identities remain reachable; concealed cards still omit boss IDs in both real clients and offline views.

Protocol 14 gates new online rules. Bounded local Practice migration covers protocol 13 and older supported versions: grade fields are canonicalized at a boundary, while version-13 money, personal progress, run identity, extension and history are retained. Current boundaries reject forged grades, positional risk and nonfinite subtiers. Signed online restore remains strict. Earlier frozen manual builds and the issued Windows development archive stay at their own protocol/source identities.

The current analytical feasibility model checks 14,070 class/route/difficulty/boss rows with no modeled deadline misses. It is an offensive feasibility witness using stated uptime assumptions, not human survival or final difficulty evidence. Previous tools/CSV/review are preserved before the fixed-grade model. Seven new regressions plus real two-client assertions cover all 60 profiles, 1,800 openings across five modes and six difficulties, actual graded projectiles, concealed offers, rewards, migration and tamper rejection. The complete pipeline has 356 tests. Rendered/device/native-language/human balance review remains open.

Ten ordinary levels times five subtiers times three distinct identities requires **150 ordinary bosses**, plus secrets. The current roster has 59 ordinary identities and one secret, so its exact coverage audit requires **91 additional ordinary bosses**. Brutal editions do not count as new identities. This stage adds no new boss identities. Stronger distinct phase changes, movement/attack redesign, ability-changing class upgrades, the optional branching skill-tree view and original roster expansion remain active development.
