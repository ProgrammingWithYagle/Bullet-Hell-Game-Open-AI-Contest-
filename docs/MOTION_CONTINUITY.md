# Courier motion and survivor animation continuity

Build `2026.10.25-motion-continuity`, protocol 13. Carrion Courier gains twelve complete idle, hit-recoil and Accord-stagger poses from three actual built-in whole-strip returns. Its original eight charge/action poses and eight defeat poses remain pixel-for-pixel unchanged. A single 384-pixel-cell, 28-frame atlas preserves the previous origin and world size. Exact prompts, complete natives, input references and independent reconstruction are preserved in the production/review folders.

Defeat has highest priority and retains its world-clock one-shot. A successful four-second Accord plays one upright stagger entry, then only three weak poses loop until the authoritative end. Actual charge cues take priority over hit recoil; drawing lead cannot show release before the cue tick. Hurt completes four poses at twelve fps; breathing loops four poses at four fps. Reduced motion holds readable states. Original charge mechanics, damage and rewards are unchanged.

The human reported visible survivor state switching. The old scene determined running from target-to-sprite distance on every draw. Local prediction updates at thirty Hz while rendering may run at sixty Hz: after reaching each predicted point the next draw selected idle, then the next movement point selected run. The scene now records actual observed target movement with a bounded 100-ms grace interval. This also keeps remote twenty-Hz patches from creating idle flashes between updates. A ten-degree directional hysteresis prevents slight diagonal aim jitter from flipping sheets. Deliberate turns remain immediate, and one-shot attack/hurt clips retain their onset facing. This changes presentation only; aim, movement, hit tests, input and authority are unchanged. Static and software fixtures do not establish human-perceived smoothness.

All 57 first-frame identities and seven settled references now use complete tight RGBA crops with sixteen-pixel margins. Every original full cell can be reconstructed exactly, including hidden RGB. Each crop has its own origin and display width/height, preserving the original world transform through loading, retry and eviction. A retired sprite is rebound and resized before destroying the full texture. Only defeat frames 8–15 select a corpse fallback; new living Courier frames 16–27 use its live identity. The cache still keeps at most two full dynamic atlases and one load in flight.

| Encounter-only decoded RGBA estimate | Current subtotal |
| --- | ---: |
| Unbounded 65 full current atlases | 334 MiB |
| Shared eight atlases plus 64 cropped identities | 48.81033 MiB |
| Two largest full dynamic atlases | 28 MiB |
| Maximum retained subtotal | 76.81033 MiB |

Static reference bytes fall from 38,174,720 to 13,432,608 (64.8128% less). The larger Courier atlas is included above. These are dimension estimates excluding Constable, Warden, survivors, arena, driver/CPU caches, staging and actual device/FPS behavior. Previous v1/v2 artwork and receipts stay immutable.

Six Courier/cache regressions and four survivor-continuity regressions join the full 346-test pipeline. Actual normal/Brutal charges, friendly-shot recoil, successful Accord, world-time death, one-time rewards and all cropped-identity world anchors are covered. Seven-class thirty-Hz simulation/sixty-Hz drawing fixtures reproduce the old run/idle alternation and verify the new continuity; twenty-Hz remote cadence, stop bound, death/reset, deliberate turns and one-shot facing are separate checks. Independent Python verifiers reconstruct all twelve new poses, sixteen old poses and all 64 static crops. No new browser-rendered/device/human motion approval is claimed.

The human found bullets and warning zones clear enough on all maps in the previous Normal/Hollow Constable playtest. That limited observation is recorded separately. Unwanted beds, more varied layouts, Soldier/Medic selection portraits, fixed five-subtier threat classifications, stronger boss phases/movement/attacks, ability-changing upgrades and an optional branching tree remain active work. The existing frozen arena playtest at port 5174 is unchanged.
