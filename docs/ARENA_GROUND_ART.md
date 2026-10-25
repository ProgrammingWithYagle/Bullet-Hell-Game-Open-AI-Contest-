# Five new arena ground paintings

Build `2026.10.25-arena-grounds`, protocol 13. All six maps now have painted ground. The existing Gatehouse painting stays byte-identical; five new opaque floor paintings replace the other maps' plain fills and repeated line grids. The live scene and setup map previews use these materials at the existing playable footprints. Cover props, cover outlines, boss/player spawns and collision are unchanged.

| Arena | Existing playable dimensions | Ground identity |
| --- | --- | --- |
| Gatehouse | 1600 × 1000 | Original walled stone courtyard and fountain painting |
| Triage Yard | 1600 × 900 | Grey-green flagstone and worn hospital-courtyard limewash |
| Ossuary Works | 1300 × 1000 | Ash-grey limestone and flush dark maintenance plates |
| Sunken Chapel | 1400 × 920 | Damp slate and faded flush mosaic remnants |
| Bell Foundry | 1500 × 850 | Warm oxidized iron and refractory stone |
| Crown Crypt | 1240 × 880 | Dark blue-grey slabs and faint tarnished inlay |

These five paintings contain only walkable ground material. They do not bake beds, machines, altars, tombs, blocking walls or hazard graphics into unrelated positions. Existing props and cream collision outlines remain placed separately from the actual rectangles. Ground images use depth -1 above a separate backdrop at -2 and below cover/hazards/survivors. This also prevents the old opaque fill graphics from hiding the new artwork. The Gatehouse's original display alpha and source image are retained.

`assets/production/arenas/library.json` binds all six images to their exact bounds. Five complete native returns, exact built-in image-generation prompts and the Gatehouse style reference are preserved under `assets/production/generated/arena-ground-2026-10-25/`. `tools/pack-arena-ground.py` performs one centered exact-aspect geometric crop followed by a proportional LANCZOS resize; it does not repaint, stretch aspect, grade color, repair alpha or mirror pixels. Every full native remains preserved, and the smallest retained crop is 98.0954% of its original area. `tools/verify-arena-ground.py` independently reconstructs every delivered RGBA pixel and verifies hashes, opacity, geometry and prompts.

The five new one-pixel-per-world-pixel images imply 25,576,800 decoded RGBA bytes (24.39 MiB); all six grounds imply 31,870,048 bytes (30.39 MiB). All six preload together. These image-dimension estimates exclude drivers, staging, other textures and actual GPU/device performance. They add visual content and do not claim an overall scene-budget reduction.

Three regressions cover exact native/atlas/committed-geometry bindings, every map switch in both directions, unchanged collision/spawns and fail-before-queue missing-URL handling. TypeScript and the 331-test full pipeline are separate from rendered acceptance. The static comparison combines these paintings with actual collision outlines and spawn markers at one scale; it is not a game capture. Native artwork and static-layout inspection are assistant reviews. Final projectile readability, physical-device behavior and human evaluation remain open while browser control is disabled.

This completes the floor-material pass. Raised arena-set variety, effects and full rendered scene polish remain part of the wider art scope. [Backlog](IMPLEMENTATION_BACKLOG.md) · [Wiki material comparison](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Art-Gallery#arena-ground-paintings).
