# Production art preparation and first Warden motion study

**Current continuation:** [WARDEN_AND_HEAVY_RUNTIME.md](WARDEN_AND_HEAVY_RUNTIME.md) integrates the actual Warden encounter and playable Heavy, protocol 5, 59 drawn motion frames, exact-value binary projectile batches and 108 passing tests. Earlier rehearsal-only/two-class statements below are dated history. The public deployment remains protocol 4. Final rendered/device/human review remains open.

**Successor checkpoint:** [WARDEN_SIGNATURE_REHEARSAL.md](WARDEN_SIGNATURE_REHEARSAL.md) adds idle/channel motion, attachment measurements and a separate local signature exercise. The attack study and historical browser evidence below remain preserved with their original limits.

2026-10-23 continuation in the existing local workspace and `feat/first-playable-loop`. Soldier/Medic and Hollow Constable remain the playable subset. This checkpoint adds prepared assets, five visible setup portraits, and a local art-review tool.

## Prepared references and portraits

All eight selected identities from [the previous reference batch](ART_PRODUCTION_PROGRESS.md) now have normalized RGBA atlases: twenty survivor directions in 256-pixel cells and nine boss poses in 512-pixel cells. Each identity uses one uniform scale, preserving differences in pose and equipment height. Static foot anchors use the alpha-weighted center of the lowest ten percent and the bottom contact, rounded to source pixels; their crosshairs and source/target coordinates are exposed in the receipt. This is an initial static alignment measurement, not an animation rig or anatomy certification.

Five south-facing survivor portraits are isolated from the native reference sheets and integrated into the class selector: Heavy, Tank, Mage, Engineer and Assassin. Their retained RGBA pixels match the source crops exactly. Each crop uses alpha-16 bounds with twelve source pixels of clearance; faint alpha outside that geometric crop is excluded, without erasing alpha or repainting retained pixels. The previous lineup was a crowded fallback for these portraits. All five classes retain **In production** and a disabled Next button. This does not implement their weapons, skills or combat animations.

- [Reference library and all source/atlas/portrait hashes](../assets/production/normalized/library.json).
- [Normalization measurements](../reviews/art-normalization-2026-10-23/normalization.json).
- [Complete contact sheet with foot crosshairs](../reviews/art-normalization-2026-10-23/normalized-contact-sheet.png).
- [Desktop class selector](../reviews/art-normalization-2026-10-23/class-heavy-desktop.jpg), [phone viewport example](../reviews/art-normalization-2026-10-23/class-assassin-phone.jpg).

## Lantern Warden motion study

The built-in image generator drew two eight-frame attack sheets. Both exact requests, returned originals, project copies, hashes and decisions are preserved in [the motion provenance](production-motion-2026-10-23.json). Backend model/quality controls were not reported. The first attempt is superseded because its translucent lantern haze, spacing and follow-through arm failed the desired finish/attachment constraints. The second has cleaner alpha and a readable physical-left lantern raise, hold and recovery.

The second sheet's generated spacing is not a perfect equal grid. Eight explicit extraction rectangles follow empty gutters and reconstruct **every native RGBA pixel exactly**. One shared scale, measured planted-foot translations and transparent padding pack a four-by-two, 512-pixel-cell atlas. No code-generated poses, mirrored limbs, painted corrections, alpha removal or independent per-frame scale fits are used. Native pose proportions still vary slightly; the atlas is accepted as an assistant-reviewed **motion study**, with final in-engine animation review open.

The local preview durations are 160/260/320/460/120/160/200/180 milliseconds. Frames one through four therefore provide 1.2 seconds before the release pose. This preserves the authored tell as an art timing study. It does not execute the rotating cone, safe wedge or active/rest mechanics. A fixed packed origin alone does not prove animation quality.

- [Eight-frame atlas](../assets/production/motion/lantern-warden-attack-v2-atlas.png).
- [Animated preview](../assets/production/motion/lantern-warden-attack-v2-preview.gif), [all eight frames at 1x/2x](../reviews/art-normalization-2026-10-23/warden-attack-contact-sheet.png).
- [Packing, alpha and timing receipt](../reviews/art-normalization-2026-10-23/warden-attack-packing.json).

## Local browser art room

With `pnpm dev` running, open [the art room](http://127.0.0.1:5173/tools/art-review.html#lantern-warden-attack). It offers identity/family selection, explicit static pose selection, play/pause, frame stepping, speed controls, paper/dark/checker grounds, feet anchors, previous-frame overlay, illustrative hazards and direct native/atlas provenance. Static references cannot play as animation. Playback starts paused and honors elapsed time when browser rendering is throttled; this tool does not measure FPS. The page lives under tools and is not a production build entry.

Saved [assistant browser observations](../reviews/art-normalization-2026-10-23/browser-review.json) cover all eight reference controls, the Warden motion study, five portrait bindings with disabled progression at desktop and 390x844 emulation, and a measured 1280x900 desktop layout. Illustrative hazards are explicitly synthetic shapes, not game entities or collision evidence. The 390x844 screenshot was captured at a reported 375-pixel full-page width; a later settled DOM observation measured 390-pixel inner/page width. Keep these capture limitations with the evidence. One early desktop override affected the art tab rather than the separate game tab; only the subsequent measured 1280x900 class screenshot establishes desktop evidence.

Local browser discovery initially worked, but opening the restricted dev server timed out. Restarting Vite with the normal reviewed local-network allowance allowed actual menu/art interaction. Later, at 6:55 p.m. Eastern on October 23 (22:55 UTC), control again returned **Local browser use is disabled in Work settings** while continuing setup. The cause is unconfirmed. The saved screenshots and earlier observations remain valid; the new offline-match smoke test was not completed. Do not claim a new foreground performance, physical phone/controller, full locale or human review from these checks. The 1280x900 override was active on that tab at interruption and could not be cleared through disabled browser control; it is a temporary viewport setting, not a user preference change.

## Verification and continuation

`python -X utf8 tools/verify-production-art.py` validates the current library/hashes, every packed frame's alpha clearance, all five pixel-exact portrait crops, conservation of the complete motion native, one shared motion scale, the 1.2-second anticipation, and the unchanged seventeen previous generated natives. [The audit](../reviews/art-normalization-2026-10-23/verification.json) is structural evidence, separate from visual observations.

`node tools/verify.mjs` passed all 74 rule/network/HTTP/SQL tests, strict TypeScript, content/fifteen-locale checks and the production build after portrait integration. The usual large JavaScript chunk warning remains. Runtime source/build hashes are in [runtime verification](../reviews/runtime-verification.json). The local art page is separately typechecked; it is not published by the game build.

Continue with the remaining action animations, measured attachments and Phaser encounter review; build Warden's separate signature geometry and full states before enabling the boss. Other opening-route identities, arena art and the full class/action library remain unfinished. First-loop foreground/hosting/recovery, physical-device/human/native-language, Windows and final-release gates remain open. Existing public Site/service identities and deployments are unchanged by this local/source checkpoint.

Source/art checkpoint 9dfc571 is pushed to the existing draft PR 14 and its GitHub Verify run passed. Wiki commit ed88617 matches all fifteen canonical pages at that checkpoint, with public home/getting-started HTTP checks. [Publication evidence](../reviews/art-normalization-2026-10-23/github-checkpoint.json) and [Wiki verification](../reviews/wiki-runtime-publication.json) record exact identities. The later evidence-only commit does not change runtime source or generated art.
