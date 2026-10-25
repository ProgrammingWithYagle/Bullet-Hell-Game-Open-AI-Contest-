# Tank directional action production

Current source build `2026.10.24-tank-actions`, game protocol 13. The Tank now uses twenty new drawn clips across four independent facings: idle (4 frames), stationary firearm attack (4), hurt (2), dodge (6) and downed (6). That adds 88 selected poses to its 32 existing run poses. Across current production the selected motion count rises from 703 to 791. Other survivors and bosses still have incomplete action libraries; this is not full-game art acceptance.

## Identity and production

The existing Tank `four-view-v2.png` and exact normalized direction seeds remain the identity authority: iron mask, short brown hair, rust-red coat, crossed straps, rigid shield in the physical left hand and firearm in the physical right. Each direction/action was generated as a complete strip through the built-in image tool, preserving the exact issued prompt, references and raw result. The north-facing attack's first attempt aimed sideways and was replaced as a whole strip. No poses are manufactured by mirroring, cutting articulated limbs or painting corrections.

Twenty-five native returns are retained, including the rejected north attack and four superseded dodge variants. The generator previews showed colored RGB that was actually hidden under zero alpha. A premature background rejection caused unnecessary full-sheet edits. The native white/game-floor composites established the original strips' clean alpha; their quieter original palette is selected. That decision and all attempts remain explicit in `docs/survivor-actions-2026-10-24.json`. Model/quality controls were not reported by the built-in tool and are not invented. Exact requests retain their issued absolute paths, with additional project-relative input bindings and hashes for portability.

Packing partitions every native RGBA pixel, uses one uniform scale per whole strip calibrated from an upright frame, and aligns a measured ground contact to a padded 384-pixel cell. Crouched and fallen poses are not enlarged to fit their individual bounds. Source alpha is preserved. `python -X utf8 tools/verify-survivor-actions.py` independently reconstructs every atlas byte from its immutable native crops and verifies all 25 sources, request/reference bindings, scale and alpha padding. Native/contact sheets at 56/112-pixel character scale have been inspected. GIFs and receipts are in `reviews/survivor-actions-2026-10-24/`.

## Runtime behavior

`SurvivorActionClock` observes the existing authoritative view; it does not change combat rules or network protocol. A real ammo decrease starts stationary firing, and sustained patches do not repeatedly reset an unfinished cycle. A health loss cancels the interrupted shot and plays hurt/recovery. The original directional run remains available while moving. A real dodge takes its facing from movement and fits all six poses within the authored seven-tick interval. Downed movement derives its elapsed time from the existing replicated timer, locks the fall direction and holds the resting pose; elimination stays resting and revival clears obsolete action cues. Initial/late observations, encounter changes, a new run and clock rollback do not inherit stale cues. Waiting participants retain the existing presentation.

Reduced motion uses stable representative poses instead of cycling, including the final resting/downed pose. The earlier art review tool now lists these clips for pause/frame-step inspection. Existing Tank run art and the other six characters' presentation remain their current source. These are renderer integration and state-selection changes, not new power, hitboxes, invulnerability or movement rules.

## Verification boundary

Seven new tests cover source provenance, an actual authority-fired shot, sustained-fire snapshots, hurt interruption, all six frames during a real dodge, late fall observation, resting hold, revival, reduced motion, missing players and reset isolation. Independent native/atlas reconstruction is separate from those state tests. The complete pipeline's exact source snapshot is in `reviews/runtime-verification.json`.

Rendered Phaser transition review is still open because browser control remains disabled in Work settings. No substitute browser-control path was used. Native image/contact inspection, tests and a green build do not establish final animation feel, physical-device FPS or human acceptance. The published Windows development archive remains bound to its earlier immutable source `52552c0`; it does not automatically acquire later Tank/recovery changes.
