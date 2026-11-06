# Bounded boss texture loading

Development build `2026.10.25-boss-texture-cache`, protocol 13. The scene now preloads eight shared encounter atlases and exact frame-zero identity references for 57 bosses. Full animation atlases are requested only for the currently replicated boss, with at most two retained. The renderer shows that same boss's reference frame while its full atlas loads or retries; origins, world size and all authoritative timing/geometry remain unchanged. No future concealed schedule is inspected or prefetched.

| This encounter texture set | Decoded RGBA bytes from PNG dimensions | MiB |
| --- | ---: | ---: |
| Previous 65 full atlases | 306,708,480 | 292.50 |
| Eight always-loaded shared atlases | 37,748,736 | 36.00 |
| Fifty-seven exact identity references | 33,619,968 | 32.06 |
| New startup subtotal | 71,368,704 | 68.06 |
| Two largest dynamic full atlases | 9,437,184 | 9.00 |
| New maximum retained-cache subtotal | 80,805,888 | 77.06 |

The retained-cache subtotal is **73.6538% lower**. These are exact four-channel size estimates for this set only. Constable/Warden, survivors, environment and other textures are outside the subtotal. Browser/CPU caches, GPU staging, mipmaps, driver allocation and device FPS can differ. This does not certify a physical-device budget.

The always-loaded set is rat, infirmary minion, choir voice, Regent, crow, bell keeper, throne attendant and moth. Regent also appears as a historical civic figure in other directors, so its atlas remains available. Keeping these dependencies avoids missing supporting actors during raid, choir, memory and minion scenes. The 57 reference PNGs are complete first-cell RGBA crops from the exact original production atlases, with no redraw, rescale, mirror, color or alpha edits. All native and production hashes remain unchanged. `assets/delivery/boss-loading-v1/library.json` binds input metadata, source/reference hashes and the resource arithmetic; `tools/verify-boss-loading-references.py` reconstructs every reference pixel independently.

`BossTextureCache` allows one load in flight. Repeated snapshots cannot enqueue duplicates; rapid changes keep only the latest desired request, and stale completed textures are released. Before a new load starts, the least recent retained texture is evicted if needed to reserve a slot. A failed load keeps its correct preloaded identity visible and waits five seconds before retrying; a finite monotonic clock prevents a retry loop. Shared actors, Constable and Warden are never sent through this cache.

Phaser requires live game objects to release a texture before `TextureManager.remove`. The eviction helper first stops and rebinds a still-referencing boss sprite to its own identity, then removes the old atlas. Scene shutdown marks the sprite path inactive, disposes cached textures and cancels pending listeners/promises; late completions cannot revive the cache. Diagnostics expose requested, loading and retained IDs plus failed-load count. No preload or cache operation changes gameplay state.

Eight tests exercise the actual startup planner, exact identity/contract hashes, fallback selection, one-in-flight coalescing, cycling every deferred boss, retry boundaries/nonfinite clocks, shutdown/late completions and release-before-destroy ordering. The installed Phaser loader, sprite and texture types compile, and local library source was checked for completion/error/shutdown semantics. These software tests and pixel checks do not constitute rendered slow-network, physical-device or human acceptance. The existing seventeen Wiki image bytes, issued Windows build and frozen one-hour throughput measurements retain their separate source identities. [Backlog](IMPLEMENTATION_BACKLOG.md).

**Successor:** [Opening boss defeat motion](OPENING_BOSS_DEFEATS.md) adds seven sixteen-frame atlases and seven settled fallbacks. The v1 figures above describe their original build; the current v2 encounter subtotal is 72.40625 MiB at startup and at most 93.65625 MiB retained. Both manifests and issued proofs remain preserved.

The later [Courier and motion-continuity stage](MOTION_CONTINUITY.md) preserves these issued files and adds twelve Courier poses plus exact cropped identities. Its current encounter estimate supersedes this stage's runtime subtotal.
