# Opening-route boss defeat motion

Build `2026.10.25-opening-defeats`, protocol 13. Carrion Courier, Ratcatcher, Quarantine Clerk, Tollkeeper, Chain Marshal, Gate Widow and Black Ambulance now have dedicated eight-pose defeat sequences. Alongside Constable and Warden, all nine opening-route identities have a settled defeat presentation. Fifty-six new complete poses are selected from seven whole sheets; eight actual native returns are preserved because the first Ambulance layout joined two complete groups and was regenerated in a roomier layout.

| Boss | Defeat identity |
| --- | --- |
| Carrion Courier | Cap, coat and strapped satchel remain through the side collapse |
| Ratcatcher | Hood, stitched sack and complete hooked staff settle together |
| Quarantine Clerk | Ledger and stamping tool stay with the falling official |
| Tollkeeper | The robed body lowers beside the intact wheel |
| Chain Marshal | Both ring weights and chains slacken to the floor |
| Gate Widow | Veil, gown and attached iron frame tilt and settle |
| Black Ambulance | Horse folds down while the intact coach and driver settle |

Each new sixteen-frame runtime atlas starts with the original eight action cells, retained pixel-for-pixel, followed by eight new collapse poses. A single upright-calibrated scale applies throughout each new strip; fallen poses keep their natural low/wide shape and a fixed horizontal ground origin. Tollkeeper uses a 448-pixel cell with symmetric padding; the other six use 384. The padded origin/display size preserves the exact original live world transform. No original native, v1 action atlas or its production library is overwritten. The combined contract and exact requests are in `assets/production/motion/opening-defeats-library.json` and `docs/opening-defeats-2026-10-25.json`.

The renderer starts defeat only after zero health and a recorded authoritative `defeatedAt`. Frames 8–15 run once at eight fps on world time because combat time pauses during rewards/votes. The final pose holds; later hurt, cast or stagger cues cannot restart it or issue another reward. Reduced motion holds the settled pose. Living action selection stays unchanged. Stagger transparency now applies only while the boss is alive, avoiding an indefinitely faded corpse when a kill occurs during stagger.

The two-entry cache still loads one complete atlas per current/recent boss, with one load in flight. Fifty-seven exact first-frame identities and seven exact settled images are preloaded. An unavailable collapse atlas uses its own settled image; a live boss uses its own first frame. Eviction rebinds a still-referencing sprite to the corresponding identity before destroying its texture. Concealed future contracts are never prefetched.

| Current encounter texture set | Decoded RGBA by PNG dimensions |
| --- | ---: |
| All 65 full current atlases without caching | 327.25 MiB |
| Eight shared atlases plus 64 static identities | 72.40625 MiB |
| Two largest full dynamic atlases | 21.25 MiB |
| Maximum retained-cache subtotal | 93.65625 MiB |

The current set is 71.3808% below its unbounded full-atlas subtotal. This new artwork raises the v1 cache estimate; it is not presented as a reduction from that earlier 77.06 MiB stage. Constable/Warden, survivors, arena materials, browser/CPU caches, staging, mipmaps and driver allocation are outside this subtotal. Physical-device/FPS acceptance remains open. Exact arithmetic and every crop are in the v2 loading manifest and `tools/verify-boss-loading-v2.py`.

`tools/verify-opening-defeats.py` independently reconstructs every delivered RGBA pixel, every original live action cell and every old world transform. Complete native pixels are assigned once; no connected body is split, no alpha is erased, and no pose is rigged or mirrored. Tollkeeper's overlapping envelopes use an intact connected-figure ownership mask. Both Ambulance attempts remain preserved, with the rejected layout recorded explicitly. Assistant native/composite/contact-sheet review is separate from rendered acceptance; rigid coach and equipment transitions still need in-engine/human review.

Five new regressions plus the eight existing cache tests pass: actual normal/Brutal kills for all seven bosses, one-time banked rewards, world-clock completion with combat paused, no early defeat, reduced motion, stale cues, fresh encounters, correct fallbacks and safe texture eviction. The complete pipeline has 336 tests plus authored-content/fifteen-locale checks, TypeScript and the production build. No new browser-rendered or physical-device acceptance is claimed.

The count audit separates 1,442 selected production-path animation frames from eight retained Constable proof-atlas frames: 1,450 selected frames across 243 atlases. Earlier 1,386 counts referred to production paths and excluded that legacy proof atlas. Static identity references and archived superseded atlases are excluded. The seven survivors retain their 820 selected poses. [Backlog](IMPLEMENTATION_BACKLOG.md) · [Wiki reference](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Art-Gallery#opening-route-defeats).
