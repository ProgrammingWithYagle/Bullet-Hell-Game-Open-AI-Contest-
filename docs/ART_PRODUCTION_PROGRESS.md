# Grave Accord production art — 2026-10-23

This batch supplies five survivor turnarounds and three new individual boss pose studies: **20 directional views and nine boss poses**. They are accepted assistant-reviewed static references. They do not add playable classes, boss encounters or completed animations. Soldier/Medic and Hollow Constable remain the playable subset.

The user explicitly prioritized art/concepts while the browser gate remains open. This is authorized production work, with no claim that performance, device or human gates passed. No further browser-permission investigation was performed after that direction.

## Selected survivor references

Each sheet contains south, east, north and west in a two-by-two layout. South is a front-oriented three-quarter view, not a mathematical orthographic projection. Native cells and foot baselines require deterministic normalization before animation/runtime use.

| Class | Selected native | Identity and attachment lock |
| --- | --- | --- |
| Heavy / Hux | [Four views](../assets/production/survivors/heavy/four-view-v2.png) | Ochre coat, dark beard, broad human build, one belt-fed gun and feed belt. Keep grip, receiver and feed side consistent through motion. |
| Tank / Bram | [Four views](../assets/production/survivors/tank/four-view-v2.png) | Rust coat, iron faceguard; shield on actor's left forearm, riot shotgun in actor's right hand. Show the shield back in north view. |
| Mage / Sable | [Four views](../assets/production/survivors/mage/four-view-v2.png) | Indigo robe/scarf, brass harmonic dial staff in actor's left hand, closed book on right hip. The initial request's opposite-hand phrase was corrected against the original identity reference. |
| Engineer / Tamsin | [Four views](../assets/production/survivors/engineer/four-view-v2.png) | Copper hair, goggles on head, teal work clothes, one broad rear satchel, rivet pistol in right hand. |
| Assassin / Vale | [Four views](../assets/production/survivors/assassin/four-view-v2.png) | Dark hair, burgundy scarf, charcoal clothes and one two-handed needle launcher. Scarf stays attached and inside frame bounds. |

The corrected finish uses broad quiet fabric planes and concentrates detail on faces, hands and equipment. No new generation model or quality setting was reported by the built-in tool; the requested model preference is not verified backend evidence.

## New individual boss studies

Each sheet contains neutral, east profile and attack anticipation. These are three deliberately different poses, not a three-frame animation. Existing numerical mechanics and Brutal definitions remain authoritative in content/bosses.json.

| Boss | Selected native | Readable signature | Motion production contract |
| --- | --- | --- | --- |
| Lantern Warden | [Three poses](../assets/production/bosses/lantern-warden/pose-study-v2.png) | Tall triangular teal/bone silhouette and one caged brass lantern in the left hand. | Anticipation raises the lantern before the authored 55-degree rotating cone. The ground boundary and trailing safe wedge must be separate runtime geometry; no sparks/beam are baked into art. Preserve the 1.2-second tell and the existing active/rest timings. |
| Ratcatcher | [Three poses](../assets/production/bosses/ratcatcher/pose-study-v3.png) | Hunched olive silhouette with a large bone-canvas sack on the left and one right-hand crook. | Left hand releases the sack drawcord while the one upright crook braces the body. The sack must remain a clearly outlined breakable weak point before three rat packs follow visible lanes. Release, minions and scent trails are separate unfinished assets/behaviors. |
| Quarantine Clerk | [Three poses](../assets/production/bosses/quarantine-clerk/pose-study-v2.png) | Thin charcoal silhouette, broad closed ledger in left arm and one red stamp in right hand. | Overhead stamp anticipation precedes the authored three-zone sequence. Numbers/outlines, the erased first safe zone and impact effects stay separate and localized at runtime; ledger/stamp artwork contains no functional text. |

Lantern Warden shares the cordon's civic uniform language with Constable, while the triangular coat, body proportion, lantern and raised pose supply its identity. These still need comparison in moving gameplay. Ratcatcher's second sheet introduced a duplicate crook; it was preserved and rejected. The selected third sheet corrects the attachment. A recolor or pose study does not count as another completed boss.

## Review and provenance

- [Exact 17 tool requests, references, originals and decisions](art-production-2026-10-23.json).
- [Native hashes, RGBA/alpha and cell-bound checks](../reviews/art-production-2026-10-23/inventory.json). All seventeen returned natives are preserved in the project, including nine superseded versions. Workspace copies match their generated originals.
- [Survivors at 56 pixels and 2x](../reviews/art-production-2026-10-23/survivors-quiet-proof.png), [illustrative hazard overlay](../reviews/art-production-2026-10-23/survivors-hazard-proof.png).
- [Bosses at 150 pixels and 2x](../reviews/art-production-2026-10-23/bosses-quiet-proof.png), [illustrative hazard overlay](../reviews/art-production-2026-10-23/bosses-hazard-proof.png).

The proof tool crops/resamples/composites review derivatives only. It does not repaint or alter source art, remove backgrounds or manufacture animation. A common scale per identity maps its tallest view, including equipment, to the stated height. Alpha-threshold bounds verify selected cells have transparent clearance. Intended generator spacing was not exact; these sheets are not ready atlases. The synthetic hazard overlay is a static readability aid, not actual game entities, hitboxes, 4,000-hostile evidence or a rendered match.

Assistant inspection found distinct class color/silhouette/equipment at 56 pixels; faces and small mechanical details are primarily visible at 2x. Boss identity props and anticipation read at 150 pixels. Animation stability, pivots, hitbox alignment, VFX occlusion, actual gameplay/phone viewing and human aesthetic approval remain open.

## Next production work

Normalize the selected references to the existing 256-pixel survivor and 512-pixel boss cell contracts. Preserve native proportions and common scale/anchors; do not stretch individual views to equal height. Then produce/review actual idle, run, attack, hurt, dash and downed motion for survivors, and idle, attack, hurt and defeat motion for bosses. The existing baseline contracts require 120 frames per survivor across four facings and 23 per boss before additional phase/signature states. This reference batch closes none of those full animation contracts.

Continue the opening-route boss identities and their signature effects/minions/props, then other route pools and arena kits. Runtime remains marked In production until its gameplay, animation, localization and QA are implemented. Preserve authored content, static art, synthetic tests, assistant observations and human/device findings as separate evidence.
