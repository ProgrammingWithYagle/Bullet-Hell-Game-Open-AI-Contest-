# Public polish

The current goal is to make existing Grave Accord content approachable, legible and enjoyable for people playing for the first time. This document records the review requirements; implementation counts remain in the single [development ledger](development-work-ledger.json), synchronized with [Development progress](DEVELOPMENT_PROGRESS.md).

## First Watch presentation pass

Implemented in `2026.10.28-first-watch`, protocol 38:

- Home introduces the encounter loop and offers **Start gently**. That prepares Soldier, Quarantine Run, Gatehouse, Baby and Solo, then asks the player to confirm. **New run** retains the complete setup. The four-page controls guide opens manually.
- Map previews show actual selected-difficulty bounds, cover and lava, painted thumbnails, two distinct spawn markers and a translated legend. Copy explains that the selected arena opens the run and later arenas follow the route.
- Difficulty cards describe the experience. The selected card exposes actual revive, cover, shield and forced-form rules alongside the numerical multipliers. Baby is suggested for learning; earned difficulty unlocks stay in force.
- **Local Practice records** is visible on Home and labeled as stored on this device. Online rankings remain unavailable.
- Keyboard focus follows selection and setup navigation; names survive backtracking and room codes accept Enter.
- The manual controls guide shows saved fire/reload/ability bindings and labels controller button indices. Its combat introduction defers revive rules to the selected difficulty, and the card scrolls within short viewports.
- Artwork loading shows real loader progress. Asset failure returns to the menu with a specific connection/retry message.
- Existing violet catalytic reactions show an angular warning, a local shock ring and a starburst. Their original damage, radius and lifetime remain. Reduced motion retains a static shape and danger boundary.

New interface text is authored in all fifteen supported locales. Native-language review remains pending. Existing settings, profiles, remapped inputs, public random boss progression, optional Baby-only boss guide and Solo guide pause remain.

## Evidence requirements

Use `reviews/public-polish-2026-10-28/` for checkpoint evidence, with raw working logs under `output/public-polish-2026-10-28/`. Tests must cover actual difficulty geometry, complete language keys, the compiled public setup and its confirmation/profile/name/focus behavior, reduced-motion drawing and the existing compiled-worker/room audience boundaries. TypeScript, authored content/RGBA, full rules/network tests, production builds and emitted atlas checks are required for checkpoint closure.

Static map SVG rasters and recorded Graphics samples inspect component geometry and color. They do not verify browser CSS layout, Phaser playback, audio, real playability, physical-device performance or human acceptance. Browser control is disabled in Work settings and must not be retried or bypassed.

The First Watch local gate passes **755 tests / 755 pass / 0 fail**, authored content/fifteen locales and RGBA, TypeScript, the production testing build and 71 emitted atlas contracts. The complete log is `reviews/public-polish-2026-10-28/host-full-gate-02.log`; its own runtime report is `host-gate-02/runtime-verification.json`. Runtime source SHA-256 is `c0b09facc8596a7d4c9e50fb80d8a5fc37814ec14c3f9547bc27fd43b8a2dff5`; local source snapshot is `5fd8bfa66d8fe6af5eb825a904519c9f7b56c34ebc06c8225b96bedd64006565`. A sandbox attempt failed because loopback returned EACCES. One host attempt stopped on a transient OneDrive report-open error; the next complete gate passed. Its cleanup wrapper then failed on redundant report restoration, which was completed separately with all eight issued receipts verified byte-for-byte. Failure, success and correction remain distinct evidence.

Before sharing a review URL, verify the actual listener, client root/hash, source/build/protocol/content/audience, matching backend health and CORS. Create new review roots/ports; preserve all earlier frozen owners and issued manifests. Check both emitted public menu and Solo worker boundaries. Publish changed canonical Wiki pages exactly from the source commit and verify all page/image/public-image hashes.

## Continuing review

The broader polish goal remains active. Review the complete first-visit path, setup, lobby/shop comprehension, controls, loading/errors/reconnect, combat/HUD readability, phase audiovisual cues and run results/records. Check desktop and compact layouts, enlarged text, RTL scripts and reduced motion with real rendered evidence when available. Existing phase transitions already have health separators, a four-second entry banner and a distinct sound with music ducking; start by reviewing that behavior.

Prepare coherent matching public client/backend and Windows review artifacts before a publication decision. The old hosted protocol-4 Site and immutable protocol-13 Windows development release remain older artifacts. Trusted public rankings/recovery, WAN/endurance/capacity and human/listening/native-language/device release acceptance remain open.

No new bosses, General skills, class paths, weapons, maps or modes are authorized by this polish goal. Double Dash/Sprint and the old expansion backlog remain deferred. Do not merge main, provision paid hosting, replace a Site, deploy a mismatched backend or submit to the contest.

## First Watch follow-up

Build2026.10.28-first-watch-2 addresses human5214 feedback: the complete1672x941cover uses its natural ratio, the introduction is named Tutorial, and the home headline describes actual gameplay. Existing gear tiles display names/prices/equipped status, with clearer currencies and an explanatory sentence. The tutorial uses readable dark captions on parchment. Controls, purchases, progression and combat rules remain. This source requires its own full/CI/public/Wiki evidence; predecessor755 results retain sourcee6f3587. Human/native-language/rendered/device acceptance remains open.

Reading the Tutorial keeps the gentle first-run preset available until the profile has a local run record.

The follow-up passes its own full local gate with 756 tests, content/locales, TypeScript, production build and 71 atlas contracts. `reviews/public-polish-followup-2026-10-28/gate-03/` and `full-gate-03.log` bind the current source; all eight issued receipts are preserved. Its source CI and fresh public preview/Wiki evidence remain separate follow-up checks.

Source `cebaae2620d04434f5ed2da28e9c84f02e9f5c57` now has both 756-test source CI logs, a fresh frozen public 5215/2589 pair with 13 HTTP and real two-peer checks, and exact Wiki publication `6e647e0c6c605dfdfbf9eeeecbf28a9c2089bc0c`. These records live in the follow-up review directory. Earlier 5214 and all older frozen artifacts are preserved. This closes the source checkpoint; the broad polish goal and human/rendered/device review remain open.

## Clear Choices follow-up

User5215 reports the full artwork, shop and direct headline clearer. The next source uses New here?, familiar menu icons, five actual fight-count/duration diagrams, plain mode descriptions, six difficulty symbols, and testing-only development details. Public and testing share the improvements. Seven focused checks and TypeScript pass; complete local/CI/fresh paired previews/Wiki evidence belongs under reviews/clear-choices-2026-10-28/. No content or authority expansion.

Clear Choices source `18b602ae3e87094d0811c8187eaa586d470d5d5a` passes758local and both exact-source CI tests,14HTTP samples and real two-peer combat for both new testing5216/2590 and public5217/2591 pairs, and exact Wiki publication `29ca9f98befdf859d33def6470d8ef159a2c64b7`. The prior global Wiki receipt and all eight gate receipts are preserved. Current manifests/CI logs/live checks/publication evidence live in the Clear Choices review directory. All older frozen roots/services remain preserved.

## Run Recap follow-up

The working run-recap presentation separates actual results and defeat reasons, keeps banked personal results scoped, shows zero XP for modified testing runs, removes untimed countdowns and names the existing HUD/touch abilities. TypeScript and ten focused checks pass. Complete local/source-CI/fresh audience previews and Wiki evidence belong under reviews/run-results-2026-10-28/. Authority, rewards, saving, economy and all content remain.
