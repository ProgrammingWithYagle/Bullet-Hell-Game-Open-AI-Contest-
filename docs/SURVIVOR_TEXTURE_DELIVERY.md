# Survivor texture delivery

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

Development build `2026.10.25-survivor-delivery`, protocol 13. The game now loads smaller technical copies of the **168 survivor action/run atlases**, containing the same **820 selected poses**. Full production atlases, generated natives, exact requests, source hashes and original-resolution review paths remain unchanged. No character is redrawn, mirrored, cropped within a pose, sharpened or recolored.

| Survivor animation set | Original production files | Runtime delivery copies |
| --- | ---: | ---: |
| Selected poses | 820 | 820 |
| Atlases | 168 | 168 |
| Decoded RGBA bytes from image dimensions | 485,359,616 | 221,347,840 |
| Decoded RGBA MiB | 462.88 | 211.09 |
| PNG bytes | 30,042,299 | 15,225,408 |

The decoded reduction is **54.395%**, or **264,011,776 bytes**. This is theoretical four-channel allocation derived from exact PNG dimensions. Browser image caching, renderer staging, mipmaps and driver allocations can differ; no GPU-memory/FPS or physical-device result is claimed. The broader selected animation set previously implied 786.875 MiB before other static textures. Boss loading and the full scene/device budget remain separate work.

Each selected production cell is resampled as a whole with RGBA Lanczos filtering. The delivery cell is rounded upward in 32-pixel steps to retain at least two texture pixels per displayed pixel, or kept at original size if the source already supplies less. Cells are never upscaled. Frame count/order, columns, fps, world `displayCell` and normalized origin are checked against the exact production contract. Neither crouched nor lying bodies are fitted separately. Resampling necessarily changes derivative pixels and alpha values; their immutable source pixels remain preserved. There is no alpha keying, painted repair, articulated extraction or mirroring.

Engineer north running is a deliberate special case: its original atlas still stores eight poses, but only the first four are accepted by the production library. The delivery texture contains those four selected cells and omits the unused second row. The rejected poses remain in their original source file and provenance, and cannot enter the runtime through this copy. An initial strict generator assumption that every stored row was selected failed on this source; the corrected generator validates selected frame contracts explicitly. Existing partial identical outputs were retained and verified, with no source mutation.

`assets/delivery/survivor-motion-v1/library.json` records input-library hashes, every production/delivery PNG hash, exact dimensions, policy and byte totals. `tools/build-survivor-delivery.py` generates immutable versioned copies; existing mismatched outputs require a new version. `tools/verify-survivor-delivery.py` independently reconstructs every output cell and checks original source hashes, identity, density, origin and totals. All live survivor action and run selectors use the matching delivery cell size. A mismatched or absent contract fails explicitly rather than displaying incorrect frame rectangles.

The scene no longer preloads the obsolete Soldier mirrored-run atlas, Medic prototype combat image or replaced directional strips. New sprites begin on the correct current idle facing. Soldier and Medic menu portraits now use their exact approved front-facing seeds. The local art review still loads production-resolution sources and now includes their retained/new run clips.

Seven comparison sheets under `reviews/survivor-texture-delivery-2026-10-25/` show production and delivery representatives at 56/112-pixel body sizes, with the same foot guides. Assistant review found no material identity/readability loss at those sizes. Independent reconstruction and passing software tests are separate from rendered Phaser transition, device and human acceptance. All seventeen Wiki image bytes remain unchanged, as do the issued Windows archive and frozen one-hour endurance source. [Backlog](IMPLEMENTATION_BACKLOG.md).
