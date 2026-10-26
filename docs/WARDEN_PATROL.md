
# Lantern Warden quality pass

Lantern Warden retains fixed **2--** and Normal health/damage/deadline. **Still Watch** holds its lantern in place; the half-health **Roving Vigil** marks a route and patrols before the next locked-origin sweep. Movement resolves the actual 58-pixel boss against map cover. Its 1.2-second sweep warning stays complete and its marked trailing space remains clear.

Brutal alternates sweep direction and repeats recovery fans in two warned locked-origin waves. The final phase adds a fully warned reverse return sweep after a brief pause; active cones never overlap. Persistent phase-response help and static direction/route arrows cover all fifteen locales. The original Last Light theme and tempo-aligned percussion remain.

![Four original Warden patrol poses, a sprite reference rather than gameplay capture](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/warden-patrol.jpg)

Four new poses preserve the exact native/request, whole lantern ownership and all source RGBA. Technical packing adjusts world scale to retain the established body height; earlier Warden artwork stays unchanged. [Actual authority, art and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/WARDEN_PATROL.md). Rendered/human/device/native-language/listening acceptance remains open.

## Exact behavior

The shared `WardenPatrol` state machine selects collision-resolved routes and one active signature clock. Routes are warned for 0.6 s, then move at 72 px/s up to 144 px; the body stays planted during all signature warning/active stages. Patrols occur at entry to the second visible phase and during recovery. A blocked lateral candidate can use the opposite direction or a clear vertical route. The lantern's deliberate 2.5D ground socket remains +55 px from the feet. Float accumulation is snapped only within 0.000001 px of a finished destination, keeping the legacy integer-position replica aligned during stationary firing.

The first phase keeps a stationary 36-tick warning, 120-tick active sweep and 120-tick rest. The cone remains 55 degrees wide, radius 420, rotates at 24 degrees/s and deals base 9 contact damage no more than every 0.5 s. Normal health factor 0.88 and 120 s deadline are unchanged. The second phase's patrol explicitly occurs before a new clock locks position/aim.

Brutal cycles alternate direction. Its final sequence is warning, sweep, 0.6-second return cue, a fresh 1.2-second warning, reverse sweep, recovery. The reverse starts at the first sweep's end angle; it does not retarget the survivor mid-warning. No active cone overlap can contradict the marked trailing space. Existing auxiliary fan/zone rules remain limited to recovery after patrol finishes. Fan projectile repeats use the global bounded warned echo queue, with 4,000-hostile cap. At every sweep release, auxiliary projectiles, fields, warnings and queued echoes clear.

The retained original Last Light score is individual Warden music at 72 BPM in 3/4; the existing phase/Brutal percussion layer follows that tempo. No listening acceptance is claimed. Both phases have localized names and persistent behavior hints in fifteen locales, with direction arrows remaining under reduced motion.

## Native and technical evidence

Built-in ImageGen produced one transparent 1254×1254 native at `assets/production/generated/warden-patrol-2026-10-25/warden-patrol-v1.png`; its exact prompt is the adjacent request JSON. The first equal-cell packing assumption crossed the third pose's lantern and is preserved as a failed packing attempt. The selected ownership rectangles use a 700-pixel lower-row split; every native pixel is assigned once. No artwork alpha is thresholded or stripped. An alpha-16 measurement identifies the body only for scale/foot calibration.

The four poses use one scale into 512-pixel cells. A 256-pixel median body with display cell 300 matches the original 344-pixel body at its earlier display scale: both render at 150 world pixels. The independent verifier reconstructs full source RGBA, boot anchors, scaling, atlas pixels, references, both libraries and all 15 preserved Warden source/contract hashes. Run `python -X utf8 tools/verify-warden-patrol.py`. All previous Warden art contracts/atlases remain intact; the new clip has its own contract. These four always-loaded cells add 4 MiB decoded RGBA beyond earlier loading estimates, separate from GPU/device/FPS evidence.

## Continuity and verification

Protocol 19 migrates the known issued protocol-18 local revision `535eb34c...` without losing run identity, money, skills or profile receipts. Online/signed state remains strict. Baby/Easy Standard shield events, 100/50/25% Baby/Easy/Normal revival, Hard+ revival ban, Baby extra cover and Hellish lava/forced Brutal are retained.

New authority/geometry/art/UI tests and actual two-client fixtures cover all six maps and five cover rules, stable warning/active origins, full return warnings, clear trailing interiors, real repeated projectiles, reduced motion, cleanup, local migration and protocol rejection. The current full-suite and failed attempts are under `reviews/warden-patrol-2026-10-25/`. This is the second original-roster quality implementation pass; no boss identity is added. Rendered/human balance/device/native-language/listening and full release acceptance remain open.
