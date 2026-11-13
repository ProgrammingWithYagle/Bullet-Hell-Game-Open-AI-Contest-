# Lantern Warden signature rehearsal and additional motion

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

**Current continuation:** [WARDEN_AND_HEAVY_RUNTIME.md](WARDEN_AND_HEAVY_RUNTIME.md) integrates the actual Warden encounter and playable Heavy, protocol 5, 59 drawn motion frames, exact-value binary projectile batches and 108 passing tests. Earlier rehearsal-only/two-class statements below are dated history. The public deployment remains protocol 4. Final rendered/device/human review remains open.

2026-10-23 continuation in the same local project and `feat/first-playable-loop`, starting from clean source `7d308ac`. Local files, the latest art checkpoint and GitHub draft PR 14 were checked before changes. The baseline passed 74 tests, content checks, strict TypeScript and the production build. This checkpoint advances S2-08 and the Warden signature foundation; those acceptance rows remain open.

## New art and preserved inputs

Two new native sheets add four idle frames and four raised-lantern channel frames. Together with the existing eight attack frames, the Warden now has sixteen drawn motion frames in three clips. All remain south-east studies. The physical-left lantern, cap, coat, boots and planted feet were checked in both natives and in the 150/300-world-pixel contact sheet. Small generated shape variation remains, and final Phaser motion approval is pending.

The built-in image tool generated each whole sheet from a transparent canvas containing the existing attack seed. Its interface exposed prompt, reference and transparency controls; no specific backend model or quality setting was reported. Exact requests, portable reference bindings, preserved originals and SHA-256 values are in [the provenance](warden-motion-2026-10-23.json). Seed frames and reference canvases are retained inside the project. No individual frames were generated separately, painted, mirrored or recolored.

The complete 1254×1254 RGBA natives are divided into conservative 2×2 cells. Every native pixel can be reconstructed from those rectangles. A single scale per clip calibrates the median cap-to-ground extent to the existing attack's 344-pixel body extent; every clip uses the same display-cell size and foot pivot. Per-frame planted-foot translations correct sheet placement without independent scaling. Faint source alpha is retained. Measured lantern cage centers are transformed with the same scale and translation; they are visual sockets, not an anatomical rig.

- [Contact sheet](../reviews/warden-signature-2026-10-23/action-contact-sheet.png), [idle preview](../assets/production/motion/lantern-warden-idle-v1-preview.gif), [channel preview](../assets/production/motion/lantern-warden-channel-v1-preview.gif).
- [Packing measurements](../reviews/warden-signature-2026-10-23/packing.json) and [runtime art/attachment contract](../assets/production/motion/warden-rehearsal.json).
- [Independent art verification](../reviews/warden-signature-2026-10-23/art-verification.json) conserves the new source pixels and confirms nineteen older natives are unchanged.

## Local Phaser room

With the existing `pnpm dev` server running, open [the Warden rehearsal](http://127.0.0.1:5173/tools/warden-rehearsal.html). It starts paused. WASD/arrows or held direction buttons move a Soldier proxy; Space pauses, R resets, and a button advances one 30 Hz tick. Window blur, hidden pages and frame interruptions over 250 ms pause explicitly rather than stretching the warning or silently advancing combat. High contrast, reduced idle motion and attachment inspection controls are included.

The shared signature module reads these values from the authored catalog:

| State or shape | Value |
| --- | --- |
| Warning | 36 harmless ticks / 1.2 seconds |
| Active | 120 ticks / 4 seconds |
| Rest | 120 harmless ticks / 4 seconds |
| Cone | 55 degrees |
| Rotation | 24 degrees/second clockwise |

One sector sample drives both collision and Phaser drawing. The warning locks its aim; moving the proxy cannot redirect it before release. The next cycle retargets. The adjacent trailing wedge is explicitly marked. Collision includes the player's body radius, radial edges and outer arc; a body straddling the boundary can take damage even when its center is outside the hazard.

Range **420 world pixels**, the marked trailing wedge's **40-degree width**, **9 contact damage per 0.5 seconds**, and the ground socket **55 pixels right of the foot pivot** are explicit candidate tuning because those values were not supplied by the signature design. The moving painted lantern center is a separate visual attachment. It does not move collision or make the active cone wobble.

Animation comes from the simulation clock: the first four attack poses fill the warning, release appears at active start, the new raised-lantern clip holds throughout danger, and recovery/idle occur during rest. Reduced motion freezes the decorative idle/channel loops; it preserves the warning, active boundary, safe wedge and timing.

## Verification and limits

The full verification suite now has **83 tests**: the original 74 plus nine signature/presentation/rehearsal checks. The new checks exercise harmless boundaries, locked aim, clockwise rotation through angle wrap, safe interior geometry, circle/sector edge contacts, damage cadence, reset/defeat, movement normalization, attachment transforms and warning/channel/recovery timing. Strict TypeScript, authored content/fifteen-locale checks and the production build must pass before the checkpoint is pushed.

Run the focused art checks and separate local-tool build with:

```text
python -X utf8 tools/verify-production-art.py
python -X utf8 tools/verify-warden-rehearsal.py
node node_modules/vite/bin/vite.js build --config tools/warden-rehearsal.vite.ts
node tools/verify.mjs
```

The rehearsal build goes under ignored `tmp/warden-rehearsal-build`. The normal production entry remains unchanged and does not load this room. The art room lists the three Warden clips separately and links to the rehearsal. No other class or boss is unlocked. This is a local signature exercise, **not the complete Warden encounter**: fan/zone attacks, phase transitions, Accord/Brutal behavior, boss damage/defeat, rewards and network replication are unfinished. Hurt/defeat animation and other facings also remain open.

No browser-control troubleshooting was repeated in this continuation. Saved earlier screenshots retain their original dates and limits; no new browser or physical-device capture is claimed here. A successful local-tool build and HTTP asset checks establish packaging/serving, not rendered Phaser behavior or motion acceptance. Do not mark the sprite-pipeline in-engine gate passed until actual supported review occurs. Human, physical phone/controller, foreground performance and native-language gates remain separately open.

## Continue here

1. Review this room through legitimate supported browser access when available, checking attack-to-channel and recovery-to-idle transitions, lantern attachment, safe-wedge comprehension and small-screen controls. Regenerate inconsistent whole sheets if needed.
2. Add Warden hurt/defeat states and complete its separate fan/zone attacks, phase/Accord/Brutal behavior and shared/network state before any playable unlock.
3. Continue the full survivor action library and remaining boss/arena identities, while preserving the first-loop recovery/capacity/device/performance and final Windows/release gates.

Existing public Site/service identities and audience settings were not changed or redeployed by this source/art checkpoint. Current GitHub/CI and Wiki publication evidence is recorded separately under `reviews/warden-signature-2026-10-23/`; keep draft PR 14 open and preserve main.
