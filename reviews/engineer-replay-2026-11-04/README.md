# Engineer replay polish

Candidate build2026.11.04-engineer-replay-polish, protocol54, unchanged contentd7aea7… . Base metadata52212302 binds playable source7f5cdac6/1,375tests; its exact source and metadata push/PR CI pass.

An actual autonomous Normal combat/restore comparison exposed a missing fresh-encounter primary reset. A one-shot diagnostic reproduced an uninterrupted player carrying fractional fire recovery while a restored boundary defaults to a ready primary. New encounters already refill magazines, clear reload and specialist work. The deliberate fix readies that refilled primary at the same boundary, without adding save fields or resetting Q/E/ultimate recovery.

regression-before-fix.log records twelve failing class-primary cases and one passing cooldown control. focused-after-fix.log passes60checks: all twelve classes across four actual intermission save phases, identical first-second held-fire/projectile/kit outcomes, Engineer recovery preservation and existing rapid-fire/bow/alchemy/sword/checkpoint coverage. Only enemy completion is injected in this scoped regression; naturally stepped rewards/choices/intermissions remain authoritative. It is not a combat clear.

Full gate, exact-source CI, fresh matching review transport/worker evidence and a new same-candidate actual-combat baseline/restore comparison follow separately. Do not reuse historical exit-polish timings or previews as this source acceptance. No catalog, prices, assets, localization, protocol, acquisition or migration change. Other classes, the meaningful weapon/shop overhaul and Campaign remain queued. Human/rendered/device/native-language/listening/motion/literary/final-balance acceptance stays separate. No browser automation/subagents, deployment, cleanup or private upload.

Gate sequence: full-gate01.log passed1,388tests. Before committing, review tightened the new regression samples to immutable per-tick shot/kit copies. focused-final.log passes60checks with that final test revision; full-gate02.log is the exact-source final gate. The runtime fix is identical between the two local gates. Both logs are retained with distinct provenance.

Final full-gate02.log passes all1,388tests, TypeScript, authored content/locales/story,144early-Campaign cases, production build and71encounter/300survivor/60companion atlas contracts. Exact raw log and runtime/snapshot fingerprints bind in source-verification.json. Catalog/protocol54/ownership definitions remain exact; only fresh-encounter primary readiness and its regression coverage change gameplay.
