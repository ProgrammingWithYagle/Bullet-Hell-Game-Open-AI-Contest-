# Grand Raid runtime

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

Build 2026.10.24-raid uses protocol 11. Seven Raid bosses bring the playable roster to 50. The route supports solo through sixteen players, two unique regulars and one reserved finale, threats 4/7/10, skill budgets 12/20/27, income budgets 600/1400/2400 and a 1.25 health multiplier. Maps rotate through Ossuary Works, Bell Foundry and Crown Crypt.

- **Chain Colossus:** Break any 110-HP anchor pylon to stop the three-second pull and open four seconds of vulnerability. Outer lanes remain clear.
- **Ossuary Leviathan:** Three ribs expose in sequence for three seconds each, transferring one 1.5x hit. The long body curves through the arena and respects cover.
- **Bell Triplets:** Three separate keepers share boss health. Deal 95 base damage to the highlighted keeper to interrupt its beam; a 185-pixel gap remains.
- **Quarantine Heart:** Hold F at a neutral valve for 1.5 seconds to disable its hose, reverse 120 damage and open a four-second vulnerability.
- **Crown Procession:** Four visible attendants follow a moving throne. Defeat any attendant to stop it for five seconds, or use its scheduled four-second rest.
- **City Eater:** Leave the two warned bite lanes through the 240-pixel corridor. Break either 120-HP core cover to expose a 1.5x weak point.
- **Saint of the Last Breath:** Move into either shelter to cancel inhalation; avoid the three later slow rings of actual projectiles.

All seven signatures execute Normal and Brutal phases through shared authority. Prediction uses the same bounded pull calculation. Rib/core transfer avoids duplicate body credit. Local protocol-10 saves migrate within their former content bounds; online/signed state stays strict.

Art adds 72 drawn poses and eight props from ten selected sheets; all twelve native returns and exact requests remain preserved. See docs/raid-art-2026-10-24.json and reviews/raid-2026-10-24/independent-art-audit.json. Seven original music tracks retain the previous 43 PCM masters.

Verification includes actual full route budgets, all Normal/Brutal phases, neutral interactions, damage credit, prediction, save limits, real WebSocket launch of each identity and a sixteen-client room admission test. Inspect reviews/runtime-verification.json for the complete current check result. This is automated admission coverage, not final sixteen-player WAN/endurance/device acceptance. Human playtesting, balance, full actions/facings and listening remain open. Ten further boss identities and the full Endless/secret rules remain unfinished.
