# Map artwork and the 36-layout review

The selected delivery replaces the generic cover blocks and lava discs with painted assets, and adds restrained surrounding architecture to the five maps that previously had plain surroundings. Gatehouse retains its established painting. Baby's extra cover uses the same painted asset system. The six difficulty rules and the authoritative collision rectangles remain unchanged.

## Saved artwork and final prompts

All seven images were produced with the built-in `image_gen.imagegen` tool. No fallback CLI or paid-provider workflow was used. Each original native and its complete final prompt are saved together under `assets/production/generated/arena-cover-2026-10-29/`:

| Native image | Complete final prompt |
| --- | --- |
| `cover-surfaces-v1.png` | `cover-surfaces-v1.request.json` |
| `lava-pit-v1.png` | `lava-pit-v1.request.json` |
| `triage-yard-surroundings-v1.png` | `triage-yard-surroundings-v1.request.json` |
| `ossuary-works-surroundings-v1.png` | `ossuary-works-surroundings-v1.request.json` |
| `sunken-chapel-surroundings-v1.png` | `sunken-chapel-surroundings-v1.request.json` |
| `bell-foundry-surroundings-v1.png` | `bell-foundry-surroundings-v1.request.json` |
| `crown-crypt-surroundings-v1.png` | `crown-crypt-surroundings-v1.request.json` |

The runtime uses `assets/production/arena-cover-surfaces/*-v2.png`, its `lava-pit-v1.png`, and `assets/production/arena-worlds/*-v1.png`. Their library manifests bind the source images, requests, crop/normalization tools and exact delivered pixels. Read-only verifiers reconstruct those pixels. The geometry input for the normalization tools is preserved at `output/room-lobby-2026-10-29/arena-pack-bounds.json` in this source commit.

Cover strips preserve their painted ends through three-slice placement. Surrounding architecture uses mirrored border pieces, leaving the original central floor visible. The five world paintings decode to 13,737,984 RGBA bytes in total. The inactive first cover crops and perimeter prototype remain preserved and are not preloaded by the current client.

## Selected review

`maps-06/contact-sheet.png` shows all six maps on Baby, Easy, Normal, Hard, Insane and Hellish. `maps-06/layouts.json` and `composition-proof.json` record the source geometry and hashes of all 36 full-size compositions. Those full-size PNGs are saved locally under `output/room-lobby-2026-10-29/map-compositions-06/`; the export and composition scripts are preserved alongside this review.

The selected sheet and full-size Baby/Hellish examples were inspected directly. This review checks coherent painted cover, readable floors, quiet surroundings and visible lava cues. Earlier `maps` through `maps-05` are retained iterations: plain surroundings, furniture-like borders, architectural seams, stretched architecture and repeated center-floor patterns were successively replaced. Only `maps-06` describes the selected source layout.

These are deterministic source-asset compositions, not browser screenshots. Automated checks cover every layout's cover placement, unchanged playable bounds, excluded central scenery tiles and loaded asset hashes. In-game camera/UI composition, player readability during combat, current human approval, sound/listening and physical-device acceptance remain open.
